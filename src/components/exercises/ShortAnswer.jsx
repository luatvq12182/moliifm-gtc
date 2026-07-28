import { useState, useEffect } from "react";

function normalize(s) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[，。！？、\s]/g, "")
    .toLowerCase();
}

export default function ShortAnswer({ questions, onFinish }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(() =>
    Array(questions.length).fill(null),
  ); // {value, isCorrect}
  const [value, setValue] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const q = questions[current];
  const answer = answers[current];
  const checked = answer !== null;
  const allAnswered = answers.every((a) => a !== null);
  const correctCount = answers.filter((a) => a && a.isCorrect).length;

  useEffect(() => {
    setValue(answer ? answer.value : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const check = () => {
    const isCorrect = q.acceptedAnswers.some(
      (a) => normalize(a) === normalize(value),
    );
    const next = [...answers];
    next[current] = { value, isCorrect };
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
        Câu {current + 1}/{questions.length}
      </p>
      <p className="font-medium mb-1">{q.question}</p>
      <p className="text-xs text-gray-500 mb-3">{q.pinyin}</p>

      <input
        type="text"
        value={value}
        disabled={checked}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Nhập câu trả lời bằng chữ Hán hoặc pinyin"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 disabled:bg-gray-100"
      />

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
            : `Đáp án tham khảo: ${q.acceptedAnswers[0]}`}
        </div>
      )}

      {!checked && (
        <button
          onClick={check}
          disabled={value.trim() === ""}
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
