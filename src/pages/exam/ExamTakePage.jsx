import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AuthImage from "../../components/materials/AuthImage.jsx";
import { finishMyAttemptSection, myAttemptPagePath, saveMyAttemptAnswers, useMyExamAttempt, useRegradeMyAttempt } from "../../hooks/useExam.js";
import ExamResultView from "../../components/exam/ExamResultView.jsx";
import { groupLabel, hanCount, isEssay } from "../../lib/examAnswers.js";
import { useBlockInspect } from "../../hooks/useBlockInspect.js";

/**
 * Luyện thi HSK 3.0 — màn làm bài. Đề (ảnh từng trang) bên trái, phiếu trả lời
 * bên phải; điện thoại thì chuyển qua lại bằng hai tab. Nộp xong (hoặc mở lại
 * bài đã nộp) thì cùng chỗ đó hiện kết quả chấm.
 *
 * Giờ do MÁY CHỦ giữ: trang chỉ đếm ngược theo `sectionEndsAt` (đã bù lệch
 * đồng hồ) và hỏi lại máy chủ khi hết giờ — máy chủ quyết định sang phần nào,
 * nộp lúc nào. Đáp án lưu tự động (gom 0,8 giây một lần), lỗi mạng thì giữ lại
 * và thử lại.
 */
const API_URL = import.meta.env.VITE_API_URL;

export default function ExamTakePage() {
  const { levelSlug, attemptId } = useParams();
  const { data, isLoading, isError, error, refetch } = useMyExamAttempt(attemptId);
  const backTo = `/luyen-thi/${levelSlug}?muc=luyen-de`;

  if (isLoading) return <p className="p-6 text-sm text-gray-400">Đang tải bài làm...</p>;
  if (isError || !data)
    return (
      <div className="max-w-md mx-auto mt-16 bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <p className="text-gray-700">{error?.message || "Không tải được bài làm."}</p>
        <Link to={backTo} className="inline-block mt-3 text-sm text-primary-dark underline">
          Quay lại danh sách đề
        </Link>
      </div>
    );
  return <Workspace key={data._id} data={data} refetch={refetch} backTo={backTo} />;
}

const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const editableOf = (sectionId) => (sectionId === "review" ? "listening" : sectionId);
const SECTION_HINT = {
  listening: "Nghe và chọn đáp án",
  review: "Không có tiếng. Kiểm tra và sửa lại đáp án phần nghe.",
  reading: "Đọc đề bên trái và chọn đáp án.",
  writing: "Viết câu trả lời. Bàn phím cần bật bộ gõ tiếng Trung.",
};

function Workspace({ data, refetch, backTo }) {
  const id = data._id;
  const inProgress = data.status === "in_progress";
  useBlockInspect(inProgress);

  const [answers, setAnswers] = useState(() => ({ ...data.answers }));
  const [saveState, setSaveState] = useState("saved"); // saved | pending | saving | error
  const [now, setNow] = useState(() => Date.now());
  const [tab, setTab] = useState("sheet");
  const [confirming, setConfirming] = useState(false);
  const [finishing, setFinishing] = useState(false);
  // Trang đề cần cuộn tới: lúc vào bài / sang phần mới -> trang của nhóm câu đầu phần đó.
  const firstPageOf = (d) => d.groups.find((g) => g.section === editableOf(d.section) && g.page > 0)?.page || 0;
  const [jump, setJump] = useState(() => ({ n: firstPageOf(data), seq: 0 }));
  const [jumpSection, setJumpSection] = useState(data.section);
  if (jumpSection !== data.section) {
    // Đổi phần: cập nhật ngay trong lúc render (cách React khuyên thay cho effect).
    setJumpSection(data.section);
    setJump((j) => ({ n: firstPageOf(data), seq: j.seq + 1 }));
  }
  const showPage = (n) => {
    setJump((j) => ({ n, seq: j.seq + 1 }));
    setTab("paper");
  };

  const pendingRef = useRef({});
  const timerRef = useRef(null);
  const dataRef = useRef(data);
  const refetchRef = useRef(refetch);
  const flushRef = useRef(null);
  const firedRef = useRef({ key: -1, at: 0 });

  useEffect(() => {
    dataRef.current = data;
    refetchRef.current = refetch;
  }, [data, refetch]);

  // Gửi các câu chưa lưu. Lỗi mạng -> giữ lại, 4 giây sau thử lại.
  const flush = useCallback(
    async ({ keepalive = false } = {}) => {
      clearTimeout(timerRef.current);
      const batch = pendingRef.current;
      if (Object.keys(batch).length === 0) return true;
      pendingRef.current = {};
      setSaveState("saving");
      try {
        const res = await saveMyAttemptAnswers(id, batch, { keepalive });
        setSaveState(Object.keys(pendingRef.current).length ? "pending" : "saved");
        const d = dataRef.current;
        if (res && (res.status !== d.status || res.section !== d.section)) refetchRef.current();
        return true;
      } catch {
        pendingRef.current = { ...batch, ...pendingRef.current };
        setSaveState("error");
        timerRef.current = setTimeout(() => flushRef.current?.(), 4000);
        return false;
      }
    },
    [id],
  );
  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const setAnswer = (no, value) => {
    setAnswers((a) => ({ ...a, [no]: value }));
    pendingRef.current = { ...pendingRef.current, [no]: value };
    setSaveState("pending");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flushRef.current?.(), 800);
  };

  // Đồng hồ: hết giờ phần đang làm -> lưu nốt rồi hỏi máy chủ phần tiếp theo.
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      const d = dataRef.current;
      if (d.status !== "in_progress") return;
      const left = new Date(d.sectionEndsAt).getTime() - (Date.now() + d.skew);
      const fired = firedRef.current;
      if (left <= 0 && (fired.key !== d.sectionIndex || Date.now() - fired.at > 3000)) {
        firedRef.current = { key: d.sectionIndex, at: Date.now() };
        Promise.resolve(flushRef.current?.()).finally(() => refetchRef.current());
      }
    }, 500);
    return () => clearInterval(t);
  }, []);

  // Rời trang / ẩn tab: lưu nốt; đang thi thì trình duyệt hỏi lại trước khi đóng.
  useEffect(() => {
    if (!inProgress) return undefined;
    const onUnload = (e) => {
      if (Object.keys(pendingRef.current).length) flushRef.current?.({ keepalive: true });
      e.preventDefault();
      e.returnValue = "";
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flushRef.current?.({ keepalive: true });
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [inProgress]);

  const finishSection = async () => {
    setFinishing(true);
    await flush();
    try {
      await finishMyAttemptSection(id, data.section);
    } catch {
      // máy chủ quyết định; hỏi lại trạng thái bên dưới
    }
    await refetch();
    setFinishing(false);
    setConfirming(false);
    setTab("sheet");
  };

  if (!inProgress) return <Result data={data} backTo={backTo} />;

  const section = data.section;
  const editable = editableOf(section);
  const left = new Date(data.sectionEndsAt).getTime() - (now + data.skew);
  const groups = data.groups.filter((g) => g.section === editable);
  const answeredIn = (s) => {
    let done = 0;
    let total = 0;
    for (const g of data.groups)
      if (g.section === s)
        for (let n = g.from; n <= g.to; n++) {
          total++;
          if (String(answers[n] ?? "").trim()) done++;
        }
    return { done, total };
  };
  const here = answeredIn(editable);
  const isLast = data.sectionIndex === data.sections.length - 1;

  return (
    <div className="h-[100dvh] flex flex-col bg-orange-50/40">
      <header className="shrink-0 bg-white border-b border-orange-200 px-3 sm:px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-heading font-semibold text-gray-900 truncate">{data.title}</p>
          <p className="text-xs text-gray-500 truncate">
            {data.candidate.name} · {data.level.name}
          </p>
        </div>
        <ol className="hidden md:flex items-center gap-1 text-xs">
          {data.sections.map((s, i) => (
            <li
              key={s.id}
              className={
                "px-2.5 py-1 rounded-full " +
                (i === data.sectionIndex ? "bg-primary text-gray-900 font-semibold" : i < data.sectionIndex ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-400")
              }
            >
              {i < data.sectionIndex && "✓ "}
              {s.id === "review" ? "Xem lại" : s.label}
            </li>
          ))}
        </ol>
        <div className="text-right">
          <p className="text-[11px] text-gray-500 leading-none">Còn lại</p>
          <p className={"text-xl font-mono font-semibold tabular-nums " + (left < 60000 ? "text-red-600 animate-pulse" : "text-gray-900")} aria-live="off">
            {mmss(left)}
          </p>
        </div>
        <SaveBadge state={saveState} />
        {data.canFinishEarly && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-medium px-4 py-2 rounded-full"
          >
            {isLast ? "Nộp bài" : "Nộp phần này"}
          </button>
        )}
      </header>

      {data.audio && <ListeningPlayer key={data.sectionStartedAt} audio={data.audio} startedAt={data.sectionStartedAt} skew={data.skew} now={now} />}

      <div className="lg:hidden shrink-0 grid grid-cols-2 bg-white border-b border-orange-100 text-sm" role="tablist">
        {[
          ["paper", "Đề thi"],
          ["sheet", `Phiếu trả lời (${here.done}/${here.total})`],
        ].map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={"py-2.5 font-medium border-b-2 " + (tab === v ? "border-primary-dark text-gray-900" : "border-transparent text-gray-500")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-2">
        <Paper attemptId={id} pages={data.pages} hidden={tab !== "paper"} jump={jump} />
        <section className={"min-h-0 overflow-y-auto px-3 sm:px-5 py-4 lg:border-l border-orange-100 " + (tab !== "sheet" ? "hidden lg:block" : "")}>
          <div className="max-w-2xl mx-auto">
            <h2 className="text-lg font-heading font-semibold text-gray-900">
              {data.sections[data.sectionIndex]?.label}
              <span className="ml-2 text-sm font-normal text-gray-500">
                {here.done}/{here.total} câu đã làm
              </span>
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 mb-4">{SECTION_HINT[section]}</p>
            <div className="space-y-6">
              {groups.map((g) => (
                <AnswerGroup key={g.from} group={g} answers={answers} keywords={data.keywords} onChange={setAnswer} onShowPage={showPage} />
              ))}
            </div>
            {data.canFinishEarly && (
              <div className="mt-8 mb-4 text-center">
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium px-6 py-2.5 rounded-full"
                >
                  {isLast ? "Nộp bài" : `Nộp phần ${data.sections[data.sectionIndex].label.toLowerCase()}, sang phần sau`}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => !finishing && setConfirming(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5" onClick={(e) => e.stopPropagation()}>
            <p className="font-heading font-semibold text-gray-900">{isLast ? "Nộp bài?" : `Nộp phần ${data.sections[data.sectionIndex].label.toLowerCase()}?`}</p>
            <p className="text-sm text-gray-600 mt-1">
              Bạn đã làm {here.done}/{here.total} câu. Còn {mmss(left)}.{" "}
              {isLast ? "Nộp rồi thì không sửa được nữa." : "Sang phần sau thì không quay lại sửa phần này được."}
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" disabled={finishing} onClick={() => setConfirming(false)} className="px-4 py-2 rounded-full border border-gray-300 text-sm">
                Làm tiếp
              </button>
              <button
                type="button"
                disabled={finishing}
                onClick={finishSection}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-medium disabled:opacity-60"
              >
                {finishing ? "Đang nộp..." : isLast ? "Nộp bài" : "Nộp phần này"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SaveBadge({ state }) {
  const view = {
    saved: ["✓ Đã lưu", "text-green-700"],
    pending: ["Đang lưu…", "text-gray-400"],
    saving: ["Đang lưu…", "text-gray-400"],
    error: ["Mất mạng — đang thử lưu lại", "text-red-600"],
  }[state];
  return <span className={"text-xs " + view[1]}>{view[0]}</span>;
}

/**
 * File nghe: phát MỘT LẦN, không có nút tua. Vị trí phát luôn theo đồng hồ
 * máy chủ — tải lại trang thì phát tiếp đúng chỗ đáng lẽ đang nghe (đoạn đã
 * lỡ thì lỡ, như thi thật). Trình duyệt chặn tự phát (vd. sau khi tải lại
 * trang) -> hiện nút bấm để nghe tiếp.
 */
function ListeningPlayer({ audio, startedAt, skew, now }) {
  const ref = useRef(null);
  const [src] = useState(() => `${API_URL}${audio.path}`); // vé mới mỗi lần hỏi lại — giữ nguyên vé đầu
  const [blocked, setBlocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [volume, setVolume] = useState(1);
  const start = new Date(startedAt).getTime();
  const elapsed = Math.min(audio.durationSec, Math.max(0, (now + skew - start) / 1000));

  const expectedRef = useRef(() => 0);
  useEffect(() => {
    expectedRef.current = () => (Date.now() + skew - start) / 1000;
  }, [skew, start]);

  useEffect(() => {
    const a = ref.current;
    if (!a) return undefined;
    const expected = () => expectedRef.current();
    const sync = () => {
      const e = expected();
      if (e < audio.durationSec && Math.abs(a.currentTime - e) > 2.5) a.currentTime = Math.max(0, e);
    };
    const tryPlay = () => {
      if (expected() >= audio.durationSec) return;
      sync();
      a.play().then(
        () => setBlocked(false),
        () => setBlocked(true),
      );
    };
    const onSeeking = () => {
      // Tua (bằng phím tắt media, công cụ…) -> kéo lại đúng chỗ đang phát.
      if (Math.abs(a.currentTime - expected()) > 1.5) a.currentTime = Math.max(0, expected());
    };
    const onPause = () => {
      if (!a.ended && expected() < audio.durationSec - 1) setBlocked(true);
    };
    const onPlaying = () => {
      setBlocked(false);
      setFailed(false);
    };
    const onError = () => setFailed(true);
    a.addEventListener("loadedmetadata", tryPlay);
    a.addEventListener("seeking", onSeeking);
    a.addEventListener("pause", onPause);
    a.addEventListener("playing", onPlaying);
    a.addEventListener("error", onError);
    if (a.readyState >= 1) tryPlay();
    const drift = setInterval(() => !a.paused && sync(), 5000);
    return () => {
      clearInterval(drift);
      a.removeEventListener("loadedmetadata", tryPlay);
      a.removeEventListener("seeking", onSeeking);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("playing", onPlaying);
      a.removeEventListener("error", onError);
      a.pause();
    };
  }, [audio.durationSec]);

  useEffect(() => {
    if (ref.current) ref.current.volume = volume;
  }, [volume]);

  const resume = () => {
    const a = ref.current;
    if (!a) return;
    if (failed) a.load();
    const e = expectedRef.current();
    if (e < audio.durationSec) a.currentTime = Math.max(0, e);
    a.play().then(
      () => setBlocked(false),
      () => setBlocked(true),
    );
  };

  return (
    <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-3 sm:px-4 py-2 flex flex-wrap items-center gap-3">
      <audio ref={ref} src={src} preload="auto" onContextMenu={(e) => e.preventDefault()} />
      <span className="text-sm font-medium text-amber-900">🎧 File nghe</span>
      <div className="flex-1 min-w-[120px] h-1.5 rounded-full bg-amber-100 overflow-hidden">
        <div className="h-full bg-amber-500" style={{ width: `${(elapsed / audio.durationSec) * 100}%` }} />
      </div>
      <span className="text-xs font-mono tabular-nums text-amber-900">
        {mmss(elapsed * 1000)} / {mmss(audio.durationSec * 1000)}
      </span>
      {blocked || failed ? (
        <button type="button" onClick={resume} className="text-sm font-medium px-3 py-1.5 rounded-full bg-amber-500 text-white animate-pulse">
          {failed ? "Không tải được — bấm để thử lại" : "▶ Bấm để nghe tiếp"}
        </button>
      ) : (
        <label className="flex items-center gap-1.5 text-xs text-amber-900">
          Âm lượng
          <input type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-20 accent-amber-500" />
        </label>
      )}
    </div>
  );
}

/**
 * Đề thi: ảnh từng trang, cuộn dọc. `jump` = { n, seq }: cuộn tới trang n
 * (seq đổi mỗi lần yêu cầu, kể cả khi cùng trang).
 */
function Paper({ attemptId, pages, hidden, jump }) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef(null);
  const appliedRef = useRef(-1);

  // Điện thoại: lúc sang phần mới tab Đề thi có thể đang ẩn -> đợi hiện ra mới cuộn.
  useEffect(() => {
    const el = scrollRef.current;
    if (!jump?.n || appliedRef.current === jump.seq || !el || el.offsetParent === null) return;
    appliedRef.current = jump.seq;
    el.querySelector(`[data-page="${jump.n}"]`)?.scrollIntoView({ block: "start" });
  }, [jump, hidden]);

  const goTo = (n) => scrollRef.current?.querySelector(`[data-page="${n}"]`)?.scrollIntoView({ block: "start" });

  return (
    <section ref={scrollRef} className={"min-h-0 overflow-auto bg-gray-100 " + (hidden ? "hidden lg:block" : "")}>
      <div className="sticky top-0 z-10 flex justify-end gap-1 p-2">
        {pages.length > 1 && (
          <select onChange={(e) => goTo(e.target.value)} value="" className="text-xs px-1.5 py-1 rounded border border-gray-200 bg-white shadow-sm" aria-label="Tới trang">
            <option value="">Tới trang…</option>
            {pages.map((p) => (
              <option key={p.n} value={p.n}>
                Trang {p.n}
              </option>
            ))}
          </select>
        )}
        {[1, 1.25, 1.5].map((z) => (
          <button
            key={z}
            type="button"
            onClick={() => setZoom(z)}
            className={"text-xs px-2 py-1 rounded border shadow-sm " + (zoom === z ? "bg-primary border-primary-dark" : "bg-white border-gray-200 text-gray-600")}
          >
            {Math.round(z * 100)}%
          </button>
        ))}
      </div>
      <div className="px-2 sm:px-4 pb-6 space-y-3 -mt-8" style={{ width: `${zoom * 100}%` }}>
        {pages.map((p) => (
          <div key={p.n} data-page={p.n} className="relative bg-white shadow-sm scroll-mt-10" style={{ aspectRatio: `${p.width || 3} / ${p.height || 4}` }}>
            <AuthImage path={myAttemptPagePath(attemptId, p.n)} alt={`Trang ${p.n}`} className="absolute inset-0 w-full h-full" />
          </div>
        ))}
        {pages.length === 0 && <p className="text-sm text-gray-500 p-6 text-center">Đề chưa có trang nào.</p>}
      </div>
    </section>
  );
}

/** Đếm chữ Hán của bài viết đoạn văn. */
function CharCount({ text, min }) {
  const n = hanCount(text);
  return (
    <span className={"mt-1 block text-right text-xs " + (n >= min ? "text-green-700" : "text-gray-500")}>
      {n} / tối thiểu {min} chữ
    </span>
  );
}

function AnswerGroup({ group, answers, keywords, onChange, onShowPage }) {
  const nos = Array.from({ length: group.to - group.from + 1 }, (_, i) => group.from + i);
  return (
    <div>
      <p className="text-sm font-medium text-gray-800 mb-2">
        {groupLabel(group)}
        {group.title && <span className="font-normal text-gray-500"> · {group.title}</span>}
        {group.page > 0 && (
          <button type="button" onClick={() => onShowPage(group.page)} className="ml-2 text-xs font-normal text-primary-dark underline">
            Xem đề (trang {group.page})
          </button>
        )}
      </p>
      {group.type === "choice" && (
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {nos.map((no) => (
            <div key={no} className="flex items-center gap-2">
              <span className="w-8 text-right text-sm text-gray-600 shrink-0">{no}.</span>
              <div className="flex gap-1.5" role="radiogroup" aria-label={`Câu ${no}`}>
                {group.options.split("").map((o) => {
                  const on = answers[no] === o;
                  return (
                    <button
                      key={o}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => onChange(no, on ? "" : o)}
                      className={
                        "w-9 h-9 rounded-lg text-sm font-semibold border transition " +
                        (on ? "bg-primary border-primary-dark text-gray-900" : "bg-white border-gray-300 text-gray-600 hover:border-primary")
                      }
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {group.type === "text" && (
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {nos.map((no) => (
            <label key={no} className="flex items-center gap-2">
              <span className="w-8 text-right text-sm text-gray-600 shrink-0">{no}.</span>
              <input
                lang="zh"
                value={answers[no] || ""}
                onChange={(e) => onChange(no, e.target.value)}
                maxLength={50}
                aria-label={`Câu ${no}`}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
          ))}
        </div>
      )}
      {group.type === "sentence" && (
        <div className="space-y-3">
          {nos.map((no) => (
            <label key={no} className="block">
              <span className="text-sm text-gray-600">
                {no}.{keywords[no] && <span className="ml-1">Dùng từ: <b className="text-gray-900 text-base">{keywords[no]}</b></span>}
              </span>
              <textarea
                lang="zh"
                rows={isEssay(group) ? 10 : 2}
                value={answers[no] || ""}
                onChange={(e) => onChange(no, e.target.value)}
                maxLength={isEssay(group) ? 1500 : 300}
                aria-label={`Câu ${no}`}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {isEssay(group) && <CharCount text={answers[no]} min={group.minChars} />}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Trang kết quả: bố cục tràn khung như màn làm bài — KHÔNG có thanh đầu trang
 * của site, chỉ một dòng mỏng (nút quay lại, tên bài, điểm), rồi hai cột
 * 50/50 chiếm hết phần còn lại, mỗi bên tự cuộn.
 */
function Result({ data, backTo }) {
  const [tab, setTab] = useState("result"); // điện thoại: Kết quả / Đề thi gốc
  const [jump, setJump] = useState(null);
  const regrade = useRegradeMyAttempt(data._id);
  const at = data.submittedAt ? new Date(data.submittedAt) : null;
  const r = data.result;
  const showPage = (n) => {
    setJump((j) => ({ n, seq: (j?.seq || 0) + 1 }));
    setTab("paper");
  };
  return (
    <div className="h-[100dvh] flex flex-col">
      <div className="shrink-0 flex items-center gap-x-2 sm:gap-x-3 px-2 sm:px-3 h-11 bg-white border-b border-orange-100 text-sm">
        <Link to={backTo} className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 shrink-0" title="Về danh sách đề">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="hidden sm:inline">Danh sách đề</span>
        </Link>
        <span className="h-5 w-px bg-gray-200 shrink-0" />
        <p className="min-w-0 flex-1 truncate text-gray-700">
          <b className="text-gray-900">Kết quả · {data.title}</b>
          <span className="hidden md:inline">
            {" "}
            · {data.candidate.name}
            {at && ` · Nộp lúc ${at.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}, ${at.toLocaleDateString("vi-VN")}`}
            {data.submitReason === "time" && " (hết giờ, tự nộp)"}
          </span>
        </p>
        <Link to={`/luyen-thi/${data.level.slug}/de/${data.testId}`} className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-orange-300 text-orange-700 text-xs font-medium hover:bg-orange-50">
          ↻ <span className="hidden sm:inline">Làm lại đề</span>
        </Link>
        {r && (
          <span className={"shrink-0 inline-flex items-baseline gap-1.5 h-7 px-2.5 rounded-full border text-xs " + (r.passed ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800")}>
            <b className="text-base">{r.total}</b>/{r.max} · {r.passed ? "Đạt" : "Chưa đạt"}
            {r.ai?.status === "pending" && " · tạm tính"}
          </span>
        )}
      </div>

      <div className="lg:hidden shrink-0 grid grid-cols-2 bg-white border-b border-orange-100 text-sm" role="tablist">
        {[
          ["result", "Kết quả"],
          ["paper", "Đề thi gốc"],
        ].map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={"py-2 font-medium border-b-2 " + (tab === v ? "border-primary-dark text-gray-900" : "border-transparent text-gray-500")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 grid lg:grid-cols-2">
        <PaperCard attemptId={data._id} pages={data.pages} jump={jump} className={tab !== "paper" ? "hidden lg:flex" : "flex"} />
        <section className={"min-h-0 overflow-y-auto bg-white lg:border-l border-orange-100 " + (tab !== "result" ? "hidden lg:block" : "")}>
          {r ? (
            <ExamResultView bare result={r} groups={data.groups} explanations={data.explanations || {}} onShowPage={showPage} onRegrade={() => regrade.mutate()} regrading={regrade.isPending} />
          ) : (
            <div className="py-16 text-center">
              <p className="text-4xl">⏳</p>
              <p className="mt-2 text-gray-700">Đã nộp bài — đang chấm…</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/**
 * Khung "Đề thi gốc" của trang kết quả: thanh công cụ (trang đang xem, phóng
 * to / thu nhỏ, toàn màn hình) + ảnh từng trang cuộn dọc. `jump` = { n, seq }.
 */
function PaperCard({ attemptId, pages, jump, className = "" }) {
  const boxRef = useRef(null);
  const scrollRef = useRef(null);
  const appliedRef = useRef(-1);
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!jump?.n || appliedRef.current === jump.seq || !el || el.offsetParent === null) return;
    appliedRef.current = jump.seq;
    const target = el.querySelector(`[data-page="${jump.n}"]`);
    if (target) el.scrollTo({ top: target.offsetTop - 12, behavior: "smooth" });
  }, [jump, className]);

  useEffect(() => {
    const onFs = () => setFull(document.fullscreenElement === boxRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Trang đang xem = trang có phần lớn nằm ở đầu khung cuộn.
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const mid = el.scrollTop + el.clientHeight * 0.3;
    let n = 1;
    for (const d of el.querySelectorAll("[data-page]")) if (d.offsetTop <= mid) n = Number(d.dataset.page);
    setPage(n);
  };

  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else boxRef.current?.requestFullscreen?.();
  };
  const btn = "w-7 h-7 rounded-md border border-gray-200 bg-white grid place-items-center text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40";

  return (
    <section ref={boxRef} className={"flex-col h-full min-h-0 bg-white " + (full ? "!h-screen " : "") + className}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <span className="text-sm font-bold text-gray-900 mr-1">Đề thi gốc</span>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-gray-600">
          <span className="w-7 h-7 rounded-md bg-gray-100 grid place-items-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" />
              <path d="M14 3v6h6" />
            </svg>
          </span>
          Trang {page} / {pages.length}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <button type="button" className={btn} onClick={() => setZoom((z) => Math.max(60, z - 20))} disabled={zoom <= 60} aria-label="Thu nhỏ">
            −
          </button>
          <span className="w-11 text-center text-[13px] text-gray-700 tabular-nums">{zoom}%</span>
          <button type="button" className={btn} onClick={() => setZoom((z) => Math.min(200, z + 20))} disabled={zoom >= 200} aria-label="Phóng to">
            +
          </button>
          <button type="button" className={btn + " ml-2"} onClick={toggleFull} aria-label={full ? "Thoát toàn màn hình" : "Toàn màn hình"} title={full ? "Thoát toàn màn hình" : "Toàn màn hình"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {full ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
            </svg>
          </button>
        </span>
      </div>
      <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 min-h-0 overflow-auto bg-gray-100 p-3 sm:p-4">
        <div className="mx-auto space-y-4" style={{ width: `${zoom}%`, maxWidth: zoom <= 100 ? 760 : undefined }}>
          {pages.map((p) => (
            <div key={p.n} data-page={p.n} className="relative bg-white shadow" style={{ aspectRatio: `${p.width || 3} / ${p.height || 4}` }}>
              <AuthImage path={myAttemptPagePath(attemptId, p.n)} alt={`Trang ${p.n}`} className="absolute inset-0 w-full h-full" />
            </div>
          ))}
          {pages.length === 0 && <p className="text-sm text-gray-500 p-6 text-center">Đề chưa có trang nào.</p>}
        </div>
      </div>
    </section>
  );
}
