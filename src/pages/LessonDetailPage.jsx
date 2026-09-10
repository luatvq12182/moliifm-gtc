import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLessonPublicQuery } from "../hooks/usePublicCatalog.js";
import {
  flattenLessonDialogue,
  resolveVideoContent,
  EXERCISE_TYPES,
} from "../lib/lessonVideos.js";
import SiteHeader from "../components/SiteHeader.jsx";
import AccordionSection from "../components/AccordionSection.jsx";
import LessonVideoPlayer from "../components/LessonVideoPlayer.jsx";
import VocabSection from "../components/VocabSection.jsx";
import ExerciseSection from "../components/ExerciseSection.jsx";
import SpeakingSection from "../components/SpeakingSection.jsx";
import TranslationSection from "../components/TranslationSection.jsx";
import ResultSection from "../components/ResultSection.jsx";

const STEPS_PER_VIDEO = 4;

// Tiến độ của MỘT video. Mỗi video là một mạch 4 bước độc lập.
const EMPTY_PROGRESS = {
  completedCount: 0,
  openStep: 1,
  exerciseResult: null,
  speakingResult: null,
};

export default function LessonDetailPage() {
  const { curriculumSlug, courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const {
    data: lesson,
    isLoading,
    isError,
    error,
  } = useLessonPublicQuery(curriculumSlug, courseId, lessonId);

  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(-1);

  // Tiến độ giữ THEO TỪNG VIDEO: { [videoIndex]: EMPTY_PROGRESS }.
  //
  // Trước đây chỉ có một bộ đếm duy nhất cho cả bài, vì từ vựng và bài tập dùng
  // chung. Nay mỗi video có nội dung riêng nên cũng phải có tiến độ riêng —
  // xong bài tập của video 1 không có nghĩa là xong bài tập của video 2.
  const [progressByVideo, setProgressByVideo] = useState({});

  const videoRef = useRef(null);
  const pendingSegmentRef = useRef(null);

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

  const videos = Array.isArray(lesson.videos) ? lesson.videos : [];
  const activeVideo = videos[activeVideoIndex];

  // Nội dung DÀNH RIÊNG cho video đang xem (có cơ chế lùi về cấp bài học cho
  // dữ liệu cũ) — xem lib/lessonVideos.js.
  const content = resolveVideoContent(lesson, activeVideoIndex);
  // Đếm số DẠNG bài thực sự có câu hỏi, để nhãn không nói "4 dạng bài" khi
  // video chỉ có 2. Lấy danh sách dạng từ lessonVideos.js — thêm dạng mới cho
  // khoá HSK 3/4 chỉ phải khai báo ở đúng một chỗ.
  const exerciseTypeCount = EXERCISE_TYPES.filter(
    (k) => Array.isArray(content.exercises[k]) && content.exercises[k].length > 0,
  ).length;

  // Giữ nguyên hình dạng mà SpeakingSection trông đợi (videoIndex/localIndex/
  // videoTitle), chỉ lọc lại còn đúng video đang xem.
  const videoDialogue = flattenLessonDialogue(videos).filter(
    (line) => line.videoIndex === activeVideoIndex,
  );

  const progressOf = (index) => progressByVideo[index] || EMPTY_PROGRESS;
  const current = progressOf(activeVideoIndex);
  const isVideoDone = (index) => progressOf(index).completedCount >= STEPS_PER_VIDEO;

  const patchCurrent = (patch) =>
    setProgressByVideo((all) => ({
      ...all,
      [activeVideoIndex]: { ...progressOf(activeVideoIndex), ...patch },
    }));

  const statusOf = (step) => {
    if (step > current.completedCount + 1) return "locked";
    if (step === current.openStep) return "active";
    if (step <= current.completedCount) return "done";
    return "active";
  };

  const goToStep = (step) => {
    if (step <= current.completedCount + 1) patchCurrent({ openStep: step });
  };

  const completeStep = (step) => {
    patchCurrent({
      completedCount: Math.max(current.completedCount, step),
      openStep: step + 1,
    });
  };

  const requestPlaySegment = (videoIndex, start, end) => {
    if (videoIndex === activeVideoIndex) {
      videoRef.current?.playSegment(start, end);
    } else {
      pendingSegmentRef.current = { start, end };
      setActiveVideoIndex(videoIndex);
    }
  };

  // Bài học xong khi ĐI HẾT MỌI VIDEO. Một huy chương cho cả bài, điểm gộp từ
  // tất cả các video.
  const lessonFinished = videos.length > 0 && videos.every((_, i) => isVideoDone(i));
  const nextUnfinishedIndex = videos.findIndex((_, i) => !isVideoDone(i));

  // Gộp điểm bài tập: cộng dồn số câu đúng và tổng số câu của mọi video, rồi
  // mới quy ra thang 100. KHÔNG lấy trung bình các tỉ lệ phần trăm — video 2
  // câu và video 20 câu mà cân bằng nhau thì con số vô nghĩa.
  const exerciseTotals = videos.reduce(
    (acc, _, i) => {
      const r = progressOf(i).exerciseResult;
      return r ? { correct: acc.correct + r.correct, total: acc.total + r.total } : acc;
    },
    { correct: 0, total: 0 },
  );
  const exerciseScore =
    exerciseTotals.total > 0
      ? Math.round((exerciseTotals.correct / exerciseTotals.total) * 100)
      : null;

  const speakingScores = videos
    .map((_, i) => progressOf(i).speakingResult?.avgScore)
    .filter((n) => typeof n === "number");
  const pronunciationScore =
    speakingScores.length > 0
      ? Math.round(speakingScores.reduce((a, b) => a + b, 0) / speakingScores.length)
      : null;

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
                        : isVideoDone(i)
                          ? "border-green-400 bg-green-50 text-green-700"
                          : "border-gray-300 hover:bg-gray-50")
                    }
                  >
                    {isVideoDone(i) ? "✓ " : ""}
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
          {/* Bốn phần dưới đây dựng LẠI TỪ ĐẦU mỗi khi đổi video (key =
              activeVideoIndex). Bắt buộc: chúng tự giữ đáp án bên trong, dùng
              chung một thể hiện thì đáp án của video này lẫn sang video kia.
              Đánh đổi đã biết: phần đang làm dở sẽ mất khi chuyển video, nhưng
              dạng bài đã HOÀN THÀNH thì kết quả được trang này giữ lại. */}
          <AccordionSection
            stepNumber={1}
            title="Bài tập luyện tập"
            subtitle={exerciseTypeCount > 0 ? `${exerciseTypeCount} dạng bài` : "Chưa có"}
            status={statusOf(1)}
            isOpen={current.openStep === 1}
            onToggle={() => goToStep(1)}
          >
            <ExerciseSection
              key={activeVideoIndex}
              exercises={content.exercises}
              onComplete={(result) => {
                patchCurrent({ exerciseResult: result });
                completeStep(1);
              }}
            />
          </AccordionSection>

          <AccordionSection
            stepNumber={2}
            title="Từ vựng & ngữ pháp mở rộng"
            subtitle={`${content.vocabulary.length} từ`}
            status={statusOf(2)}
            isOpen={current.openStep === 2}
            onToggle={() => goToStep(2)}
          >
            <VocabSection
              key={activeVideoIndex}
              vocabulary={content.vocabulary}
              onComplete={() => completeStep(2)}
            />
          </AccordionSection>

          <AccordionSection
            stepNumber={3}
            title="Luyện nói từng câu"
            subtitle="AI chấm điểm"
            status={statusOf(3)}
            isOpen={current.openStep === 3}
            onToggle={() => goToStep(3)}
          >
            <SpeakingSection
              key={activeVideoIndex}
              dialogue={videoDialogue}
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
                patchCurrent({ speakingResult: result });
                completeStep(3);
              }}
            />
          </AccordionSection>

          <AccordionSection
            stepNumber={4}
            title="Bản dịch tiếng Việt"
            subtitle={`${videoDialogue.length} câu`}
            status={statusOf(4)}
            isOpen={current.openStep === 4}
            onToggle={() => goToStep(4)}
          >
            <TranslationSection
              key={activeVideoIndex}
              videos={activeVideo ? [activeVideo] : []}
              onComplete={() => completeStep(4)}
            />
          </AccordionSection>

          {/* Xong video này nhưng bài chưa xong -> chỉ đường sang video tiếp
              theo. Không có mục này thì học viên làm hết 4 bước rồi ngồi nhìn
              màn hình không có gì xảy ra, tưởng hỏng. */}
          {isVideoDone(activeVideoIndex) && !lessonFinished && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <p className="text-sm text-green-800 mb-3">
                Xong{" "}
                <span className="font-medium">
                  {activeVideo?.title || `video ${activeVideoIndex + 1}`}
                </span>
                . Còn {videos.filter((_, i) => !isVideoDone(i)).length} video nữa là
                hoàn thành bài học.
              </p>
              <button
                onClick={() => setActiveVideoIndex(nextUnfinishedIndex)}
                className="px-5 py-2 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
              >
                Sang{" "}
                {videos[nextUnfinishedIndex]?.title ||
                  `video ${nextUnfinishedIndex + 1}`}
              </button>
            </div>
          )}

          {lessonFinished && (
            <ResultSection
              lessonOrder={lesson.order}
              exerciseScore={exerciseScore}
              pronunciationScore={pronunciationScore}
              exerciseCorrect={exerciseTotals.total > 0 ? exerciseTotals.correct : undefined}
              exerciseTotal={exerciseTotals.total > 0 ? exerciseTotals.total : undefined}
              onBackToList={() => navigate(backToLessonsLink)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
