/**
 * Thẻ điểm lớn: biểu tượng, số điểm, thanh tiến độ, chú thích.
 *
 * `value` null nghĩa là KHÔNG CHẤM (bài không có bài tập, hoặc chưa luyện nói
 * câu nào) — hiện dấu gạch chứ không hiện 0, vì "0 điểm" cho phần vốn không
 * tính điểm là báo sai cho học viên.
 */
export default function ScoreCard({ icon, label, value, note }) {
  const has = value !== null && value !== undefined;
  const tone = !has
    ? { text: "text-gray-300", bar: "bg-gray-200", soft: "bg-gray-50" }
    : value >= 80
      ? { text: "text-green-600", bar: "bg-green-500", soft: "bg-green-50" }
      : value >= 60
        ? { text: "text-amber-500", bar: "bg-amber-400", soft: "bg-amber-50" }
        : { text: "text-red-500", bar: "bg-red-400", soft: "bg-red-50" };

  return (
    <div className="flex-1 bg-white rounded-2xl border border-gray-200 p-4 flex gap-3.5">
      <span
        className={
          "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center " +
          tone.soft + " " + tone.text
        }
      >
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="mt-0.5">
          <span className={"text-3xl font-bold leading-none " + tone.text}>
            {has ? value : "—"}
          </span>
          <span className="text-xs text-gray-400 ml-1">/100 điểm</span>
        </p>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2.5">
          <div
            className={"h-full rounded-full transition-all " + tone.bar}
            style={{ width: `${has ? value : 0}%` }}
          />
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">{note}</p>
      </div>
    </div>
  );
}
