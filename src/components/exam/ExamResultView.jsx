import { useMemo, useState } from "react";
import { hanCount } from "../../lib/examAnswers.js";

/**
 * Kết quả từng câu của một bài luyện thi (dùng chung cho học viên và trang quản
 * trị): tab Nghe / Đọc / Viết, lọc câu sai / chưa trả lời, lưới số câu, mỗi câu
 * một thẻ gập / mở — bạn chọn, đáp án đúng, nội dung hội thoại / đoạn văn
 * (kèm pinyin bật / tắt), giải thích đáp án; câu đặt câu kèm điểm AI cho.
 *
 * @param result       kết quả máy chủ chấm (attempt.result)
 * @param groups       cấu trúc phiếu trả lời của bài
 * @param explanations { số câu: { script, explain } }
 * @param onShowPage   (tuỳ chọn) bấm "Xem câu trong đề" -> cuộn đề tới trang n
 * @param onRegrade    (tuỳ chọn) nút "Chấm lại phần đặt câu" khi AI lỗi / hết lượt
 * @param bare         không bo khung (khi đã nằm trong một ô chiếm trọn màn hình)
 */
const SECTIONS = [
  ["listening", "Nghe"],
  ["reading", "Đọc"],
  ["writing", "Viết"],
];
const AI_NOTE = {
  pending: "AI đang chấm phần đặt câu — điểm tổng đang tạm tính, đợi vài giây…",
  error: "AI chưa chấm được phần đặt câu (dịch vụ AI lỗi). Điểm đặt câu chưa được tính.",
  limited: "Hôm nay bạn đã dùng hết lượt AI chấm. Điểm đặt câu chưa được tính — thử chấm lại vào ngày mai.",
  unavailable: "Phần đặt câu chưa có AI chấm — so với đáp án tham khảo để tự kiểm tra. Điểm đặt câu chưa được tính.",
};
const VERDICT_LABEL = { dat: "Đạt", gan_dat: "Gần đạt", chua_dat: "Chưa đạt" };
const PINYIN_KEY = "exam_result_pinyin";

/** Trạng thái một câu: right | wrong | mid (đặt câu điểm trung bình) | blank | pending. */
function statusOf(item) {
  if (item.type === "sentence") {
    if (item.blank) return "blank";
    if (item.score === undefined) return item.verdict === "dat" ? "right" : item.verdict === "gan_dat" ? "mid" : item.verdict ? "wrong" : "pending";
    if (item.score === null) return "pending";
    const r = item.max ? item.score / item.max : 0;
    return r >= 0.8 ? "right" : r >= 0.5 ? "mid" : "wrong";
  }
  if (!String(item.given || "").trim()) return "blank";
  return item.ok ? "right" : "wrong";
}

const STATUS_STYLE = {
  right: { cell: "bg-green-50 text-green-700", badge: "bg-green-50 text-green-700", label: "✓ Trả lời đúng" },
  wrong: { cell: "bg-red-50 text-red-600", badge: "bg-red-50 text-red-600", label: "✗ Trả lời sai" },
  mid: { cell: "bg-amber-50 text-amber-700", badge: "bg-amber-50 text-amber-700", label: "Chưa trọn điểm" },
  blank: { cell: "bg-gray-100 text-gray-500", badge: "bg-gray-100 text-gray-500", label: "Chưa trả lời" },
  pending: { cell: "bg-gray-100 text-gray-400", badge: "bg-gray-100 text-gray-500", label: "Chờ chấm" },
};

/** Gom văn bản thành khối: một dòng có chữ Hán + các dòng pinyin ngay sau nó. */
function toBlocks(text) {
  const blocks = [];
  for (const line of String(text || "").split("\n")) {
    if (!line.trim()) continue;
    if (/[一-鿿]/.test(line) || blocks.length === 0) blocks.push({ han: line.trim(), rest: [] });
    else blocks[blocks.length - 1].rest.push(line.trim());
  }
  return blocks;
}

/** "C 在家休息 正确：…" hoặc "A 正确 邮件里：…" -> { letter, option, right, reason }; dòng khác -> null. */
function parseOption(han) {
  const m = han.match(/^([A-F])\s+(.+?)\s*(正确|错误)\s*[：:]?\s*(.*)$/) || han.match(/^([A-F])\s+(正确|错误)\s+(.*?)[：:]\s*(.*)$/);
  if (!m) return null;
  const [letter, option, verdict, reason] = m[2] === "正确" || m[2] === "错误" ? [m[1], m[3], m[2], m[4]] : [m[1], m[2], m[3], m[4]];
  return { letter, option, right: verdict === "正确", reason };
}

/** Có lời người nói (男：/ 女：/ A：…) -> hội thoại, còn lại -> đoạn văn (theo cách gọi trong file đáp án). */
const scriptLabel = (script) => (/^\s*(男|女|[A-Z])\s*[：:]/m.test(script) ? "Nội dung hội thoại" : "Nội dung đoạn văn");

const Pinyin = ({ lines, show }) =>
  show ? lines.map((r, j) => <p key={j} className="text-[13px] leading-snug text-gray-500 italic">{r}</p>) : null;

/** Lời thoại: giữ nguyên cách ghi trong file đáp án (男：/ 女：/ 问：…), người nói in đậm; câu hỏi 问 nổi hơn. */
function ScriptView({ text, pinyin }) {
  return (
    <div className="space-y-1.5">
      {toBlocks(text).map((b, i) => {
        const m = b.han.match(/^((?:男|女|[A-Z]|问)\s*[：:])\s*(.*)$/);
        const ask = m && m[1].startsWith("问");
        return (
          <div key={i} className={ask ? "mt-2 rounded-lg bg-blue-50/70 px-3 py-1.5" : ""}>
            <p className={"text-[15px] leading-relaxed text-gray-900 " + (ask ? "font-semibold" : "")}>
              {m ? (
                <>
                  <b className={"font-semibold " + (ask ? "text-blue-700" : "text-gray-700")}>{m[1]}</b>
                  {m[2]}
                </>
              ) : (
                b.han
              )}
            </p>
            <Pinyin lines={b.rest} show={pinyin} />
          </div>
        );
      })}
    </div>
  );
}

/** Giải thích: câu tóm tắt + các phương án xếp A, B, C… (nhãn Đúng / Sai). */
function ExplainView({ text, pinyin }) {
  const blocks = toBlocks(text).map((b) => ({ ...b, opt: parseOption(b.han) }));
  const ordered = [];
  let run = [];
  const flush = () => {
    ordered.push(...run.sort((x, y) => x.opt.letter.localeCompare(y.opt.letter)));
    run = [];
  };
  for (const b of blocks) {
    if (b.opt) run.push(b);
    else {
      flush();
      ordered.push(b);
    }
  }
  flush();
  return (
    <div className="space-y-2">
      {ordered.map((b, i) =>
        b.opt ? (
          <div key={i} className="flex gap-2.5">
            <span className={"mt-0.5 w-6 h-6 rounded-full grid place-items-center text-xs font-bold shrink-0 " + (b.opt.right ? "bg-green-600 text-white" : "bg-white border border-gray-300 text-gray-500")}>
              {b.opt.letter}
            </span>
            <div className="min-w-0">
              <p className={"text-[15px] leading-snug " + (b.opt.right ? "text-green-800" : "text-gray-900")}>
                <b className="font-semibold">{b.opt.option}</b>
                {b.opt.right && <span className="sr-only"> (đáp án đúng)</span>}
              </p>
              <p className="text-[14px] leading-relaxed text-gray-700">{b.opt.reason}</p>
              <Pinyin lines={b.rest} show={pinyin} />
            </div>
          </div>
        ) : (
          <div key={i}>
            <p className="text-[15px] leading-relaxed text-gray-900">{b.han}</p>
            <Pinyin lines={b.rest} show={pinyin} />
          </div>
        ),
      )}
    </div>
  );
}

/** Điểm tổng + từng phần (trang quản trị dùng; trang học viên có thẻ điểm riêng). */
export function ScoreSummary({ result }) {
  if (!result) return null;
  const pct = result.max ? Math.round((result.total / result.max) * 100) : 0;
  const tone = result.passed ? { box: "border-green-300 bg-green-50", num: "text-green-700", bar: "bg-green-500", tag: "bg-green-600 text-white" } : { box: "border-amber-300 bg-amber-50", num: "text-amber-700", bar: "bg-amber-500", tag: "bg-amber-500 text-white" };
  return (
    <div className="grid gap-3 sm:grid-cols-[auto_1fr] items-stretch">
      <div className={"rounded-2xl border-2 px-5 py-4 min-w-[220px] " + tone.box}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tổng điểm</p>
          <span className={"text-xs font-bold px-2 py-0.5 rounded-full " + tone.tag}>{result.passed ? "Đạt" : "Chưa đạt"}</span>
        </div>
        <p className={"mt-1 text-4xl font-bold leading-none " + tone.num}>
          {result.total}
          <span className="text-lg font-medium text-gray-400"> / {result.max}</span>
        </p>
        <div className="mt-3 h-2 rounded-full bg-white/70 overflow-hidden">
          <div className={"h-full rounded-full " + tone.bar} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          {pct}% · đỗ từ {result.passScore} điểm
          {result.ai?.status === "pending" && " · đang tạm tính"}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {SECTIONS.filter(([k]) => result.sections[k]).map(([k, label]) => {
          const x = result.sections[k];
          const p = x.max ? Math.round((x.score / x.max) * 100) : 0;
          return (
            <div key={k} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 flex flex-col justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900 leading-none">
                {x.score}
                <span className="text-sm font-medium text-gray-400">/{x.max}</span>
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className={"h-full rounded-full " + (p >= 60 ? "bg-green-500" : "bg-amber-500")} style={{ width: `${p}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                {x.correct}/{x.total} câu {k === "writing" ? "đúng / đạt" : "đúng"}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function readPinyin() {
  try {
    return localStorage.getItem(PINYIN_KEY) === "1";
  } catch {
    return false;
  }
}

export default function ExamResultView({ result, groups, explanations = {}, onShowPage, onRegrade, regrading = false, bare = false }) {
  const sections = useMemo(() => SECTIONS.filter(([k]) => result?.sections?.[k]), [result]);
  const [tab, setTab] = useState(() => sections[0]?.[0] || "listening");
  const [filter, setFilter] = useState("all");
  const [pinyin, setPinyin] = useState(readPinyin);
  const [openNo, setOpenNo] = useState(null);
  const exp = explanations || {};

  // Các câu của tab hiện tại (đúng thứ tự), kèm nhóm của từng câu.
  const questions = useMemo(() => {
    const out = [];
    for (const g of groups.filter((x) => x.section === tab)) {
      for (let no = g.from; no <= g.to; no++) if (result?.items?.[no]) out.push({ no, group: g, item: result.items[no], status: statusOf(result.items[no]) });
    }
    return out;
  }, [groups, tab, result]);
  const shown = questions.filter((q) => filter === "all" || (filter === "wrong" ? ["wrong", "mid"].includes(q.status) : q.status === "blank"));
  // Chỉ hiện MỘT câu: câu đang chọn, mặc định là câu đầu của danh sách đang lọc.
  const idx = Math.max(0, shown.findIndex((q) => q.no === openNo));
  const current = shown[idx] || null;

  const togglePinyin = () =>
    setPinyin((p) => {
      try {
        localStorage.setItem(PINYIN_KEY, p ? "0" : "1");
      } catch {
        // bỏ qua
      }
      return !p;
    });

  if (!result) return <p className="text-sm text-gray-500 py-8 text-center">Đang chấm bài…</p>;
  const ai = result.ai?.status || "none";
  const counts = {
    wrong: questions.filter((q) => ["wrong", "mid"].includes(q.status)).length,
    blank: questions.filter((q) => q.status === "blank").length,
  };

  return (
    <div className={bare ? "bg-white" : "rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden"}>
      {/* Tab Nghe / Đọc / Viết */}
      <div className={"flex flex-wrap gap-1 px-3 border-b border-gray-200 bg-white " + (bare ? "sticky top-0 z-10" : "")} role="tablist">
        {sections.map(([k, label]) => {
          const on = tab === k;
          const x = result.sections[k];
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setTab(k);
                setFilter("all");
                setOpenNo(null);
              }}
              className={"relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors " + (on ? "text-primary-dark" : "text-gray-500 hover:text-gray-800")}
            >
              {label}
              <span className={"text-[11px] font-medium px-1.5 py-0.5 rounded-full " + (on ? "bg-primary/25 text-gray-900" : "bg-gray-100 text-gray-500")}>
                {x.score}/{x.max}
              </span>
              {on && <span className="absolute left-2 right-2 -bottom-px h-0.5 rounded-full bg-primary-dark" />}
            </button>
          );
        })}
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {AI_NOTE[ai] && tab === "writing" && (
          <div className={"text-sm rounded-xl px-3 py-2 flex flex-wrap items-center gap-2 " + (ai === "pending" ? "bg-amber-50 text-amber-800" : "bg-gray-50 text-gray-600")}>
            <span className="flex-1">{AI_NOTE[ai]}</span>
            {onRegrade && ["error", "limited"].includes(ai) && (
              <button type="button" onClick={onRegrade} disabled={regrading} className="text-sm font-medium px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50">
                {regrading ? "Đang gửi…" : "Chấm lại phần đặt câu"}
              </button>
            )}
          </div>
        )}

        {/* Lọc + pinyin */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            ["all", "Tất cả", questions.length],
            ["wrong", "Câu sai", counts.wrong],
            ["blank", "Chưa trả lời", counts.blank],
          ].map(([v, label, n]) => (
            <button
              key={v}
              type="button"
              onClick={() => {
                setFilter(v);
                setOpenNo(null);
              }}
              className={
                "h-8 px-3 rounded-full text-[13px] font-medium border transition-colors " +
                (filter === v ? "bg-primary border-primary-dark text-gray-900" : "bg-white border-gray-300 text-gray-600 hover:border-primary")
              }
            >
              {label} <span className="opacity-60">{n}</span>
            </button>
          ))}
          <span className="ml-auto inline-flex items-center gap-2 text-[13px] text-gray-600 select-none">
            <button
              type="button"
              role="switch"
              aria-checked={pinyin}
              aria-label="Hiện pinyin"
              onClick={togglePinyin}
              className={"relative w-9 h-5 rounded-full transition-colors " + (pinyin ? "bg-primary-dark" : "bg-gray-300")}
            >
              <span className={"absolute top-0.5 left-0 w-4 h-4 rounded-full bg-white shadow transition-transform " + (pinyin ? "translate-x-[18px]" : "translate-x-0.5")} />
            </button>
            Hiện pinyin
          </span>
        </div>

        {/* Lưới số câu — bấm số nào thì hiện câu đó bên dưới */}
        {shown.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {shown.map((q) => (
              <button
                key={q.no}
                type="button"
                onClick={() => setOpenNo(q.no)}
                aria-label={`Câu ${q.no}`}
                aria-pressed={q.no === current?.no}
                className={
                  "h-8 min-w-[36px] px-1.5 rounded-md text-[13px] font-semibold transition " +
                  STATUS_STYLE[q.status].cell +
                  (q.no === current?.no ? " ring-2 ring-gray-800 ring-offset-1" : " hover:brightness-95")
                }
              >
                {q.no}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">Không có câu nào trong mục này. 🎉</p>
        )}

        {current && (
          <QuestionPanel
            key={current.no}
            q={current}
            explanation={exp[current.no]}
            pinyin={pinyin}
            onShowPage={onShowPage}
            position={`${idx + 1}/${shown.length}`}
            onPrev={idx > 0 ? () => setOpenNo(shown[idx - 1].no) : null}
            onNext={idx < shown.length - 1 ? () => setOpenNo(shown[idx + 1].no) : null}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Nhãn đáp án nhỏ đặt cạnh "Câu xx" (câu chọn / viết):
 * đúng -> chỉ "Bạn chọn B" màu xanh; sai -> "Bạn chọn B" đỏ + "Đáp án F" xanh;
 * bỏ trống -> "Chưa trả lời" xám + "Đáp án F" xanh.
 */
function AnswerTags({ item, status }) {
  const verb = item.type === "text" ? "viết" : "chọn";
  const tag = "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ";
  const val = (v) => <b className="text-[13px] font-bold">{v || "—"}</b>;
  if (status === "right") {
    return (
      <span className={tag + "bg-green-50 text-green-700 border border-green-200"}>
        ✓ Bạn {verb} {val(item.given)}
      </span>
    );
  }
  return (
    <>
      {status === "blank" ? (
        <span className={tag + "bg-gray-100 text-gray-500 border border-gray-200"}>Chưa trả lời</span>
      ) : (
        <span className={tag + "bg-red-50 text-red-600 border border-red-200"}>
          ✗ Bạn {verb} {val(item.given)}
        </span>
      )}
      <span className={tag + "bg-green-50 text-green-700 border border-green-200"}>Đáp án {val(item.correct)}</span>
    </>
  );
}

/** Một câu (đang chọn): nhãn bạn chọn / đáp án cạnh số câu, nội dung, giải thích, nút câu trước / sau. */
function QuestionPanel({ q, explanation, pinyin, onShowPage, position, onPrev, onNext }) {
  const { no, item, status, group } = q;
  const st = STATUS_STYLE[status];
  const sentence = item.type === "sentence";
  const scoreText = sentence && item.score != null ? `${item.score}/${item.max} điểm` : sentence && item.verdict ? VERDICT_LABEL[item.verdict] || "" : "";
  const nav = "h-8 px-3 rounded-full border text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div className="border-t border-gray-200 pt-3 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-base font-bold text-gray-900">Câu {no}</span>
        {sentence ? (
          <span className={"text-xs font-medium px-2 py-0.5 rounded-md " + st.badge}>{scoreText || st.label}</span>
        ) : (
          <AnswerTags item={item} status={status} />
        )}
        {sentence && item.keyword && (
          <span className="text-sm text-gray-600">
            · Dùng từ <b className="text-gray-900">{item.keyword}</b>
          </span>
        )}
        <span className="ml-auto text-xs text-gray-400">{position}</span>
      </div>

      {sentence ? (
        <>
          <div className="grid sm:grid-cols-[1fr_auto] gap-2">
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Bài viết của bạn</p>
              <p className={"mt-0.5 text-[16px] text-gray-900 " + (item.essay ? "whitespace-pre-wrap leading-relaxed" : "")}>{item.given || <span className="text-gray-400">Chưa viết</span>}</p>
            </div>
            <div className={"rounded-lg px-4 py-2 text-center " + (status === "right" ? "bg-green-50" : status === "mid" ? "bg-amber-50" : status === "pending" ? "bg-gray-100" : "bg-red-50")}>
              <p className="text-xs text-gray-500">Điểm AI</p>
              <p className={"text-xl font-bold " + (status === "right" ? "text-green-700" : status === "mid" ? "text-amber-700" : status === "pending" ? "text-gray-400" : "text-red-600")}>
                {item.score != null ? `${item.score}/${item.max}` : status === "pending" ? "…" : scoreText || "0"}
              </p>
            </div>
          </div>
          {item.essay && item.given && (
            <p className="text-xs text-gray-500">
              {hanCount(item.given)} chữ · yêu cầu tối thiểu {item.minChars} chữ
            </p>
          )}
          {item.comment && <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.comment}</p>}
          {item.corrected && item.corrected !== item.given && (
            <p className={"text-sm " + (item.essay ? "whitespace-pre-wrap leading-relaxed" : "")}>
              <span className="text-gray-500">{item.essay ? "Bài sửa: " : "Câu sửa: "}</span>
              <span className="text-green-700 font-medium">{item.corrected}</span>
            </p>
          )}
          {(explanation?.explain || item.sample) && (
            <div className="rounded-lg bg-amber-50 px-3 py-2.5">
              <p className="text-sm font-bold text-amber-700 mb-1">Đáp án tham khảo</p>
              {explanation?.explain ? <ExplainView text={explanation.explain} pinyin={pinyin} /> : <p className="text-[15px] text-gray-900">{item.sample}</p>}
            </div>
          )}
        </>
      ) : (
        <>
          {explanation?.script && (
            <div className="rounded-lg bg-gray-50 px-3 py-2.5">
              <p className="text-sm font-bold text-gray-900 mb-1">{scriptLabel(explanation.script)}</p>
              <ScriptView text={explanation.script} pinyin={pinyin} />
            </div>
          )}
          {explanation?.explain && (
            <div className="rounded-lg bg-amber-50 px-3 py-2.5">
              <p className="text-sm font-bold text-amber-700 mb-1">Giải thích đáp án</p>
              <ExplainView text={explanation.explain} pinyin={pinyin} />
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-2 pt-1">
        {onShowPage && group.page > 0 && (
          <button type="button" onClick={() => onShowPage(group.page)} className={nav + " border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}>
            Xem trong đề
          </button>
        )}
        <span className="ml-auto flex gap-2">
          <button type="button" onClick={onPrev || undefined} disabled={!onPrev} className={nav + " border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}>
            ← Câu trước
          </button>
          <button type="button" onClick={onNext || undefined} disabled={!onNext} className={nav + " border-primary-dark bg-primary text-gray-900 hover:bg-primary-dark"}>
            Câu tiếp theo →
          </button>
        </span>
      </div>
    </div>
  );
}
