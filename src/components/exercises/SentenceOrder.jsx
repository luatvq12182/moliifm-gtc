import { useState } from 'react'

function normalize(s) {
  return s.replace(/[，。！？、\s]/g, '')
}

export default function SentenceOrder({ questions, onFinish }) {
  const [current, setCurrent] = useState(0)
  const [picked, setPicked] = useState([])
  const [checked, setChecked] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)

  const q = questions[current]
  const isLast = current === questions.length - 1
  const remaining = q.words.filter((w, i) => !picked.includes(i))

  const pick = (index) => {
    if (checked) return
    setPicked((p) => [...p, index])
  }

  const removeLast = () => {
    if (checked) return
    setPicked((p) => p.slice(0, -1))
  }

  const check = () => {
    const built = picked.map((i) => q.words[i]).join('')
    const ok = normalize(built) === normalize(q.correctSentence)
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
    setPicked([])
    setChecked(false)
  }

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">
        Câu {current + 1}/{questions.length} — sắp xếp các từ thành câu đúng
      </p>

      <div className="min-h-[44px] border border-dashed border-gray-300 rounded-lg p-2 mb-3 flex flex-wrap gap-2">
        {picked.length === 0 && <span className="text-xs text-gray-400">Chạm vào từ bên dưới để thêm</span>}
        {picked.map((i, idx) => (
          <span key={idx} className="px-3 py-1 rounded-md bg-primary/30 text-sm">
            {q.words[i]}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {q.words.map((w, i) =>
          picked.includes(i) ? null : (
            <button
              key={i}
              onClick={() => pick(i)}
              className="px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 text-sm"
            >
              {w}
            </button>
          )
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <button
          onClick={removeLast}
          disabled={picked.length === 0 || checked}
          className="px-3 py-1 text-xs rounded-md border border-gray-300 disabled:opacity-40"
        >
          Xóa từ cuối
        </button>
      </div>

      {checked && (
        <div
          className={
            'rounded-lg p-3 mb-3 text-sm ' +
            (isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')
          }
        >
          {isCorrect ? 'Chính xác!' : `Chưa đúng — câu đúng là: ${q.correctSentence}`}
        </div>
      )}

      {!checked ? (
        <button
          onClick={check}
          disabled={picked.length !== q.words.length}
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
