import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
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
import { useSaveLessonAttempt } from "../hooks/useLessonHistory.js";
import {
  RESUME_STATE,
  discardCurrentAttempt,
  useCurrentAttempt,
  useProgressSaver,
} from "../hooks/useLessonProgress.js";
import {
  STEPS_PER_VIDEO,
  countExercises,
  progressPercent,
  savedSpeakingByVideo,
} from "../lib/lessonProgress.js";

// Một video coi như xong khi đi hết 4 bước.
//
// Tách ra khỏi component vì có HAI chỗ cần biết: phần dựng giao diện, và
// effect chốt hoàn thành (effect phải khai báo trước các lệnh return sớm nên
// không dùng lại được hàm bên trong).
const videoDone = (progress, index) =>
  (progress[index]?.completedCount || 0) >= STEPS_PER_VIDEO;

// Tiến độ của MỘT video. Mỗi video là một mạch 4 bước độc lập.
const EMPTY_PROGRESS = {
  completedCount: 0,
  openStep: 1,
  exerciseResult: null,
  speakingResult: null,
};

/**
 * Trang học một bài.
 *
 * LÀM ĐẾN ĐÂU LƯU ĐẾN ĐÓ (khách đổi yêu cầu, 10/2026): mọi câu trả lời, mọi
 * bước, mọi lượt luyện nói đều được lưu lên máy chủ ngay; học viên bận việc
 * giữa chừng thì lần sau mở bài ra học tiếp đúng chỗ cũ, trên máy nào cũng
 * được.
 *
 * Lớp ngoài này lo TẢI bài học và tiến độ đang dở (nếu có), và HỎI khi cần.
 * Phiên học thật sự nằm ở LessonStudy, dựng trạng thái ban đầu từ tiến độ đã
 * tải đúng một lần.
 *
 * Bài đang học dở:
 *   - vào từ MENU (danh sách bài học)   -> hỏi "Học tiếp" hay "Học lại từ đầu";
 *   - vào từ LỊCH SỬ HỌC ("Học tiếp")   -> vào thẳng chỗ đang dở. Nút đó gửi kèm
 *     cờ RESUME_STATE theo điều hướng.
 */
export default function LessonDetailPage() {
  const { curriculumSlug, courseId, lessonId } = useParams();
  const {
    data: lesson,
    isLoading,
    isError,
    error,
  } = useLessonPublicQuery(curriculumSlug, courseId, lessonId);
  const current = useCurrentAttempt(lesson?._id);
  const location = useLocation();
  const navigate = useNavigate();

  // null = chưa chọn; "resume" = học tiếp; "restart" = học lại từ đầu.
  const [choice, setChoice] = useState(null);
  const [discarding, setDiscarding] = useState(false);
  const [discardError, setDiscardError] = useState("");

  // Ghi lựa chọn vào chính mục lịch sử trình duyệt hiện tại, để tải lại trang
  // (F5) không hỏi lại lần nữa.
  const rememberChoice = () =>
    navigate(location.pathname, { replace: true, state: { ...location.state, ...RESUME_STATE } });

  const resume = () => {
    setChoice("resume");
    rememberChoice();
  };

  const restart = async () => {
    setDiscarding(true);
    setDiscardError("");
    try {
      await discardCurrentAttempt(lesson._id);
      setChoice("restart");
      rememberChoice();
    } catch (err) {
      setDiscardError(err.message);
    } finally {
      setDiscarding(false);
    }
  };

  const backToLessonsLink = `/nghe-noi-video-ai/curriculum/${curriculumSlug}/course/${courseId}`;

  if (isLoading || (lesson && current.isLoading)) {
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

  // KHÔNG lặng lẽ bắt đầu lại từ đầu khi không tải được tiến độ: lần lưu đầu
  // tiên sau đó sẽ ghi đè lên chính tiến độ đang dở mà học viên muốn giữ.
  if (current.isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-gray-600 mb-1">Chưa tải được tiến độ đã lưu của bài này.</p>
          <p className="text-xs text-gray-400 mb-4">{current.error.message}</p>
          <button
            onClick={() => current.refetch()}
            className="px-5 py-2 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const inProgress = current.data?.attempt;
  if (inProgress && choice === null && !location.state?.resume) {
    return (
      <div className="min-h-screen">
        <SiteHeader backTo={backToLessonsLink} backLabel="Danh sách bài học" title={lesson.title} />
        <ResumeDialog
          attempt={inProgress}
          lessonTitle={lesson.title}
          busy={discarding}
          error={discardError}
          onResume={resume}
          onRestart={restart}
        />
      </div>
    );
  }

  return (
    <LessonStudy
      lesson={lesson}
      initial={choice === "restart" ? null : current.data}
      routeParams={{ curriculumSlug, courseSlug: courseId, lessonSlug: lessonId }}
      backToLessonsLink={backToLessonsLink}
    />
  );
}

function LessonStudy({ lesson, initial, routeParams, backToLessonsLink }) {
  const { curriculumSlug, courseSlug, lessonSlug } = routeParams;
  const navigate = useNavigate();

  const videos = Array.isArray(lesson.videos) ? lesson.videos : [];
  const saved = initial?.attempt?.progress || null;

  const [activeVideoIndex, setActiveVideoIndex] = useState(() => {
    const i = Number(saved?.activeVideoIndex);
    return Number.isInteger(i) && i >= 0 && i < videos.length ? i : 0;
  });
  const [activeLineIndex, setActiveLineIndex] = useState(-1);

  // Tiến độ giữ THEO TỪNG VIDEO: { [videoIndex]: EMPTY_PROGRESS }.
  //
  // Mỗi video có nội dung riêng nên cũng phải có tiến độ riêng — xong bài tập
  // của video 1 không có nghĩa là xong bài tập của video 2.
  const [progressByVideo, setProgressByVideo] = useState(() => {
    const out = {};
    (saved?.videos || []).forEach((v, i) => {
      if (i < videos.length && v) {
        out[i] = {
          completedCount: Math.min(STEPS_PER_VIDEO, Number(v.completedCount) || 0),
          openStep: Number(v.openStep) || 1,
          exerciseResult: v.exerciseResult || null,
          speakingResult: v.speakingResult || null,
        };
      }
    });
    return out;
  });

  // Video nào học viên đã từng mở. Chỉ những video này mới được dựng nội dung —
  // xem ghi chú ở chỗ render bên dưới.
  const [visited, setVisited] = useState(() => ({
    ...(saved?.visited || {}),
    0: true,
    [activeVideoIndex]: true,
  }));

  // Bài làm dở của từng video (bài tập, số câu đã luyện nói). Ở ref chứ không
  // ở state: các phần con báo lên liên tục, chỉ cần đọc lúc dựng gói lưu.
  // `tick` tăng mỗi khi có thay đổi thật, để effect lưu chạy lại.
  const exerciseRef = useRef(
    Object.fromEntries((saved?.videos || []).map((v, i) => [i, v?.exercise || null])),
  );
  // Bài tập đã làm dở lúc mở trang, để trao cho ExerciseSection khi nó được
  // dựng (lúc mở video / mở bước). Mỗi ExerciseSection chỉ dựng MỘT lần trong
  // phiên, nên bản lúc mở trang cũng chính là bản mới nhất của nó.
  const [savedExercise] = useState(() =>
    (saved?.videos || []).map((v) => v?.exercise?.state || null),
  );
  const [savedSpeaking] = useState(() => savedSpeakingByVideo(initial?.speaking, videos.length));
  const speakingRef = useRef(
    Object.fromEntries(savedSpeaking.map((r, i) => [i, { attempted: Object.keys(r).length }])),
  );
  const [tick, setTick] = useState(0);

  const videoRef = useRef(null);
  const pendingSegmentRef = useRef(null);

  const saver = useProgressSaver(initial?.attempt?._id);

  // Đã chốt "hoàn thành" cho bài này chưa. Ở ref chứ không ở state: nó chỉ
  // để chặn gửi lần hai, không ảnh hưởng gì tới những gì hiện trên màn hình.
  const savedRef = useRef(false);
  const saveAttempt = useSaveLessonAttempt();

  useEffect(() => {
    setActiveLineIndex(-1);
  }, [activeVideoIndex]);

  const contents = videos.map((_, i) => resolveVideoContent(lesson, i));
  const allDialogue = flattenLessonDialogue(videos);
  // Giữ nguyên hình dạng mà SpeakingSection trông đợi (videoIndex/localIndex/
  // videoTitle), chỉ lọc lại theo từng video.
  const dialogues = videos.map((_, i) =>
    allDialogue.filter((line) => line.videoIndex === i),
  );

  const progressOf = (index) => progressByVideo[index] || EMPTY_PROGRESS;
  const isVideoDone = (index) => videoDone(progressByVideo, index);
  const lessonFinished =
    videos.length > 0 && videos.every((_, i) => isVideoDone(i));

  /**
   * Phần bài tập của một video để ghi vào lịch sử: xong bước bài tập thì lấy
   * kết quả trọn vẹn; đang làm dở thì lấy các câu ĐÃ LÀM.
   */
  const exerciseForHistory = (i) => {
    const r = progressOf(i).exerciseResult;
    if (r) return { correct: r.correct, total: r.total, answers: r.answers || [] };
    return exerciseRef.current[i]?.summary || null;
  };

  /** Gói gửi lên máy chủ — đủ để dựng lại đúng chỗ cũ khi học viên quay lại. */
  const buildPayload = () => ({
    lessonId: lesson._id,
    lessonTitle: lesson.title,
    lessonOrder: lesson.order,
    lessonSlug,
    courseSlug,
    curriculumSlug,
    progressPercent: progressPercent({
      videoCount: videos.length,
      completedCount: (i) => progressOf(i).completedCount,
      exerciseAnswered: (i) => exerciseRef.current[i]?.summary?.total || 0,
      exerciseTotal: (i) => countExercises(contents[i].exercises),
      speakingAttempted: (i) => speakingRef.current[i]?.attempted || 0,
      speakingTotal: (i) => dialogues[i].length,
    }),
    progress: {
      v: 1,
      activeVideoIndex,
      visited,
      videos: videos.map((_, i) => ({
        ...progressOf(i),
        exercise: exerciseRef.current[i] || null,
      })),
    },
    videos: videos.map((v, i) => ({
      index: i,
      title: v.title || `Video ${i + 1}`,
      exercise: exerciseForHistory(i),
    })),
  });

  /**
   * LƯU TIẾN ĐỘ mỗi khi có thay đổi (gom lại ~0,8 giây, xem useProgressSaver).
   *
   * Chỉ mở bài ra xem mà chưa làm gì thì KHÔNG tạo lượt học: lịch sử không
   * nên đầy những dòng "Đang học 0%" chỉ vì học viên bấm nhầm vào bài.
   */
  useEffect(() => {
    if (lessonFinished) return;
    const hasActivity = videos.some(
      (_, i) =>
        progressOf(i).completedCount > 0 ||
        (exerciseRef.current[i]?.summary?.total || 0) > 0 ||
        (speakingRef.current[i]?.attempted || 0) > 0,
    );
    if (!saver.attemptId() && !hasActivity) return;
    saver.schedule(buildPayload());
    // buildPayload đọc đúng các giá trị trong mảng phụ thuộc (và các ref).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressByVideo, activeVideoIndex, visited, tick]);

  /**
   * CHỐT "HOÀN THÀNH" KHI HỌC VIÊN ĐI HẾT CẢ BÀI.
   *
   * Gửi đúng một lần, chốt bằng ref. Ngừng bộ lưu tiến độ TRƯỚC: một lần lưu
   * đang chờ mà tới máy chủ sau lệnh chốt thì máy chủ cũng bỏ qua, nhưng không
   * gửi là sạch nhất.
   *
   * CHỈ GỬI PHẦN BÀI TẬP. Điểm luyện nói được máy chủ dựng lại từ chính các
   * bản ghi nó đã lưu lúc chấm — client không gửi, và cũng không được gửi.
   */
  const submitCompletion = () => {
    savedRef.current = true;
    saver.stop();
    const { lessonId, lessonTitle, lessonOrder, videos: vids } = buildPayload();
    saveAttempt.mutate({
      lessonId,
      lessonTitle,
      lessonOrder,
      lessonSlug,
      courseSlug,
      curriculumSlug,
      attemptId: saver.attemptId(),
      videos: vids,
    });
  };

  useEffect(() => {
    if (savedRef.current || !lessonFinished) return;
    submitCompletion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonFinished]);

  useEffect(() => {
    if (pendingSegmentRef.current) {
      const { start, end } = pendingSegmentRef.current;
      pendingSegmentRef.current = null;
      videoRef.current?.playSegment(start, end);
    }
  }, [activeVideoIndex]);

  const activeVideo = videos[activeVideoIndex];
  const activeContent = contents[activeVideoIndex] || {
    vocabulary: [],
    exercises: {},
  };
  // Đếm số DẠNG bài thực sự có câu hỏi, để nhãn không nói "4 dạng bài" khi
  // video chỉ có 2. Lấy danh sách dạng từ lessonVideos.js — thêm dạng mới cho
  // khoá HSK 3/4 chỉ phải khai báo ở đúng một chỗ.
  const exerciseTypeCount = EXERCISE_TYPES.filter(
    (k) =>
      Array.isArray(activeContent.exercises[k]) &&
      activeContent.exercises[k].length > 0,
  ).length;

  const current = progressOf(activeVideoIndex);

  const patchVideo = (index, patch) =>
    setProgressByVideo((all) => ({
      ...all,
      [index]: { ...(all[index] || EMPTY_PROGRESS), ...patch },
    }));

  // Hoàn thành một bước CỦA MỘT VIDEO CỤ THỂ.
  //
  // Nhận index chứ không đọc activeVideoIndex: nội dung của mọi video đã ghé
  // qua đều đang nằm trong DOM, nên phải ghi kết quả về đúng video đã sinh ra
  // nó. Dùng dạng hàm để không đọc phải state cũ khi hai bước xong sát nhau.
  const finishStep = (index, step, patch = {}) =>
    setProgressByVideo((all) => {
      const before = all[index] || EMPTY_PROGRESS;
      return {
        ...all,
        [index]: {
          ...before,
          ...patch,
          completedCount: Math.max(before.completedCount, step),
          openStep: step + 1,
        },
      };
    });

  const switchVideo = (index) => {
    setActiveVideoIndex(index);
    setVisited((v) => (v[index] ? v : { ...v, [index]: true }));
  };

  const statusOf = (step) => {
    if (step > current.completedCount + 1) return "locked";
    if (step === current.openStep) return "active";
    if (step <= current.completedCount) return "done";
    return "active";
  };

  const goToStep = (step) => {
    if (step <= current.completedCount + 1) {
      patchVideo(activeVideoIndex, { openStep: step });
    }
  };

  const requestPlaySegment = (videoIndex, start, end) => {
    if (videoIndex === activeVideoIndex) {
      videoRef.current?.playSegment(start, end);
    } else {
      pendingSegmentRef.current = { start, end };
      switchVideo(videoIndex);
    }
  };

  // Bài tập của video i vừa đổi (trả lời một câu, nộp một dạng).
  const onExerciseProgress = (i, snapshot) => {
    if (JSON.stringify(exerciseRef.current[i] || null) === JSON.stringify(snapshot)) return;
    exerciseRef.current[i] = snapshot;
    setTick((n) => n + 1);
  };

  // Số câu đã luyện nói của video i vừa đổi.
  const onSpeakingProgress = (i, { attempted }) => {
    if ((speakingRef.current[i]?.attempted || 0) === attempted) return;
    speakingRef.current[i] = { attempted };
    setTick((n) => n + 1);
  };

  const nextUnfinishedIndex = videos.findIndex((_, i) => !isVideoDone(i));

  // Gộp điểm bài tập: cộng dồn số câu đúng và tổng số câu của mọi video, rồi
  // mới quy ra thang 100. KHÔNG lấy trung bình các tỉ lệ phần trăm — video 2
  // câu và video 20 câu mà cân bằng nhau thì con số vô nghĩa.
  const exerciseTotals = videos.reduce(
    (acc, _, i) => {
      const r = progressOf(i).exerciseResult;
      return r
        ? { correct: acc.correct + r.correct, total: acc.total + r.total }
        : acc;
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
      ? Math.round(
          speakingScores.reduce((a, b) => a + b, 0) / speakingScores.length,
        )
      : null;

  // Dựng nội dung của MỌI video đã ghé qua, chỉ hiện video đang chọn.
  //
  // VÌ SAO KHÔNG DỰNG LẠI MỖI LẦN ĐỔI VIDEO: bốn phần này tự giữ bài làm bên
  // trong (đáp án đã chọn, câu đã luyện nói, bản ghi âm). Dựng lại là mất sạch,
  // học viên đang làm dở mà lỡ bấm sang video khác thì phải làm lại từ đầu.
  //
  // Ẩn bằng CSS chứ không gỡ khỏi DOM — đúng cách AccordionSection vẫn làm khi
  // học viên đóng/mở lại một bước.
  //
  // Chỉ dựng video ĐÃ GHÉ QUA, không dựng sẵn tất cả: bài có 4 video mà học
  // viên chỉ xem video 1 thì không việc gì phải dựng 3 bộ nội dung không ai
  // nhìn tới.
  const perVideo = (render) =>
    videos.map((_, i) =>
      visited[i] ? (
        <div key={i} className={i === activeVideoIndex ? "" : "hidden"}>
          {render(i)}
        </div>
      ) : null,
    );

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
                    onClick={() => switchVideo(i)}
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
          <AccordionSection
            stepNumber={1}
            title="Bài tập luyện tập"
            subtitle={
              exerciseTypeCount > 0 ? `${exerciseTypeCount} dạng bài` : "Chưa có"
            }
            status={statusOf(1)}
            isOpen={current.openStep === 1}
            onToggle={() => goToStep(1)}
          >
            {perVideo((i) => (
              <ExerciseSection
                exercises={contents[i].exercises}
                saved={savedExercise[i]}
                onProgress={(snapshot) => onExerciseProgress(i, snapshot)}
                onComplete={(result) =>
                  finishStep(i, 1, { exerciseResult: result })
                }
              />
            ))}
          </AccordionSection>

          <AccordionSection
            stepNumber={2}
            title="Từ vựng & ngữ pháp mở rộng"
            subtitle={`${activeContent.vocabulary.length} từ`}
            status={statusOf(2)}
            isOpen={current.openStep === 2}
            onToggle={() => goToStep(2)}
          >
            {perVideo((i) => (
              <VocabSection
                vocabulary={contents[i].vocabulary}
                onComplete={() => finishStep(i, 2)}
              />
            ))}
          </AccordionSection>

          <AccordionSection
            stepNumber={3}
            title="Luyện nói từng câu"
            subtitle="AI chấm điểm"
            status={statusOf(3)}
            isOpen={current.openStep === 3}
            onToggle={() => goToStep(3)}
          >
            {perVideo((i) => (
              <SpeakingSection
                dialogue={dialogues[i]}
                activeVideoIndex={activeVideoIndex}
                activeLineIndex={activeLineIndex}
                savedResults={savedSpeaking[i]}
                onProgress={(p) => onSpeakingProgress(i, p)}
                lessonContext={{
                  lessonId: lesson._id,
                  lessonTitle: lesson.title,
                  curriculumSlug,
                  courseSlug,
                  lessonSlug,
                  // PHẢI gửi videoIndex. lineIndex mà SpeakingSection gửi lên
                  // là vị trí trong phạm vi MỘT video (nó nhận hội thoại đã
                  // lọc theo video), nên bài 3 video thì câu đầu của cả ba đều
                  // là 0. Thiếu số này thì máy chủ không phân biệt được chúng.
                  videoIndex: i,
                }}
                onRequestPlaySegment={requestPlaySegment}
                onComplete={(result) =>
                  finishStep(i, 3, { speakingResult: result })
                }
              />
            ))}
          </AccordionSection>

          <AccordionSection
            stepNumber={4}
            title="Bản dịch tiếng Việt"
            subtitle={`${dialogues[activeVideoIndex]?.length ?? 0} câu`}
            status={statusOf(4)}
            isOpen={current.openStep === 4}
            onToggle={() => goToStep(4)}
          >
            {perVideo((i) => (
              <TranslationSection
                videos={videos[i] ? [videos[i]] : []}
                onComplete={() => finishStep(i, 4)}
              />
            ))}
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
                . Còn {videos.filter((_, i) => !isVideoDone(i)).length} video nữa
                là hoàn thành bài học.
              </p>
              <button
                onClick={() => switchVideo(nextUnfinishedIndex)}
                className="px-5 py-2 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
              >
                Sang{" "}
                {videos[nextUnfinishedIndex]?.title ||
                  `video ${nextUnfinishedIndex + 1}`}
              </button>
            </div>
          )}

          {lessonFinished && saveAttempt.isError && (
            // Học viên vừa học xong cả bài mà bản ghi không lưu được thì phải
            // nói ra và cho thử lại — im lặng là mất trắng công của họ.
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-900">
                Chưa lưu được kết quả bài học này vào lịch sử.
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {saveAttempt.error.message}
              </p>
              <button
                onClick={() => {
                  saveAttempt.reset();
                  submitCompletion();
                }}
                className="mt-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-white border border-amber-300 hover:bg-amber-100"
              >
                Thử lưu lại
              </button>
            </div>
          )}

          {lessonFinished && (
            <ResultSection
              lessonOrder={lesson.order}
              exerciseScore={exerciseScore}
              pronunciationScore={pronunciationScore}
              exerciseCorrect={
                exerciseTotals.total > 0 ? exerciseTotals.correct : undefined
              }
              exerciseTotal={
                exerciseTotals.total > 0 ? exerciseTotals.total : undefined
              }
              onBackToList={() => navigate(backToLessonsLink)}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/** "08:15 · 20/10" */
function shortTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/**
 * Hỏi học viên muốn học tiếp chỗ đang dở hay học lại từ đầu.
 *
 * Nói rõ học lại thì phần làm dở MẤT (kể cả ghi âm luyện nói) — đó là thao
 * tác không hoàn tác được.
 */
function ResumeDialog({ attempt, lessonTitle, busy, error, onResume, onRestart }) {
  const percent = attempt.progressPercent ?? 0;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" role="dialog" aria-modal="true">
        <h2 className="text-lg font-heading font-semibold text-gray-900">Bạn đang học dở bài này</h2>
        <p className="text-sm text-gray-500 mt-1">
          {lessonTitle}
          {attempt.activityAt ? ` · học gần nhất lúc ${shortTime(attempt.activityAt)}` : ""}
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Tiến độ</span>
            <span className="font-semibold text-gray-800">{percent}%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
          </div>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            Chưa học lại được: {error}
          </p>
        )}

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={onResume}
            disabled={busy}
            autoFocus
            className="w-full py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900 disabled:opacity-50"
          >
            Học tiếp
          </button>
          <button
            type="button"
            onClick={onRestart}
            disabled={busy}
            className="w-full py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {busy ? "Đang xoá phần làm dở..." : "Học lại từ đầu"}
          </button>
          <p className="text-[11px] text-gray-400 text-center pt-1">
            Học lại từ đầu sẽ xoá các câu đã làm và bản ghi luyện nói của lần học dở này.
          </p>
        </div>
      </div>
    </div>
  );
}
