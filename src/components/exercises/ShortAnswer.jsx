import { useState } from 'react'

function normalize(s) {
  return s.replace(/[，。！？、\s]/g, '').toLowerCase()
}

export default function ShortAnswer({ questions, onFinish }) {
  const [current, setCurrent] = useState(0)
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)

  const q = questions[current]
  const isLast = current === questions.length - 1

  const check = () => {
    const ok = q.acceptedAnswers.some((a) => normalize(a) === normalize(value))
    setIsCorrect(ok)
    setChecked(true)
    if (ok) setCorrectCount((c) => c + 1)
  }

  const next = () => {
    if (isLast) {
      onFinish(correctCount)
      return
    }
    setCurrent((c) => c + 1)
    setValue('')
    setChecked(false)
  }

  return (
    <div>
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
        placeholder="Nhập câu trả lời bằng chữ Hán"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 disabled:bg-gray-100"
      />

      {checked && (
        <div
          className={
            'rounded-lg p-3 mb-3 text-sm ' +
            (isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')
          }
        >
          {isCorrect ? 'Chính xác!' : `Đáp án tham khảo: ${q.acceptedAnswers[0]}`}
        </div>
      )}

      {!checked ? (
        <button
          onClick={check}
          disabled={value.trim() === ''}
          className="w-full py-2 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900 disabled:opacity-40"
        >
          Kiểm tra
        </button>
      ) : (
        <button
          onClick={next}
          className="w-full py-2 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
        >
          {isLast ? 'Hoàn thành phần này' : 'Câu tiếp theo'}
        </button>
      )}
    </div>
  )
}
