import { useState } from "react";

export default function TrueFalse({ questions, onFinish }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(() =>
    Array(questions.length).fill(null),
  );
  const [submitted, setSubmitted] = useState(false);

  const q = questions[current];
  const answer = answers[current];
  const allAnswered = answers.every((a) => a !== null);
  const correctCount = answers.filter(
    (a, i) => a && a.value === questions[i].correct,
  ).length;

  const choose = (value) => {
    if (answer !== null) return;
    const next = [...answers];
    next[current] = { value };
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
    const wrong = questions
      .map((qq, i) => {
        const a = answers[i];
        if (a && a.value === qq.correct) return null;
        return {
          type: "Đúng / Sai",
          question: qq.statement,
          pinyin: qq.pinyin,
          yourAnswer: a ? (a.value ? "Đúng" : "Sai") : "(chưa trả lời)",
          correctAnswer: qq.correct ? "Đúng" : "Sai",
        };
      })
      .filter(Boolean);
    onFinish(correctCount, wrong);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {questions.map((_, i) => {
          const a = answers[i];
          const isCorrect = a && a.value === questions[i].correct;
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
      <p className="font-medium mb-1">{q.statement}</p>
      <p className="text-xs text-gray-500 mb-3">{q.pinyin}</p>

      <div className="flex gap-3 mb-3">
        {[true, false].map((value) => {
          const label = value ? "Đúng" : "Sai";
          let style = "border-gray-300 hover:bg-gray-50";
          if (answer !== null) {
            if (value === q.correct) style = "border-green-500 bg-green-50";
            else if (value === answer.value) style = "border-red-400 bg-red-50";
          }
          return (
            <button
              key={label}
              onClick={() => choose(value)}
              disabled={answer !== null}
              className={"flex-1 py-2 rounded-lg border font-medium " + style}
            >
              {label}
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
