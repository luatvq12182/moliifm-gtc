import { useState } from 'react'

export default function MultipleChoice({ questions, onFinish }) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [correctCount, setCorrectCount] = useState(0)

  const q = questions[current]
  const isLast = current === questions.length - 1

  const choose = (index) => {
    if (selected !== null) return
    setSelected(index)
    if (index === q.correctIndex) setCorrectCount((c) => c + 1)
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
      <p className="font-medium mb-1">{q.question}</p>
      <p className="text-xs text-gray-500 mb-3">{q.pinyin}</p>

      <div className="space-y-2 mb-3">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correctIndex
          const isChosen = i === selected
          let style = 'border-gray-300 hover:bg-gray-50'
          if (selected !== null) {
            if (isCorrect) style = 'border-green-500 bg-green-50'
            else if (isChosen) style = 'border-red-400 bg-red-50'
          }
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              className={'w-full text-left px-3 py-2 rounded-lg border ' + style}
            >
              {String.fromCharCode(65 + i)}. {opt.hanzi}{' '}
              <span className="text-xs text-gray-500">({opt.pinyin})</span>
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
