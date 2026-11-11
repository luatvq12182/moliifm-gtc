import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  adminExamAudioPath,
  adminExamPagePath,
  useAdminExamTest,
  useDeleteExamAudio,
  useReconvertExamPdf,
  useRegradeExamTest,
  useSetExamHiddenPages,
  useUpdateExamTest,
  useUploadExamFile,
} from "../../../hooks/useExam.js";
import { api } from "../../../lib/apiClient.js";
import AuthImage from "../../../components/materials/AuthImage.jsx";
import { useConfirm } from "../../../components/admin/ConfirmDialog.jsx";
import { useToasts, ToastStack } from "../../../components/admin/Toast.jsx";
import { SECTION_LABEL, TYPE_LABEL, fmtPoints, isAnswered, mmss, parseAnswerPaste, scoreSummary } from "../../../lib/examAnswers.js";

/**
 * Luyện thi HSK 3.0 — soạn một đề: bên trái xem đề PDF (ẩn trang thừa), bên
 * phải file nghe, thời gian, đáp án từng câu và cấu trúc phiếu trả lời.
 *
 * File PDF / file nghe / ẩn trang lưu NGAY khi thao tác. Tên, thời gian, cấu
 * trúc và đáp án sửa trên trang rồi bấm "Lưu" một lần.
 */
export default function AdminExamTestEditPage() {
  const { id } = useParams();
  const { data: test, isLoading, isError, error } = useAdminExamTest(id);
  const toast = useToasts();

  return (
    <div>
      {isLoading && <p className="p-6 text-sm text-gray-400">Đang tải...</p>}
      {isError && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-sm">
          <p className="text-red-600">{error.message}</p>
          <Link to="/admin/exam/tests" className="inline-block mt-2 text-primary-dark hover:underline">
            ← Danh sách đề
          </Link>
        </div>
      )}
      {test && <Workspace key={test._id} test={test} toast={toast} />}
      <ToastStack toasts={toast.items} onDismiss={toast.dismiss} raised />
    </div>
  );
}

// ---------- trạng thái sửa trên trang ----------

const emptyItem = (no) => ({ no, answer: "", keyword: "", sample: "", hint: "" });

/** Dữ liệu máy chủ -> dạng sửa trên trang (cố định thứ tự khoá để so sánh "đã sửa chưa"). */
function fromServer(t) {
  const items = {};
  for (const it of t.items || []) items[it.no] = { ...emptyItem(it.no), ...it };
  return {
    title: t.title,
    timing: { listeningSec: t.timing.listeningSec, reviewSec: t.timing.reviewSec, readingSec: t.timing.readingSec, writingSec: t.timing.writingSec },
    passScore: t.passScore,
    groups: t.groups.map((g) => ({
      section: g.section,
      type: g.type,
      from: g.from,
      to: g.to,
      options: g.options || "",
      title: g.title || "",
      page: g.page || 0,
      points: g.points || 0,
      verdictPoints: { dat: g.verdictPoints?.dat || 0, gan_dat: g.verdictPoints?.gan_dat || 0, chua_dat: g.verdictPoints?.chua_dat || 0 },
    })),
    items,
  };
}

/** Dạng gửi lên / so sánh: đáp án là mảng, bỏ câu trống. */
function toPayload(form) {
  const items = Object.values(form.items)
    .filter((it) => it.answer || it.keyword || it.sample || it.hint)
    .sort((a, b) => a.no - b.no)
    .map((it) => ({ no: it.no, answer: it.answer.trim(), keyword: it.keyword.trim(), sample: it.sample.trim(), hint: it.hint.trim() }));
  return { title: form.title.trim(), timing: form.timing, passScore: Number(form.passScore) || 0, groups: form.groups, items };
}

function Workspace({ test, toast }) {
  const [form, setForm] = useState(() => fromServer(test));
  const update = useUpdateExamTest();
  const regradeAll = useRegradeExamTest();
  const { confirm, dialog } = useConfirm();
  const dirty = JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(fromServer(test)));
  const published = test.status === "published";

  // Rời trang khi còn thay đổi chưa lưu -> trình duyệt hỏi lại.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = async () => {
    try {
      const res = await update.mutateAsync({ id: test._id, payload: toPayload(form) });
      setForm(fromServer(res));
      toast.success("Đã lưu đề.");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleStatus = async () => {
    try {
      await update.mutateAsync({ id: test._id, payload: { status: published ? "draft" : "published" } });
      toast.success(published ? "Đã ẩn đề — học viên không thấy nữa." : "Đề đã hiện cho học viên.");
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Sửa đáp án sau khi đã có học viên làm: chấm lại bài cũ theo đáp án mới.
  const doRegradeAll = async () => {
    if (
      !(await confirm({
        title: `Chấm lại ${test.submittedCount} bài đã nộp?`,
        message: "Chấm lại phần trắc nghiệm và chữ Hán theo đáp án ĐÃ LƯU hiện tại. Nhận xét AI phần đặt câu giữ nguyên.",
        confirmLabel: "Chấm lại",
      }))
    )
      return;
    try {
      const res = await regradeAll.mutateAsync(test._id);
      toast.success(res.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const setItem = (no, patch) => setForm((f) => ({ ...f, items: { ...f.items, [no]: { ...emptyItem(no), ...f.items[no], ...patch } } }));

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <Link to={`/admin/exam/tests?levelId=${test.levelId}`} className="text-sm text-gray-500 hover:text-gray-800">
            ← Danh sách đề
          </Link>
          <h1 className="text-xl font-heading font-semibold mt-1">{test.title}</h1>
          {test.submittedCount > 0 && (
            <p className="text-sm text-gray-600 mt-0.5">
              <Link to={`/admin/exam/results?levelId=${test.levelId}&testId=${test._id}`} className="text-primary-dark hover:underline">
                {test.submittedCount} bài đã nộp
              </Link>
              {" · "}
              <button type="button" onClick={doRegradeAll} disabled={regradeAll.isPending || dirty} title={dirty ? "Lưu thay đổi trước" : ""} className="text-primary-dark underline disabled:opacity-50">
                {regradeAll.isPending ? "Đang chấm lại…" : "Chấm lại theo đáp án hiện tại"}
              </button>
            </p>
          )}
          {test.ready ? (
            <p className="text-sm text-green-700 mt-0.5">✓ Đề đã đủ file đề, file nghe và đáp án.</p>
          ) : (
            <ul className="text-sm text-amber-700 mt-1 list-disc pl-5">
              {test.missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={"text-xs font-medium px-2.5 py-1.5 rounded-full " + (published ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500")}>
            {published ? "Đang hiện cho học viên" : "Nháp (ẩn)"}
          </span>
          <button
            type="button"
            onClick={toggleStatus}
            disabled={update.isPending || dirty || (!published && !test.ready)}
            title={dirty ? "Lưu thay đổi trước" : !published && !test.ready ? "Đề chưa đủ điều kiện" : ""}
            className={
              "text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 " +
              (published ? "border border-gray-300 hover:bg-gray-50" : "bg-primary hover:bg-primary-dark text-gray-900")
            }
          >
            {published ? "Ẩn đề" : "Hiện cho học viên"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 items-start pb-20">
        <PdfPanel test={test} toast={toast} />

        <div className="space-y-4 min-w-0">
          <AudioPanel test={test} toast={toast} />
          <SettingsCard test={test} form={form} setForm={setForm} />
          <AnswersCard form={form} setForm={setForm} setItem={setItem} toast={toast} />
          <StructureCard form={form} setForm={setForm} published={published} />
        </div>
      </div>

      {dialog}
      {/* Thanh lưu dính đáy màn hình */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 z-30 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 flex items-center gap-3">
        <p className={"flex-1 text-sm " + (dirty ? "text-amber-700" : "text-gray-400")}>
          {dirty ? "Có thay đổi chưa lưu (tên, thời gian, đáp án, cấu trúc)." : "Đã lưu hết."}
        </p>
        {dirty && (
          <button type="button" onClick={() => setForm(fromServer(test))} className="text-sm px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            Bỏ thay đổi
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!dirty || update.isPending}
          className="bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium px-5 py-2 rounded-lg disabled:opacity-50"
        >
          {update.isPending ? "Đang lưu..." : "Lưu"}
        </button>
      </div>
    </>
  );
}

// ---------- đề PDF ----------

function PdfPanel({ test, toast }) {
  const uploadFile = useUploadExamFile();
  const reconvert = useReconvertExamPdf();
  const setHidden = useSetExamHiddenPages();
  const { confirm, dialog } = useConfirm();
  const [split, setSplit] = useState(test.pdf.splitSpreads);
  const [progress, setProgress] = useState(null);
  const [view, setView] = useState("grid"); // grid: ảnh nhỏ để chọn trang ẩn · full: đọc đề
  const { pdf } = test;
  const published = test.status === "published";
  const visible = pdf.pages.filter((p) => !p.hidden).length;

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (pdf.version && !(await confirm({ title: "Thay file đề?", message: "Ảnh các trang và danh sách trang đã ẩn sẽ làm lại từ đầu.", confirmLabel: "Thay file" }))) return;
    try {
      setProgress(0);
      await uploadFile.mutateAsync({ id: test._id, kind: "pdf", file, fields: { splitSpreads: split ? "1" : "0" }, onProgress: setProgress });
      toast.success("Đã tải file đề lên — đang chuyển thành ảnh từng trang.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProgress(null);
    }
  };

  const redo = async (splitSpreads) => {
    try {
      await reconvert.mutateAsync({ id: test._id, splitSpreads });
      setSplit(splitSpreads);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggle = (n) => {
    const hidden = pdf.pages.filter((p) => (p.n === n ? !p.hidden : p.hidden)).map((p) => p.n);
    setHidden.mutate({ id: test._id, hidden }, { onError: (err) => toast.error(err.message) });
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto min-w-0">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-heading font-semibold flex-1">Đề thi (PDF)</h2>
        {pdf.conversion === "ready" && (
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {[
              ["grid", "Ảnh nhỏ"],
              ["full", "Xem lớn"],
            ].map(([v, label]) => (
              <button key={v} type="button" onClick={() => setView(v)} className={"px-2.5 py-1.5 " + (view === v ? "bg-primary/30 font-medium" : "bg-white text-gray-500")}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {published ? (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3">Đề đang hiện cho học viên — muốn thay file đề thì ẩn đề trước.</p>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-3 mb-3 space-y-2">
          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input type="checkbox" className="mt-1" checked={split} onChange={(e) => setSplit(e.target.checked)} />
            <span>
              File scan dạng <b>2 trang giấy trên 1 trang ngang</b> — tự cắt đôi thành từng trang
            </span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium px-4 py-2 rounded-lg">
            {progress !== null ? `Đang tải lên ${progress}%…` : pdf.version ? "Thay file PDF khác" : "Chọn file PDF đề thi"}
            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={onPick} disabled={progress !== null} />
          </label>
        </div>
      )}

      {pdf.originalName && (
        <p className="text-xs text-gray-500 mb-2">
          {pdf.originalName}
          {pdf.conversion === "ready" && ` · ${visible}/${pdf.pages.length} trang đang hiện`}
        </p>
      )}
      {pdf.conversion === "processing" && <p className="text-sm text-primary-dark py-6 text-center">Đang chuyển file đề thành ảnh từng trang…</p>}
      {pdf.conversion === "failed" && <p className="text-sm text-red-600 py-3">Lỗi: {pdf.error}</p>}

      {pdf.conversion === "ready" && (
        <>
          {!published && (
            <p className="text-xs text-gray-500 mb-3">
              Bấm “Ẩn” ở trang trùng, trang trắng, bìa của đề khác… — học viên chỉ thấy trang đang hiện.{" "}
              <button type="button" onClick={() => redo(!pdf.splitSpreads)} disabled={reconvert.isPending} className="text-primary-dark underline">
                {pdf.splitSpreads ? "Không cắt đôi trang nữa" : "Cắt đôi các trang ngang"}
              </button>
            </p>
          )}
          <div className={view === "grid" ? "grid grid-cols-3 gap-2" : "space-y-3"}>
            {pdf.pages.map((p) => (
              <figure key={`${pdf.version}-${p.n}`} className={"relative rounded-lg border " + (p.hidden ? "border-dashed border-gray-300" : "border-gray-200")}>
                <div className={"relative bg-gray-50 rounded-t-lg overflow-hidden " + (p.hidden ? "opacity-35" : "")} style={{ aspectRatio: `${p.width || 3} / ${p.height || 4}` }}>
                  <AuthImage path={adminExamPagePath(test._id, p.n, { thumb: view === "grid" })} alt={`Trang ${p.n}`} className="absolute inset-0 w-full h-full" />
                </div>
                <figcaption className="flex items-center gap-1 px-2 py-1 text-xs">
                  <span className={"flex-1 " + (p.hidden ? "text-gray-400" : "text-gray-600")}>
                    Trang {p.n}
                    {p.hidden && " · đã ẩn"}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(p.n)}
                    disabled={setHidden.isPending}
                    className={"px-2 py-0.5 rounded border " + (p.hidden ? "border-primary text-primary-dark" : "border-gray-200 text-gray-500 hover:text-red-600")}
                  >
                    {p.hidden ? "Hiện lại" : "Ẩn"}
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
      {dialog}
    </section>
  );
}

// ---------- file nghe ----------

/** Thời lượng file âm thanh đo trên trình duyệt (máy chủ không có ffprobe thì dùng số này). */
function browserDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (v) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    audio.onloadedmetadata = () => done(Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0);
    audio.onerror = () => done(0);
    setTimeout(() => done(0), 8000);
    audio.src = url;
  });
}

function AudioPanel({ test, toast }) {
  const uploadFile = useUploadExamFile();
  const removeAudio = useDeleteExamAudio();
  const { confirm, dialog } = useConfirm();
  const [progress, setProgress] = useState(null);
  const { audio } = test;
  const published = test.status === "published";

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setProgress(0);
      const durationSec = await browserDuration(file);
      await uploadFile.mutateAsync({ id: test._id, kind: "audio", file, fields: { durationSec: String(durationSec) }, onProgress: setProgress });
      toast.success("Đã tải file nghe lên.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProgress(null);
    }
  };

  const doRemove = async () => {
    if (!(await confirm({ title: "Xoá file nghe?", message: "Đề sẽ chưa đủ điều kiện hiện cho học viên tới khi có file nghe mới.", confirmLabel: "Xoá", tone: "danger" }))) return;
    removeAudio.mutate(test._id, { onError: (err) => toast.error(err.message) });
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-4">
      <h2 className="font-heading font-semibold mb-1">File nghe</h2>
      <p className="text-xs text-gray-500 mb-3">Học viên chỉ được nghe một lần, không tua, không nghe lại. Phần nghe dài bằng file nghe.</p>
      {audio.has ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-800">
            🎧 {audio.originalName} · <b>{mmss(audio.durationSec)}</b> · {(audio.bytes / 1024 / 1024).toFixed(1)} MB
          </p>
          <AudioPreview key={audio.version} testId={test._id} />
        </div>
      ) : (
        <p className="text-sm text-gray-500">Chưa có file nghe.</p>
      )}
      {published ? (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mt-3">Đề đang hiện cho học viên — muốn thay file nghe thì ẩn đề trước.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <label className="inline-flex items-center cursor-pointer text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            {progress !== null ? `Đang tải lên ${progress}%…` : audio.has ? "Thay file nghe" : "Chọn file nghe (.mp3)"}
            <input type="file" accept=".mp3,.m4a,.aac,.wav,.ogg,audio/*" className="hidden" onChange={onPick} disabled={progress !== null} />
          </label>
          {audio.has && (
            <button type="button" onClick={doRemove} className="text-sm px-3 py-2 rounded-lg text-red-600 hover:bg-red-50">
              Xoá file nghe
            </button>
          )}
        </div>
      )}
      {dialog}
    </section>
  );
}

/** Nghe thử — chỉ tải file (vài chục MB) khi admin bấm. */
function AudioPreview({ testId }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => () => url && URL.revokeObjectURL(url), [url]);
  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      setUrl(URL.createObjectURL(await api.blob(adminExamAudioPath(testId))));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  if (url) return <audio src={url} controls className="w-full" />;
  return (
    <div>
      <button type="button" onClick={load} disabled={loading} className="text-sm text-primary-dark underline">
        {loading ? "Đang tải file nghe…" : "▶ Nghe thử"}
      </button>
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </div>
  );
}

// ---------- tên, thời gian, điểm ----------

function MinutesInput({ value, onChange, min = 0 }) {
  return (
    <input
      type="number"
      min={min}
      step="1"
      value={Math.round((value || 0) / 60)}
      onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)) * 60)}
      className="w-20 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
    />
  );
}

function SettingsCard({ test, form, setForm }) {
  const t = form.timing;
  const setTiming = (k) => (v) => setForm((f) => ({ ...f, timing: { ...f.timing, [k]: v } }));
  const listening = t.listeningSec || test.audio.durationSec;
  const total = listening + t.reviewSec + t.readingSec + t.writingSec;
  const score = scoreSummary(form.groups);
  const row = "flex items-center gap-3 text-sm";

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Tên đề *</label>
        <input
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-800 mb-2">Thời gian làm bài</h3>
        <div className="space-y-2">
          <div className={row}>
            <span className="w-40 text-gray-600">Nghe</span>
            <select
              value={t.listeningSec ? "custom" : "audio"}
              onChange={(e) => setTiming("listeningSec")(e.target.value === "audio" ? 0 : Math.max(60, Math.round((test.audio.durationSec || 1380) / 60) * 60))}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="audio">Theo file nghe ({test.audio.durationSec ? mmss(test.audio.durationSec) : "chưa có"})</option>
              <option value="custom">Tự đặt số phút</option>
            </select>
            {t.listeningSec > 0 && (
              <>
                <MinutesInput value={t.listeningSec} onChange={setTiming("listeningSec")} min={1} /> phút
              </>
            )}
          </div>
          <div className={row}>
            <span className="w-40 text-gray-600">Xem lại đáp án nghe</span>
            <MinutesInput value={t.reviewSec} onChange={setTiming("reviewSec")} /> phút <span className="text-xs text-gray-400">(không có tiếng)</span>
          </div>
          <div className={row}>
            <span className="w-40 text-gray-600">Đọc</span>
            <MinutesInput value={t.readingSec} onChange={setTiming("readingSec")} min={1} /> phút
          </div>
          <div className={row}>
            <span className="w-40 text-gray-600">Viết</span>
            <MinutesInput value={t.writingSec} onChange={setTiming("writingSec")} min={1} /> phút
          </div>
          <p className="text-xs text-gray-500">Tổng cả bài: khoảng {Math.round(total / 60)} phút. Phần đọc và viết cho nộp sớm.</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-800 mb-2">Điểm</h3>
        <p className="text-sm text-gray-700">
          Nghe {fmtPoints(score.listening)} · Đọc {fmtPoints(score.reading)} · Viết {fmtPoints(score.writing)} = <b>{fmtPoints(score.total)} điểm</b>
        </p>
        <div className={row + " mt-2"}>
          <span className="text-gray-600">Điểm đỗ</span>
          <input
            type="number"
            min="0"
            value={form.passScore}
            onChange={(e) => setForm((f) => ({ ...f, passScore: e.target.value }))}
            className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <span className="text-xs text-gray-400">/ {fmtPoints(score.total)}</span>
        </div>
        <p className="text-[11px] text-gray-400 mt-1">Điểm từng câu sửa ở mục “Cấu trúc phiếu trả lời”.</p>
      </div>
    </section>
  );
}

// ---------- đáp án ----------

function AnswersCard({ form, setForm, setItem, toast }) {
  const [paste, setPaste] = useState("");
  const total = form.groups.reduce((n, g) => n + Math.max(0, g.to - g.from + 1), 0);
  let answered = 0;
  for (const g of form.groups) for (let n = g.from; n <= g.to; n++) if (isAnswered(g, form.items[n])) answered++;

  const applyPaste = () => {
    const current = new Map(Object.entries(form.items).map(([k, v]) => [Number(k), v]));
    const res = parseAnswerPaste(paste, form.groups, current);
    if (res.applied) {
      setForm((f) => ({ ...f, items: Object.fromEntries(res.items) }));
      setPaste("");
    }
    if (res.errors.length) toast.error(`Đã điền ${res.applied} câu. ${res.errors.slice(0, 4).join(" ")}${res.errors.length > 4 ? " …" : ""}`);
    else if (res.applied) toast.success(`Đã điền ${res.applied} câu — kiểm tra lại rồi bấm Lưu.`);
    else toast.error("Không đọc được đáp án nào. Dán dạng “1.B 2.A 3.C …” hoặc một dãy chữ cái.");
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-heading font-semibold flex-1">Đáp án</h2>
        <span className={"text-xs font-medium px-2 py-1 rounded-full " + (answered === total && total ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700")}>
          {answered}/{total} câu
        </span>
      </div>

      <details className="mb-4 rounded-lg bg-gray-50 border border-gray-100">
        <summary className="cursor-pointer px-3 py-2 text-sm text-gray-700">Dán nhanh đáp án</summary>
        <div className="px-3 pb-3 space-y-2">
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={4}
            placeholder={"1.B 2.A 3.F 4.C …\n61.汽 62.图 …\n66.电话 67.聊天儿 …   (đặt câu: từ bắt buộc)\nhoặc chỉ một dãy chữ cái: BAFCE…"}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button type="button" onClick={applyPaste} disabled={!paste.trim()} className="text-sm font-medium px-4 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50">
            Điền vào phiếu
          </button>
        </div>
      </details>

      {form.groups.length === 0 && <p className="text-sm text-gray-500">Chưa có cấu trúc — thêm nhóm câu ở mục “Cấu trúc phiếu trả lời”.</p>}

      <div className="space-y-5">
        {form.groups.map((g) => (
          <div key={`${g.from}-${g.to}`}>
            <p className="text-sm font-medium text-gray-800">
              <span className="text-xs font-semibold text-primary-dark mr-1">{SECTION_LABEL[g.section]}</span>
              Câu {g.from}–{g.to}
              {g.title && <span className="font-normal text-gray-500"> · {g.title}</span>}
            </p>
            <div className="mt-2">
              {g.type === "choice" && <ChoiceAnswers group={g} items={form.items} setItem={setItem} />}
              {g.type === "text" && <TextAnswers group={g} items={form.items} setItem={setItem} />}
              {g.type === "sentence" && <SentenceAnswers group={g} items={form.items} setItem={setItem} />}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const range = (g) => Array.from({ length: Math.max(0, g.to - g.from + 1) }, (_, i) => g.from + i);
const noLabel = (g, it) => "w-8 shrink-0 text-sm text-right " + (isAnswered(g, it) ? "text-gray-600" : "text-amber-600 font-semibold");

function ChoiceAnswers({ group, items, setItem }) {
  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
      {range(group).map((no) => {
        const cur = items[no]?.answer || "";
        return (
          <div key={no} className="flex items-center gap-2">
            <span className={noLabel(group, items[no])}>{no}.</span>
            <div className="flex gap-1" role="radiogroup" aria-label={`Câu ${no}`}>
              {group.options.split("").map((o) => (
                <button
                  key={o}
                  type="button"
                  role="radio"
                  aria-checked={cur === o}
                  onClick={() => setItem(no, { answer: cur === o ? "" : o })}
                  className={
                    "w-8 h-8 rounded-md text-sm font-medium border transition " +
                    (cur === o ? "bg-primary border-primary-dark text-gray-900" : "bg-white border-gray-200 text-gray-500 hover:border-primary")
                  }
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const field = "border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

function TextAnswers({ group, items, setItem }) {
  return (
    <div className="space-y-1.5">
      {range(group).map((no) => (
        <div key={no} className="flex items-center gap-2">
          <span className={noLabel(group, items[no])}>{no}.</span>
          <input
            value={items[no]?.answer || ""}
            onChange={(e) => setItem(no, { answer: e.target.value })}
            placeholder="Đáp án — nhiều cách đúng thì cách nhau bằng /"
            aria-label={`Đáp án câu ${no}`}
            className={field + " flex-1"}
          />
        </div>
      ))}
    </div>
  );
}

function SentenceAnswers({ group, items, setItem }) {
  return (
    <div className="space-y-3">
      {range(group).map((no) => {
        const it = items[no] || {};
        return (
          <div key={no} className="flex gap-2">
            <span className={noLabel(group, it) + " pt-1.5"}>{no}.</span>
            <div className="flex-1 grid sm:grid-cols-2 gap-1.5">
              <input value={it.keyword || ""} onChange={(e) => setItem(no, { keyword: e.target.value })} placeholder="Từ bắt buộc dùng *" aria-label={`Từ bắt buộc câu ${no}`} className={field} />
              <input value={it.hint || ""} onChange={(e) => setItem(no, { hint: e.target.value })} placeholder="Mô tả tranh (cho AI chấm)" aria-label={`Mô tả tranh câu ${no}`} className={field} />
              <input value={it.sample || ""} onChange={(e) => setItem(no, { sample: e.target.value })} placeholder="Câu mẫu (hiện ở kết quả)" aria-label={`Câu mẫu câu ${no}`} className={field + " sm:col-span-2"} />
            </div>
          </div>
        );
      })}
      <p className="text-[11px] text-gray-400">AI không nhìn được tranh trong đề — mô tả ngắn nội dung tranh để AI xét câu có hợp tranh không.</p>
    </div>
  );
}

// ---------- cấu trúc phiếu trả lời ----------

function StructureCard({ form, setForm, published }) {
  const setGroup = (i, patch) => setForm((f) => ({ ...f, groups: f.groups.map((g, j) => (j === i ? { ...g, ...patch } : g)) }));
  const removeGroup = (i) => setForm((f) => ({ ...f, groups: f.groups.filter((_, j) => j !== i) }));
  const addGroup = () =>
    setForm((f) => {
      const last = f.groups[f.groups.length - 1];
      const from = (last?.to || 0) + 1;
      return {
        ...f,
        groups: [
          ...f.groups,
          { section: last?.section || "listening", type: "choice", from, to: from + 4, options: "ABC", title: "", page: 0, points: last?.points || 0, verdictPoints: { dat: 0, gan_dat: 0, chua_dat: 0 } },
        ],
      };
    });
  const small = "border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <details className="bg-white rounded-2xl border border-gray-200" open={form.groups.length === 0}>
      <summary className="cursor-pointer px-4 py-3 font-heading font-semibold">Cấu trúc phiếu trả lời ({form.groups.length} nhóm câu)</summary>
      <div className="px-4 pb-4 space-y-3">
        <p className="text-xs text-gray-500">
          Mỗi nhóm là một dãy câu liên tiếp cùng kiểu, theo thứ tự nghe → đọc → viết. Bớt câu khỏi cấu trúc thì đáp án của câu đó bị bỏ khi lưu.
          “Trang đề”: trang (số như ở cột Đề thi) có nhóm câu đó — vào phần nào, màn làm bài tự cuộn tới trang của nhóm đầu phần đó.
          {published && " Đề đang hiện: chỉ lưu được khi mọi câu vẫn có đáp án."}
        </p>
        {form.groups.map((g, i) => (
          <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <select value={g.section} onChange={(e) => setGroup(i, { section: e.target.value })} className={small} aria-label="Phần">
                {Object.entries(SECTION_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              câu
              <input type="number" min="1" value={g.from} onChange={(e) => setGroup(i, { from: Number(e.target.value) })} className={small + " w-16"} aria-label="Từ câu" />–
              <input type="number" min="1" value={g.to} onChange={(e) => setGroup(i, { to: Number(e.target.value) })} className={small + " w-16"} aria-label="Đến câu" />
              <select value={g.type} onChange={(e) => setGroup(i, { type: e.target.value })} className={small} aria-label="Kiểu câu">
                {Object.entries(TYPE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => removeGroup(i)} className="ml-auto text-xs text-red-600 hover:underline">
                Xoá nhóm
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {g.type === "choice" && (
                <>
                  Lựa chọn
                  <input value={g.options} onChange={(e) => setGroup(i, { options: e.target.value.toUpperCase() })} placeholder="ABC" className={small + " w-24 font-mono"} aria-label="Các lựa chọn" />
                </>
              )}
              {g.type === "sentence" ? (
                <>
                  Điểm: đạt
                  <input type="number" min="0" value={g.verdictPoints.dat} onChange={(e) => setGroup(i, { verdictPoints: { ...g.verdictPoints, dat: Number(e.target.value) } })} className={small + " w-16"} />
                  gần đạt
                  <input type="number" min="0" value={g.verdictPoints.gan_dat} onChange={(e) => setGroup(i, { verdictPoints: { ...g.verdictPoints, gan_dat: Number(e.target.value) } })} className={small + " w-16"} />
                  chưa đạt
                  <input type="number" min="0" value={g.verdictPoints.chua_dat} onChange={(e) => setGroup(i, { verdictPoints: { ...g.verdictPoints, chua_dat: Number(e.target.value) } })} className={small + " w-16"} />
                  <span className="text-xs text-gray-400">(bỏ trống: 0)</span>
                </>
              ) : (
                <>
                  Điểm/câu đúng
                  <input type="number" min="0" step="any" value={Math.round(g.points * 10000) / 10000} onChange={(e) => setGroup(i, { points: Number(e.target.value) })} className={small + " w-24"} />
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <input value={g.title} onChange={(e) => setGroup(i, { title: e.target.value })} placeholder="Lời dẫn trên phiếu trả lời (vd. Chọn tranh phù hợp)" className={small + " flex-1 min-w-[200px]"} />
              Trang đề
              <input
                type="number"
                min="0"
                value={g.page || ""}
                onChange={(e) => setGroup(i, { page: Number(e.target.value) || 0 })}
                placeholder="—"
                title="Số trang (như ở cột Đề thi bên trái) có nhóm câu này — màn làm bài tự cuộn tới"
                className={small + " w-16"}
                aria-label="Trang đề"
              />
            </div>
          </div>
        ))}
        <button type="button" onClick={addGroup} className="text-sm font-medium px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
          + Thêm nhóm câu
        </button>
      </div>
    </details>
  );
}
