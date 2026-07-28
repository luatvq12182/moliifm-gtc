import { useState } from "react";

export default function MultipleChoice({ questions, onFinish }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(() =>
    Array(questions.length).fill(null),
  );
  const [submitted, setSubmitted] = useState(false);

  const q = questions[current];
  const answer = answers[current];
  const allAnswered = answers.every((a) => a !== null);
  const correctCount = answers.filter(
    (a, i) => a && a.selectedIndex === questions[i].correctIndex,
  ).length;

  const choose = (index) => {
    if (answer !== null) return;
    const next = [...answers];
    next[current] = { selectedIndex: index };
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
      {/* Dải số câu hỏi - bấm để nhảy tới xem lại bất kỳ câu nào đã làm */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {questions.map((_, i) => {
          const a = answers[i];
          const isCorrect = a && a.selectedIndex === questions[i].correctIndex;
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
                    : isCorrect
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

      <div className="space-y-2 mb-3">
        {q.options.map((opt, i) => {
          const isCorrectOpt = i === q.correctIndex;
          const isChosen = answer && i === answer.selectedIndex;
          let style = "border-gray-300 hover:bg-gray-50";
          if (answer !== null) {
            if (isCorrectOpt) style = "border-green-500 bg-green-50";
            else if (isChosen) style = "border-red-400 bg-red-50";
          }
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              disabled={answer !== null}
              className={
                "w-full text-left px-3 py-2 rounded-lg border " + style
              }
            >
              {String.fromCharCode(65 + i)}. {opt.hanzi}{" "}
              <span className="text-xs text-gray-500">({opt.pinyin})</span>
            </button>
          );
        })}
      </div>

      {answer !== null && !allAnswered && (
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
