import { useState } from 'react'
import MultipleChoice from './exercises/MultipleChoice.jsx'
import TrueFalse from './exercises/TrueFalse.jsx'
import SentenceOrder from './exercises/SentenceOrder.jsx'
import ShortAnswer from './exercises/ShortAnswer.jsx'

const TABS = [
  { key: 'multipleChoice', label: 'Chọn đáp án đúng' },
  { key: 'trueFalse', label: 'Đúng / Sai' },
  { key: 'sentenceOrder', label: 'Sắp xếp câu' },
  { key: 'shortAnswer', label: 'Trả lời câu hỏi' },
]

export default function ExerciseSection({ exercises, onComplete }) {
  const [activeTab, setActiveTab] = useState('multipleChoice')
  const [results, setResults] = useState({})

  const totalQuestions = TABS.reduce((sum, t) => sum + exercises[t.key].length, 0)
  const totalCorrect = Object.values(results).reduce((sum, r) => sum + r, 0)
  const allDone = TABS.every((t) => results[t.key] !== undefined)

  const finishTab = (key, correctCount) => {
    setResults((r) => ({ ...r, [key]: correctCount }))
    const nextTab = TABS.find((t) => t.key !== key && results[t.key] === undefined)
    if (nextTab) setActiveTab(nextTab.key)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => {
          const done = results[t.key] !== undefined
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={
                'px-3 py-1.5 text-xs rounded-md border ' +
                (activeTab === t.key
                  ? 'bg-primary border-primary-dark font-medium'
                  : done
                  ? 'border-green-400 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:bg-gray-50')
              }
            >
              {done ? '✓ ' : ''}
              {t.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'multipleChoice' && (
        <MultipleChoice
          key="mc"
          questions={exercises.multipleChoice}
          onFinish={(c) => finishTab('multipleChoice', c)}
        />
      )}
      {activeTab === 'trueFalse' && (
        <TrueFalse key="tf" questions={exercises.trueFalse} onFinish={(c) => finishTab('trueFalse', c)} />
      )}
      {activeTab === 'sentenceOrder' && (
        <SentenceOrder
          key="so"
          questions={exercises.sentenceOrder}
          onFinish={(c) => finishTab('sentenceOrder', c)}
        />
      )}
      {activeTab === 'shortAnswer' && (
        <ShortAnswer
          key="sa"
          questions={exercises.shortAnswer}
          onFinish={(c) => finishTab('shortAnswer', c)}
        />
      )}

      {allDone && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-3">
            Kết quả luyện tập: {totalCorrect}/{totalQuestions} câu đúng
          </p>
          <button
            onClick={() => onComplete({ correct: totalCorrect, total: totalQuestions })}
            className="w-full py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
          >
            Tiếp tục sang luyện nói
          </button>
        </div>
      )}
    </div>
  )
}
