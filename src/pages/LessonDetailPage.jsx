import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLessonPublicQuery } from "../hooks/usePublicCatalog.js";
import { flattenLessonDialogue } from "../lib/lessonVideos.js";
import SiteHeader from "../components/SiteHeader.jsx";
import AccordionSection from "../components/AccordionSection.jsx";
import LessonVideoPlayer from "../components/LessonVideoPlayer.jsx";
import VocabSection from "../components/VocabSection.jsx";
import ExerciseSection from "../components/ExerciseSection.jsx";
import SpeakingSection from "../components/SpeakingSection.jsx";
import TranslationSection from "../components/TranslationSection.jsx";
import ResultSection from "../components/ResultSection.jsx";

export default function LessonDetailPage() {
  const { curriculumSlug, courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const {
    data: lesson,
    isLoading,
    isError,
    error,
  } = useLessonPublicQuery(curriculumSlug, courseId, lessonId);

  const [completedCount, setCompletedCount] = useState(0);
  const [openStep, setOpenStep] = useState(1);
  const [exerciseResult, setExerciseResult] = useState(null);
  const [speakingResult, setSpeakingResult] = useState(null);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);

  const videoRef = useRef(null);
  const pendingSegmentRef = useRef(null);
  const finished = completedCount === 4;

  const backToLessonsLink = `/nghe-noi-video-ai/curriculum/${curriculumSlug}/course/${courseId}`;

  useEffect(() => {
    setActiveLineIndex(-1);
  }, [activeVideoIndex]);

  useEffect(() => {
    if (pendingSegmentRef.current) {
      const { start, end } = pendingSegmentRef.current;
      pendingSegmentRef.current = null;
      videoRef.current?.playSegment(start, end);
    }
  }, [activeVideoIndex]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <p className="text-sm text-gray-400">Đang tải nội dung bài học...</p>
      </div>
    );
  }

  if (isError || !lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600 mb-3">
            {isError ? error.message : "Không tìm thấy bài học này."}
          </p>
          <Link to={backToLessonsLink} className="text-primary-dark underline">
            Quay lại danh sách bài học
          </Link>
        </div>
      </div>
    );
  }

  const videos = lesson.videos || [];
  const activeVideo = videos[activeVideoIndex];
  const flatDialogue = flattenLessonDialogue(videos);

  // Quy đổi số câu đúng thành thang điểm 100 cho màn hình kết quả. Để null khi
  // chưa làm xong (hoặc bài không có câu hỏi nào) — thẻ kết quả sẽ hiện "--"
  // thay vì hiện 0 điểm gây hiểu nhầm.
  const exerciseScore =
    exerciseResult && exerciseResult.total > 0
      ? Math.round((exerciseResult.correct / exerciseResult.total) * 100)
      : null;

  const statusOf = (step) => {
    if (step > completedCount + 1) return "locked";
    if (step === openStep) return "active";
    if (step <= completedCount) return "done";
    return "active";
  };

  const goToStep = (step) => {
    if (step <= completedCount + 1) setOpenStep(step);
  };

  const completeStep = (step) => {
    setCompletedCount((c) => Math.max(c, step));
    setOpenStep(step + 1);
  };

  const requestPlaySegment = (videoIndex, start, end) => {
    if (videoIndex === activeVideoIndex) {
      videoRef.current?.playSegment(start, end);
    } else {
      pendingSegmentRef.current = { start, end };
      setActiveVideoIndex(videoIndex);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader
        backTo={backToLessonsLink}
        backLabel="Danh sách bài học"
        title={lesson.title}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div className="lg:sticky lg:top-6 mb-6 lg:mb-0">
          <div className="bg-white rounded-xl border border-gray-200 p-3">
            {videos.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {videos.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveVideoIndex(i)}
                    className={
                      "px-3 py-1.5 text-xs rounded-md border " +
                      (i === activeVideoIndex
                        ? "bg-primary border-primary-dark font-medium"
                        : "border-gray-300 hover:bg-gray-50")
                    }
                  >
                    {v.title || `Video ${i + 1}`}
                  </button>
                ))}
              </div>
            )}

            {activeVideo && (
              <LessonVideoPlayer
                ref={videoRef}
                videoType={activeVideo.type}
                videoSrc={activeVideo.videoUrl}
                youtubeId={activeVideo.youtubeId}
                dialogue={activeVideo.dialogue}
                onActiveLineChange={setActiveLineIndex}
              />
            )}
          </div>
        </div>

        <div>
          <AccordionSection
            stepNumber={1}
            title="Bài tập luyện tập"
            subtitle="4 dạng bài"
            status={statusOf(1)}
            isOpen={openStep === 1}
            onToggle={() => goToStep(1)}
          >
            <ExerciseSection
              exercises={lesson.exercises}
              onComplete={(result) => {
                setExerciseResult(result);
                completeStep(1);
              }}
            />
          </AccordionSection>

          <AccordionSection
            stepNumber={2}
            title="Từ vựng & ngữ pháp mở rộng"
            subtitle={`${lesson.vocabulary.length} từ`}
            status={statusOf(2)}
            isOpen={openStep === 2}
            onToggle={() => goToStep(2)}
          >
            <VocabSection
              vocabulary={lesson.vocabulary}
              // videos={videos}
              // onRequestPlaySegment={requestPlaySegment}
              onComplete={() => completeStep(2)}
            />
          </AccordionSection>

          <AccordionSection
            stepNumber={3}
            title="Luyện nói từng câu"
            subtitle="AI chấm điểm"
            status={statusOf(3)}
            isOpen={openStep === 3}
            onToggle={() => goToStep(3)}
          >
            <SpeakingSection
              dialogue={flatDialogue}
              activeVideoIndex={activeVideoIndex}
              activeLineIndex={activeLineIndex}
              lessonContext={{
                lessonId: lesson._id,
                lessonTitle: lesson.title,
                curriculumSlug,
                courseSlug: courseId,
                lessonSlug: lessonId,
              }}
              onRequestPlaySegment={requestPlaySegment}
              onComplete={(result) => {
                setSpeakingResult(result);
                completeStep(3);
              }}
            />
          </AccordionSection>

          <AccordionSection
            stepNumber={4}
            title="Bản dịch tiếng Việt"
            subtitle={`${flatDialogue.length} câu`}
            status={statusOf(4)}
            isOpen={openStep === 4}
            onToggle={() => goToStep(4)}
          >
            <TranslationSection
              videos={videos}
              onComplete={() => completeStep(4)}
            />
          </AccordionSection>

          {finished && (
            <ResultSection
              lessonOrder={lesson.order}
              exerciseScore={exerciseScore}
              pronunciationScore={speakingResult?.avgScore ?? null}
              exerciseCorrect={exerciseResult?.correct}
              exerciseTotal={exerciseResult?.total}
              onBackToList={() => navigate(backToLessonsLink)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
