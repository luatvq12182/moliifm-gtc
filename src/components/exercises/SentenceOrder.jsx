import { useState, useEffect } from "react";

function normalize(s) {
  return s.replace(/[，。！？、\s]/g, "");
}

export default function SentenceOrder({ questions, onFinish }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(() =>
    Array(questions.length).fill(null),
  ); // {picked, isCorrect}
  const [picked, setPicked] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  const q = questions[current]
  const answer = answers[current]
  const checked = answer !== null

  // Lọc bỏ mọi chỉ số không hợp lệ với câu hiện tại (phòng khi picked còn
  // sót chỉ số của câu trước trong tích tắc trước khi useEffect kịp reset).
  const safePicked = picked.filter((i) => q.words[i] !== undefined)
  const allAnswered = answers.every((a) => a !== null);
  const correctCount = answers.filter((a) => a && a.isCorrect).length;

  // Đổi câu: nếu câu đó đã chấm rồi, hiện lại đúng thứ tự đã chọn; chưa thì rỗng
  useEffect(() => {
    setPicked(answer ? answer.picked : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const pick = (index) => {
    if (checked) return;
    setPicked((p) => [...p, index]);
  };

  const removeLast = () => {
    if (checked) return;
    setPicked((p) => p.slice(0, -1));
  };

  const check = () => {
    const built = picked.map((i) => q.words[i].hanzi).join("");
    const isCorrect = normalize(built) === normalize(q.correctSentence);
    const next = [...answers];
    next[current] = { picked, isCorrect };
    setAnswers(next);
  };

  const goTo = (index) => setCurrent(index);

  const next = () => {
    const nextUnanswered = answers.findIndex(
      (a, i) => i > current && a === null,
    );
    if (nextUnanswered !== -1) setCurrent(nextUnanswered);
    else if (current < questions.length - 1) setCurrent(current + 1);
  };

  const finishSection = () => {
    setSubmitted(true);
    onFinish(correctCount);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {questions.map((_, i) => {
          const a = answers[i];
          return (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={
                "w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center border " +
                (i === current
                  ? "border-primary-dark bg-primary/30"
                  : a === null
                    ? "border-gray-300 text-gray-400"
                    : a.isCorrect
                      ? "border-green-400 bg-green-100 text-green-700"
                      : "border-red-300 bg-red-100 text-red-600")
              }
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500 mb-2">
        Câu {current + 1}/{questions.length} — sắp xếp các từ thành câu đúng
      </p>

      <div className="min-h-[56px] border border-dashed border-gray-300 rounded-lg p-2 mb-3 flex flex-wrap gap-2">
        {safePicked.length === 0 && (
          <span className="text-xs text-gray-400">
            Chạm vào từ bên dưới để thêm
          </span>
        )}
        {safePicked.map((i, idx) => {
          const w = q.words[i];
          if (!w) return null;
          return (
            <span
              key={idx}
              className="px-3 py-1.5 rounded-md bg-primary/30 text-sm text-center leading-tight"
            >
              <span className="block">{w.hanzi}</span>
              {w.pinyin && (
                <span className="block text-[10px] text-gray-500">
                  {w.pinyin}
                </span>
              )}
            </span>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {q.words.map((w, i) =>
          safePicked.includes(i) ? null : (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={checked}
              className="px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-50 text-sm text-center leading-tight disabled:opacity-40"
            >
              <span className="block">{w.hanzi}</span>
              {w.pinyin && (
                <span className="block text-[10px] text-gray-400">
                  {w.pinyin}
                </span>
              )}
            </button>
          ),
        )}
      </div>

      {!checked && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={removeLast}
            disabled={safePicked.length === 0}
            className="px-3 py-1 text-xs rounded-md border border-gray-300 disabled:opacity-40"
          >
            Xóa từ cuối
          </button>
        </div>
      )}

      {checked && (
        <div
          className={
            "rounded-lg p-3 mb-3 text-sm " +
            (answer.isCorrect
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700")
          }
        >
          {answer.isCorrect
            ? "Chính xác!"
            : `Chưa đúng — câu đúng là: ${q.correctSentence}`}
        </div>
      )}

      {!checked && (
        <button
          onClick={check}
          disabled={safePicked.length !== q.words.length}
          className="w-full py-2 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900 disabled:opacity-40"
        >
          Kiểm tra
        </button>
      )}

      {checked && !allAnswered && (
        <button
          onClick={next}
          className="w-full py-2 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
        >
          Câu tiếp theo
        </button>
      )}

      {allAnswered && !submitted && (
        <button
          onClick={finishSection}
          className="w-full py-2 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
        >
          Hoàn thành phần này
        </button>
      )}

      {submitted && (
        <p className="text-xs text-gray-400 text-center mt-2">
          Đã hoàn thành {questions.length}/{questions.length} câu — bấm vào số
          câu bên trên để xem lại.
        </p>
      )}
    </div>
  );
}
