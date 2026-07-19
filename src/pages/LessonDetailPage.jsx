import { useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { lesson1 } from '../data/lesson1.js'
import { lesson2 } from '../data/lesson2.js'
import AccordionSection from '../components/AccordionSection.jsx'
import LessonVideoPlayer from '../components/LessonVideoPlayer.jsx'
import VocabSection from '../components/VocabSection.jsx'
import ExerciseSection from '../components/ExerciseSection.jsx'
import SpeakingSection from '../components/SpeakingSection.jsx'
import ResultSection from '../components/ResultSection.jsx'

// Demo hiện chỉ có dữ liệu đầy đủ cho Bài 1 (bai-1). Các bài khác chưa có nội dung.
const LESSONS_DATA = {
  'bai-1': lesson1,
  'bai-2': lesson2,
}

export default function LessonDetailPage() {
  const { courseId, lessonId } = useParams()
  const lesson = LESSONS_DATA[lessonId]

  // completedCount = số phần đã hoàn thành (0-4).
  // Bước 1 (xem video) luôn hiển thị 1 cột, full width, bắt buộc xem hết 1 lượt.
  // Sau khi completedCount >= 1, layout chuyển sang 2 cột trên desktop: video
  // "dính" (sticky) bên trái để xem lại bất cứ lúc nào, nội dung còn lại bên phải.
  const [completedCount, setCompletedCount] = useState(0)
  const [openStep, setOpenStep] = useState(2)
  const [exerciseResult, setExerciseResult] = useState(null)
  const [speakingResult, setSpeakingResult] = useState(null)
  const [activeLineIndex, setActiveLineIndex] = useState(-1)
  const [hasWatchedOnce, setHasWatchedOnce] = useState(false)

  const videoRef = useRef(null)
  const finished = completedCount === 4

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600 mb-3">Bài học này chưa có nội dung trong bản demo.</p>
          <Link to={`/course/${courseId}`} className="text-primary-dark underline">
            Quay lại danh sách bài học
          </Link>
        </div>
      </div>
    )
  }

  const statusOf = (step) => {
    if (step > completedCount + 1) return 'locked'
    if (step === openStep) return 'active'
    if (step <= completedCount) return 'done'
    return 'active'
  }

  const goToStep = (step) => {
    if (step <= completedCount + 1) setOpenStep(step)
  }

  const completeStep = (step) => {
    setCompletedCount((c) => Math.max(c, step))
    setOpenStep(step + 1)
  }

  const requestPlaySegment = (start, end) => {
    videoRef.current?.playSegment(start, end)
  }

  const header = (
    <header className="bg-primary px-4 py-4">
      <Link to={`/course/${courseId}`} className="text-xs text-gray-800 underline">
        ← Danh sách bài học
      </Link>
      <h1 className="text-lg font-semibold text-gray-900 mt-1">{lesson.title}</h1>
    </header>
  )

  // Giai đoạn 1: chưa xem hết video lần nào -> 1 cột, chỉ có video + nút tiếp tục.
  if (completedCount < 1) {
    return (
      <div className="min-h-screen">
        {header}
        <main className="max-w-3xl mx-auto px-4 py-6">
          <AccordionSection stepNumber={1} title="Hội thoại" status="active" isOpen onToggle={() => {}}>
            <LessonVideoPlayer
              ref={videoRef}
              videoSrc={lesson.videoSrc}
              dialogue={lesson.dialogue}
              onActiveLineChange={setActiveLineIndex}
              onEnded={() => setHasWatchedOnce(true)}
            />
            <button
              disabled={!hasWatchedOnce}
              onClick={() => completeStep(1)}
              className={
                'w-full mt-3 py-2.5 rounded-lg font-medium ' +
                (hasWatchedOnce
                  ? 'bg-primary hover:bg-primary-dark text-gray-900'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed')
              }
            >
              {hasWatchedOnce ? 'Tiếp tục' : 'Xem hết video để tiếp tục'}
            </button>
          </AccordionSection>
        </main>
      </div>
    )
  }

  // Giai đoạn 2: đã xem video ít nhất 1 lần -> layout 2 cột trên desktop.
  return (
    <div className="min-h-screen">
      {header}
      <main className="w-full max-w-[1920px] mx-auto px-4 py-6 flex flex-col lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div className="lg:sticky lg:top-6 mb-6 lg:mb-0 animate-slide-in-left">
          <div className="bg-white rounded-xl border border-orange-200 p-3">
            <p className="text-xs text-gray-500 mb-2">Xem lại video bất cứ lúc nào</p>
            <LessonVideoPlayer
              ref={videoRef}
              videoSrc={lesson.videoSrc}
              dialogue={lesson.dialogue}
              onActiveLineChange={setActiveLineIndex}
              compact
            />
          </div>
        </div>

        <div className="animate-slide-in-right [animation-delay:120ms]">
          <AccordionSection
            stepNumber={2}
            title="Từ vựng & ngữ pháp mở rộng"
            subtitle={`${lesson.vocabulary.length} từ`}
            status={statusOf(2)}
            isOpen={openStep === 2}
            onToggle={() => goToStep(2)}
          >
            <VocabSection vocabulary={lesson.vocabulary} onComplete={() => completeStep(2)} />
          </AccordionSection>

          <AccordionSection
            stepNumber={3}
            title="Bài tập luyện tập"
            subtitle="4 dạng bài"
            status={statusOf(3)}
            isOpen={openStep === 3}
            onToggle={() => goToStep(3)}
          >
            <ExerciseSection
              exercises={lesson.exercises}
              onComplete={(result) => {
                setExerciseResult(result)
                completeStep(3)
              }}
            />
          </AccordionSection>

          <AccordionSection
            stepNumber={4}
            title="Luyện nói từng câu"
            subtitle="AI chấm điểm"
            status={statusOf(4)}
            isOpen={openStep === 4}
            onToggle={() => goToStep(4)}
          >
            <SpeakingSection
              dialogue={lesson.dialogue}
              activeLineIndex={activeLineIndex}
              onRequestPlaySegment={requestPlaySegment}
              onComplete={(result) => {
                setSpeakingResult(result)
                setCompletedCount(4)
                setOpenStep(5)
              }}
            />
          </AccordionSection>

          {finished && (
            <ResultSection
              exerciseResult={exerciseResult}
              speakingResult={speakingResult}
              courseId={courseId}
            />
          )}
        </div>
      </main>
    </div>
  )
}
