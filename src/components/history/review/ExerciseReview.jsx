import { useMemo, useState } from "react";
import { AnswerRow } from "../AttemptDetail.jsx";

/**
 * Xem lại bài tập — CHIA TAB THEO DẠNG BÀI, giống hệt lúc làm bài.
 *
 * Mỗi câu đã lưu kèm nhãn dạng bài ("Chọn đáp án đúng", "Đúng / Sai"...),
 * nên gom lại theo nhãn là ra đúng các tab học viên đã thấy. Thứ tự tab giữ
 * theo thứ tự xuất hiện, cũng chính là thứ tự lúc làm bài.
 *
 * Tab nào có câu sai thì gắn chấm đỏ — liếc qua là biết phải mở tab nào.
 */
export default function ExerciseReview({ exercise }) {
  const answers = useMemo(() => exercise?.answers || [], [exercise]);

  const groups = useMemo(() => {
    const map = new Map();
    answers.forEach((a, i) => {
      const key = a.type || "Bài tập";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ answer: a, index: i });
    });
    return Array.from(map, ([type, items]) => ({
      type,
      items,
      wrong: items.filter((x) => !x.answer.correct).length,
    }));
  }, [answers]);

  const [active, setActive] = useState(null);
  const current = groups.find((g) => g.type === active) || groups[0];

  if (!exercise?.total) {
    return <p className="text-sm text-gray-500">Phần này không có bài tập.</p>;
  }

  // Bản ghi cũ chỉ lưu câu SAI (trước khi đổi sang lưu cả bài) — nói rõ để
  // học viên không tưởng mình chỉ làm có mấy câu.
  const partial = answers.length < exercise.total;

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {groups.map((g) => (
          <button
            key={g.type}
            type="button"
            onClick={() => setActive(g.type)}
            className={
              "relative px-3 py-1.5 text-xs rounded-md border " +
              (current?.type === g.type
                ? "bg-primary border-primary-dark font-medium"
                : g.wrong === 0
                  ? "border-green-400 bg-green-50 text-green-700"
                  : "border-gray-300 hover:bg-gray-50")
            }
          >
            {g.wrong === 0 ? "✓ " : ""}
            {g.type}
            <span className="ml-1 opacity-60">
              {g.items.length - g.wrong}/{g.items.length}
            </span>
            {g.wrong > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>
        ))}
      </div>

      {current && (
        <ol className="space-y-2">
          {current.items.map(({ answer, index }) => (
            <AnswerRow key={index} answer={answer} index={index} />
          ))}
        </ol>
      )}

      {partial && (
        <p className="text-[11px] text-gray-400 mt-3">
          Lượt học này được lưu trước khi hệ thống ghi đủ cả bài, nên chỉ còn
          các câu làm sai.
        </p>
      )}
    </div>
  );
}
