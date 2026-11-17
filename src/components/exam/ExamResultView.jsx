import { useState } from "react";

/**
 * Kết quả một bài luyện thi (dùng chung cho học viên và trang quản trị):
 * điểm tổng / từng phần, rồi từng câu đúng sai kèm đáp án; câu đặt câu kèm
 * điểm AI cho (vd. 8/10), nhận xét, câu sửa, câu mẫu.
 *
 * @param result   kết quả máy chủ chấm (attempt.result)
 * @param groups   cấu trúc phiếu trả lời của bài
 * @param onRegrade (tuỳ chọn) nút "Chấm lại" khi AI lỗi / hết lượt
 */
const SECTION_LABEL = { listening: "Nghe", reading: "Đọc", writing: "Viết" };
const VERDICT = {
  dat: { label: "Đạt", cls: "bg-green-100 text-green-800" },
  gan_dat: { label: "Gần đạt", cls: "bg-amber-100 text-amber-800" },
  chua_dat: { label: "Chưa đạt", cls: "bg-red-100 text-red-700" },
  blank: { label: "Bỏ trống", cls: "bg-gray-100 text-gray-500" },
};
const AI_NOTE = {
  pending: "AI đang chấm phần đặt câu — điểm tổng đang tạm tính, đợi vài giây…",
  error: "AI chưa chấm được phần đặt câu (dịch vụ AI lỗi). Điểm đặt câu chưa được tính.",
  limited: "Hôm nay bạn đã dùng hết lượt AI chấm. Điểm đặt câu chưa được tính — thử chấm lại vào ngày mai.",
  unavailable: "Phần đặt câu chưa có AI chấm — so với câu mẫu để tự kiểm tra. Điểm đặt câu chưa được tính.",
};

export default function ExamResultView({ result, groups, onRegrade, regrading = false }) {
  const [onlyWrong, setOnlyWrong] = useState(false);
  if (!result) return <p className="text-sm text-gray-500 py-8 text-center">Đang chấm bài…</p>;
  const ai = result.ai?.status || "none";
  const sections = Object.keys(SECTION_LABEL).filter((s) => result.sections[s]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-orange-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-500">Tổng điểm{ai === "pending" && " (tạm tính)"}</p>
            <p className="text-3xl font-heading font-bold text-gray-900">
              {result.total}
              <span className="text-lg font-medium text-gray-400">/{result.max}</span>
            </p>
          </div>
          <span className={"ml-auto text-sm font-semibold px-3 py-1.5 rounded-full " + (result.passed ? "bg-green-100 text-green-800" : "bg-red-50 text-red-700")}>
            {result.passed ? "Đạt" : "Chưa đạt"} (đỗ từ {result.passScore} điểm)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {sections.map((s) => {
            const x = result.sections[s];
            return (
              <div key={s} className="rounded-xl bg-orange-50/60 px-3 py-2">
                <p className="text-xs text-gray-500">{SECTION_LABEL[s]}</p>
                <p className="text-lg font-semibold text-gray-900">
                  {x.score}
                  <span className="text-xs font-normal text-gray-400">/{x.max}</span>
                </p>
                <div className="h-1.5 rounded-full bg-orange-100 overflow-hidden mt-1">
                  <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${x.max ? (x.score / x.max) * 100 : 0}%` }} />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  {x.correct}/{x.total} câu {s === "writing" ? "đúng / đạt" : "đúng"}
                </p>
              </div>
            );
          })}
        </div>
        {AI_NOTE[ai] && (
          <div className={"mt-3 text-sm rounded-lg px-3 py-2 flex flex-wrap items-center gap-2 " + (ai === "pending" ? "bg-amber-50 text-amber-800" : "bg-gray-50 text-gray-600")}>
            <span className="flex-1">{AI_NOTE[ai]}</span>
            {onRegrade && ["error", "limited"].includes(ai) && (
              <button type="button" onClick={onRegrade} disabled={regrading} className="text-sm font-medium px-3 py-1.5 rounded-full border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50">
                {regrading ? "Đang gửi…" : "Chấm lại phần đặt câu"}
              </button>
            )}
          </div>
        )}
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={onlyWrong} onChange={(e) => setOnlyWrong(e.target.checked)} />
        Chỉ xem câu sai / chưa đạt
      </label>

      {sections.map((s) => (
        <section key={s}>
          <h3 className="font-heading font-semibold text-gray-900 mb-2">
            {SECTION_LABEL[s]} <span className="text-sm font-normal text-gray-500">· {result.sections[s].score}/{result.sections[s].max} điểm</span>
          </h3>
          <div className="space-y-4">
            {groups
              .filter((g) => g.section === s)
              .map((g) => (
                <GroupResult key={g.from} group={g} items={result.items} onlyWrong={onlyWrong} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// Đặt câu: bài chấm theo điểm có `ok` (từ 60% điểm tối đa); bài cũ chấm theo mức thì xét mức "đạt".
const isWrong = (it) => (it.type === "sentence" && it.score === undefined ? it.verdict !== "dat" : !it.ok);

function GroupResult({ group, items, onlyWrong }) {
  const nos = Array.from({ length: group.to - group.from + 1 }, (_, i) => group.from + i).filter((n) => items[n] && (!onlyWrong || isWrong(items[n])));
  if (nos.length === 0) return null;
  return (
    <div>
      <p className="text-sm text-gray-600 mb-1.5">
        Câu {group.from}–{group.to}
        {group.title && ` · ${group.title}`}
      </p>
      {group.type === "sentence" ? (
        <div className="space-y-2">
          {nos.map((no) => (
            <SentenceResult key={no} no={no} item={items[no]} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
          {nos.map((no) => {
            const it = items[no];
            return (
              <div
                key={no}
                className={"rounded-lg border px-2.5 py-1.5 text-sm flex items-center gap-1.5 " + (it.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50")}
                title={it.ok ? "Đúng" : `Sai — đáp án: ${it.correct}`}
              >
                <span className="text-gray-500 w-6 shrink-0">{no}.</span>
                <span className={"font-semibold " + (it.ok ? "text-green-800" : "text-red-700 line-through")}>{it.given || "—"}</span>
                {!it.ok && <span className="font-semibold text-green-800">→ {it.correct}</span>}
                <span className="ml-auto">{it.ok ? "✓" : "✗"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Nhãn điểm câu đặt câu: "8/10" (xanh / vàng / đỏ theo tỉ lệ), "Bỏ trống", "Chờ chấm"; bài cũ chấm theo mức thì hiện mức. */
function sentenceBadge(item) {
  if (item.score === undefined) {
    const v = VERDICT[item.verdict];
    return { text: `${v ? v.label : "Chờ chấm"} · ${item.points} điểm`, cls: v ? v.cls : "bg-gray-100 text-gray-500" };
  }
  if (item.blank) return { text: `Bỏ trống · 0/${item.max}`, cls: VERDICT.blank.cls };
  if (item.score === null) return { text: "Chờ AI chấm", cls: "bg-gray-100 text-gray-500" };
  const r = item.max ? item.score / item.max : 0;
  return { text: `${item.score}/${item.max} điểm`, cls: r >= 0.8 ? VERDICT.dat.cls : r >= 0.5 ? VERDICT.gan_dat.cls : VERDICT.chua_dat.cls };
}

function SentenceResult({ no, item }) {
  const badge = sentenceBadge(item);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-500">{no}. Dùng từ:</span>
        <span className="font-semibold text-gray-900">{item.keyword}</span>
        <span className={"ml-auto text-xs font-semibold px-2 py-0.5 rounded-full " + badge.cls}>{badge.text}</span>
      </div>
      {item.given && <p className="mt-1.5 text-base text-gray-900">{item.given}</p>}
      {item.comment && <p className="mt-1 text-sm text-gray-600">{item.comment}</p>}
      {item.corrected && item.corrected !== item.given && (
        <p className="mt-1 text-sm">
          <span className="text-gray-500">Câu sửa: </span>
          <span className="text-green-800">{item.corrected}</span>
        </p>
      )}
      {item.sample && (
        <p className="mt-0.5 text-sm">
          <span className="text-gray-500">Đáp án tham khảo: </span>
          <span className="text-gray-800">{item.sample}</span>
        </p>
      )}
    </div>
  );
}
