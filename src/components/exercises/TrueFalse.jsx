import { useState } from 'react'

export default function TrueFalse({ questions, onFinish }) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)

  const q = questions[current]
  const isLast = current === questions.length - 1

  const choose = (value) => {
    if (selected !== null) return
    setSelected(value)
    if (value === q.correct) setCorrectCount((c) => c + 1)
  }

  const next = () => {
    if (isLast) {
      onFinish(correctCount)
      return
    }
    setCurrent((c) => c + 1)
    setSelected(null)
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">
        Câu {current + 1}/{questions.length}
      </p>
      <p className="font-medium mb-1">{q.statement}</p>
      <p className="text-xs text-gray-500 mb-3">{q.pinyin}</p>

      <div className="flex gap-3 mb-3">
        {[true, false].map((value) => {
          const label = value ? 'Đúng' : 'Sai'
          let style = 'border-gray-300 hover:bg-gray-50'
          if (selected !== null) {
            if (value === q.correct) style = 'border-green-500 bg-green-50'
            else if (value === selected) style = 'border-red-400 bg-red-50'
          }
          return (
            <button
              key={label}
              onClick={() => choose(value)}
              className={'flex-1 py-2 rounded-lg border font-medium ' + style}
            >
              {label}
            </button>
          )
        })}
      </div>

      {selected !== null && (
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
