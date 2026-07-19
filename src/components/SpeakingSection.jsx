import { useState, useRef, useEffect } from 'react'
import { assessPronunciation } from '../lib/azureSpeech.js'

function wordColor(errorType) {
  if (errorType === 'Mispronunciation') return 'text-amber-600 bg-amber-50'
  if (errorType === 'Omission' || errorType === 'Insertion') return 'text-red-600 bg-red-50'
  return 'text-green-700 bg-green-50'
}

// Danh sách toàn bộ câu thoại (giống transcript), mỗi câu có:
// - nút phát lại đúng đoạn đó trên video (cột trái, qua onRequestPlaySegment)
// - nút ghi âm để AI (Azure) chấm điểm phát âm
// - dòng đang được video phát (activeLineIndex) tự động highlight
export default function SpeakingSection({ dialogue, activeLineIndex, onRequestPlaySegment, onComplete }) {
  const [showDetails, setShowDetails] = useState(false)
  const [recordingIndex, setRecordingIndex] = useState(null)
  const [results, setResults] = useState({}) // { [index]: {accuracy, fluency, completeness, pronScore, words} }
  const [errors, setErrors] = useState({}) // { [index]: message }

  // Lưu DOM node của từng dòng theo index, để tự cuộn tới dòng đang phát
  const lineRefs = useRef({})  

  useEffect(() => {
    const el = lineRefs.current[activeLineIndex]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [activeLineIndex])  

  const record = async (index, line) => {
    setRecordingIndex(index)
    setErrors((e) => ({ ...e, [index]: undefined }))
    try {
      const r = await assessPronunciation(line.hanzi)
      setResults((res) => ({ ...res, [index]: r }))
    } catch (e) {
      setErrors((er) => ({ ...er, [index]: typeof e === 'string' ? e : 'Có lỗi xảy ra, thử lại nhé.' }))
    } finally {
      setRecordingIndex(null)
    }
  }

  const attemptedCount = Object.keys(results).length
  const allAttempted = attemptedCount === dialogue.length

  const finish = () => {
    const scores = Object.values(results).map((r) => r.pronScore)
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0
    onComplete({ avgScore: avg, lineScores: scores })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">
          Đã luyện: {attemptedCount}/{dialogue.length} câu
        </p>
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="px-3 py-1 text-xs rounded-md border border-gray-300 hover:bg-gray-50"
        >
          {showDetails ? 'Ẩn phiên âm & dịch' : 'Hiện phiên âm & dịch'}
        </button>
      </div>

      <div className="space-y-2 max-h-[28rem] overflow-y-auto pr-1 mb-4">
        {dialogue.map((line, index) => {
          const isActive = index === activeLineIndex
          const result = results[index]
          const error = errors[index]
          const isRecording = recordingIndex === index

          const accuracyScore = Math.ceil(result?.accuracy / 4)
          const fluencyScore = Math.ceil(result?.fluency / 4)
          const completenessScore = Math.ceil(result?.completeness / 4)
          const totalScore = Math.ceil(accuracyScore + fluencyScore + completenessScore) // result.pronScore

          return (
            <div
              key={index}
              ref={(el) => (lineRefs.current[index] = el)}
              className={
                'rounded-lg border p-3 transition ' +
                (isActive ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white')
              }
            >
              <div className="flex items-start gap-2">
                <button
                  onClick={() => onRequestPlaySegment(line.startTime, line.endTime)}
                  title="Nghe lại câu này"
                  className="mt-0.5 shrink-0 w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <PlayIcon />
                </button>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{line.hanzi}</p>
                  {showDetails && (
                    <>
                      <p className="text-xs text-gray-500 mt-0.5">{line.pinyin}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{line.vi}</p>
                    </>
                  )}
                </div>

                <button
                  onClick={() => record(index, line)}
                  disabled={isRecording}
                  title="Ghi âm"
                  className={
                    'mt-0.5 shrink-0 w-7 h-7 rounded-full flex items-center justify-center border ' +
                    (isRecording
                      ? 'border-primary bg-primary/30'
                      : result
                      ? 'border-green-400 bg-green-100'
                      : 'border-gray-300 hover:bg-gray-50')
                  }
                >
                  <MicIcon />
                </button>
              </div>

              {error && <p className="text-xs text-red-600 mt-2">{error}</p>}

              {result && (
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <div className="flex flex-wrap gap-2 mb-1.5">
                    <ScoreTag label="Tổng" value={totalScore} />
                    <ScoreTag label="Chính xác" value={accuracyScore} />
                    <ScoreTag label="Trôi chảy" value={fluencyScore} />
                    <ScoreTag label="Hoàn chỉnh" value={completenessScore} />
                  </div>
                  {result.words?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {result.words.map((w, i) => (
                        <span
                          key={i}
                          className={'px-1.5 py-0.5 rounded text-xs ' + wordColor(w.PronunciationAssessment?.ErrorType)}
                        >
                          {w.Word}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        onClick={finish}
        disabled={!allAttempted}
        className="w-full py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900 disabled:opacity-40"
      >
        {allAttempted ? 'Hoàn thành bài học' : `Luyện hết ${dialogue.length} câu để hoàn thành`}
      </button>
    </div>
  )
}

function ScoreTag({ label, value }) {
  return (
    <span className="text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
      {label}: <span className="font-medium">{value}</span>
    </span>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5,3 19,12 5,21" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10v1a7 7 0 0014 0v-1M12 18v3" />
    </svg>
  )
}
