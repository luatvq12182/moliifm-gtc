import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteHeader from "../components/SiteHeader.jsx";
import AccordionSection from "../components/AccordionSection.jsx";
import LessonVideoPlayer from "../components/LessonVideoPlayer.jsx";
import VocabSection from "../components/VocabSection.jsx";
import TranslationSection from "../components/TranslationSection.jsx";
import ExerciseReview from "../components/history/review/ExerciseReview.jsx";
import SpeakingReview from "../components/history/review/SpeakingReview.jsx";
import { CourseTile } from "../components/history/HistoryHeader.jsx";
import { CalendarIcon, ExerciseIcon, HeadphoneIcon } from "../components/history/icons.jsx";
import { useMyAttempt, useMyHistory, myRecordingPath } from "../hooks/useLessonHistory.js";
import { useLessonPublicQuery } from "../hooks/usePublicCatalog.js";
import { resolveVideoContent } from "../lib/lessonVideos.js";
import { formatDate } from "./LessonHistoryPage.jsx";

/**
 * Xem lại một lượt hoàn thành bài học.
 *
 * DỰNG Y KHUNG TRANG HỌC (LessonDetailPage): thanh chọn video, video bên trái,
 * bốn bước bên phải. Học viên đã quen bố cục đó, nên lúc xem lại mọi thứ nằm
 * đúng chỗ họ nhớ, không phải làm quen thêm một giao diện mới.
 *
 * HAI NGUỒN DỮ LIỆU, và phải phân biệt rõ:
 *   - LƯỢT HỌC (attempt): điểm, câu đúng/sai, điểm từng câu nói, ghi âm. Đây
 *     là bản chụp lúc học, không bao giờ đổi.
 *   - BÀI HỌC HIỆN TẠI (lesson): video, từ vựng, bản dịch, mốc thời gian từng
 *     câu. Có thể đã bị giảng viên sửa hoặc xoá sau khi học viên học. Thiếu
 *     nó thì trang vẫn hiện đủ phần của lượt học, chỉ mất video và hai bước
 *     xem lại nội dung.
 */
export default function LessonHistoryDetailPage() {
  const { id } = useParams();
  const { data: attempt, isLoading, isError, error } = useMyAttempt(id);

  return (
    <div className="min-h-screen">
      <SiteHeader
        backTo="/lich-su-hoc"
        backLabel="Lịch sử học"
        title={attempt ? [attempt.courseName, attempt.lessonTitle].filter(Boolean).join(" · ") : "Chi tiết"}
      />

      {isLoading && <p className="max-w-7xl mx-auto px-4 py-6 text-sm text-gray-400">Đang tải...</p>}

      {isError && (
        <div className="max-w-xl mx-auto px-4 py-10 text-center">
          <p className="text-sm text-gray-600 mb-3">{error.message}</p>
          <Link to="/lich-su-hoc" className="text-primary-dark underline text-sm">
            Quay lại lịch sử
          </Link>
        </div>
      )}

      {/* key theo id lượt học: chuyển sang lượt khác của cùng bài thì dựng lại
          từ đầu, không mang theo bước đang mở hay tab đang chọn của lượt cũ. */}
      {attempt && <AttemptReview key={attempt._id} attempt={attempt} />}
    </div>
  );
}

function AttemptReview({ attempt }) {
  const {
    data: lesson,
    isError: lessonMissing,
    isLoading: lessonLoading,
  } = useLessonPublicQuery(
    attempt.curriculumSlug,
    attempt.courseSlug,
    attempt.lessonSlug,
  );

  const [activeVideo, setActiveVideo] = useState(0);
  const [openStep, setOpenStep] = useState(1);
  const videoRef = useRef(null);

  const recorded = attempt.videos || [];
  const lessonVideos = lesson?.videos || [];
  // Số video lấy theo lượt học (bản chụp), không theo bài hiện tại: bài có
  // thể đã bị thêm hoặc bớt video từ sau khi học.
  const videoCount = Math.max(recorded.length, 1);
  const current = recorded[activeVideo] || {};
  const lessonVideo = lessonVideos[activeVideo];

  // Video hiện tại chỉ dùng được khi tiêu đề còn khớp với lúc học — nếu
  // không, nội dung bên phải đang nói về một video khác với cái đang phát.
  const videoStillMatches =
    Boolean(lessonVideo) &&
    (!current.title || !lessonVideo.title || current.title === lessonVideo.title);

  const content = useMemo(
    () => (lesson && videoStillMatches ? resolveVideoContent(lesson, activeVideo) : null),
    [lesson, activeVideo, videoStillMatches],
  );

  const lines = current.speaking?.lines || [];
  const lineScores = lines.map((l) => l.score).filter((n) => typeof n === "number");
  const videoSpeakingAvg = lineScores.length
    ? Math.round(lineScores.reduce((a, b) => a + b, 0) / lineScores.length)
    : null;
  const ex = current.exercise || {};

  const lessonHref =
    attempt.curriculumSlug && attempt.courseSlug && attempt.lessonSlug
      ? `/nghe-noi-video-ai/curriculum/${attempt.curriculumSlug}/course/${attempt.courseSlug}/lesson/${attempt.lessonSlug}`
      : null;

  const showVideo = Boolean(lessonVideo) && videoStillMatches;

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <ReviewHeader attempt={attempt} lessonHref={!lessonMissing ? lessonHref : null} />

      <div
        className={
          "flex flex-col lg:items-start " +
          (showVideo || videoCount > 1 ? "lg:grid lg:grid-cols-2 lg:gap-6" : "max-w-3xl mx-auto")
        }
      >
        {(showVideo || videoCount > 1) && (
          <div className="lg:sticky lg:top-6 mb-6 lg:mb-0">
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              {videoCount > 1 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {recorded.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveVideo(i)}
                      className={
                        "px-3 py-1.5 text-xs rounded-md border " +
                        (i === activeVideo
                          ? "bg-primary border-primary-dark font-medium"
                          : "border-green-400 bg-green-50 text-green-700")
                      }
                    >
                      {i === activeVideo ? "" : "✓ "}
                      {v.title || `Video ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {showVideo ? (
                <LessonVideoPlayer
                  ref={videoRef}
                  videoType={lessonVideo.type}
                  videoSrc={lessonVideo.videoUrl}
                  youtubeId={lessonVideo.youtubeId}
                  dialogue={lessonVideo.dialogue || []}
                />
              ) : (
                <div className="aspect-video rounded-lg bg-gray-100 flex items-center justify-center text-center px-6">
                  <p className="text-sm text-gray-500">
                    {lessonLoading
                      ? "Đang tải video..."
                      : lessonMissing
                        ? "Bài học này không còn trên hệ thống nên không phát lại được video."
                        : "Video của phần này đã được thay đổi từ sau lượt học, không phát lại được."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <AccordionSection
            stepNumber={1}
            title="Bài tập luyện tập"
            subtitle={ex.total ? `${ex.correct}/${ex.total} câu đúng` : "Không có"}
            status="done"
            isOpen={openStep === 1}
            onToggle={() => setOpenStep(openStep === 1 ? 0 : 1)}
          >
            <ExerciseReview key={activeVideo} exercise={ex} />
          </AccordionSection>

          <AccordionSection
            stepNumber={2}
            title="Từ vựng & ngữ pháp mở rộng"
            subtitle={content ? `${content.vocabulary.length} từ` : ""}
            status="done"
            isOpen={openStep === 2}
            onToggle={() => setOpenStep(openStep === 2 ? 0 : 2)}
          >
            {content ? (
              <VocabSection key={activeVideo} vocabulary={content.vocabulary} />
            ) : (
              <ContentGone missing={lessonMissing} loading={lessonLoading} />
            )}
          </AccordionSection>

          <AccordionSection
            stepNumber={3}
            title="Luyện nói từng câu"
            subtitle={
              lines.length
                ? `${lines.length} câu` + (videoSpeakingAvg !== null ? ` · TB ${videoSpeakingAvg}` : "")
                : "Không có"
            }
            status="done"
            isOpen={openStep === 3}
            onToggle={() => setOpenStep(openStep === 3 ? 0 : 3)}
          >
            <SpeakingReview
              key={activeVideo}
              lines={lines}
              dialogue={showVideo ? lessonVideo.dialogue : null}
              onPlaySample={
                showVideo ? (start, end) => videoRef.current?.playSegment(start, end) : null
              }
              recordingPath={myRecordingPath}
            />
          </AccordionSection>

          <AccordionSection
            stepNumber={4}
            title="Bản dịch tiếng Việt"
            subtitle={content ? `${content.dialogue.length} câu` : ""}
            status="done"
            isOpen={openStep === 4}
            onToggle={() => setOpenStep(openStep === 4 ? 0 : 4)}
          >
            {content && lessonVideo ? (
              <TranslationSection key={activeVideo} videos={[lessonVideo]} />
            ) : (
              <ContentGone missing={lessonMissing} loading={lessonLoading} />
            )}
          </AccordionSection>
        </div>
      </div>
    </main>
  );
}

function ContentGone({ missing, loading }) {
  if (loading) return <p className="text-sm text-gray-400">Đang tải nội dung...</p>;
  return (
    <p className="text-sm text-gray-500">
      {missing
        ? "Bài học này không còn trên hệ thống nên không xem lại được phần này."
        : "Nội dung phần này đã được thay đổi từ sau lượt học."}
    </p>
  );
}

/* ------------------------------------------------------------------ */

const scoreTone = (v) =>
  v === null || v === undefined
    ? "bg-gray-50 text-gray-300 border-gray-200"
    : v >= 80
      ? "bg-green-50 text-green-700 border-green-200"
      : v >= 60
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-red-50 text-red-600 border-red-200";

function ReviewHeader({ attempt, lessonHref }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <CourseTile label={attempt.courseName || attempt.courseSlug} />
          <div className="min-w-0">
            <h1 className="text-xl font-heading font-bold truncate">
              {attempt.lessonTitle || "Bài học"}
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
              <CalendarIcon /> Hoàn thành lúc {formatDate(attempt.completedAt)}
              {attempt.curriculumName && (
                <span className="hidden sm:inline text-gray-400">· {attempt.curriculumName}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ScorePill icon={<ExerciseIcon size={14} />} label="Bài tập" value={attempt.exercise?.score100} />
          <ScorePill icon={<HeadphoneIcon size={14} />} label="Phát âm" value={attempt.speaking?.avgScore} />
          {lessonHref && (
            <Link
              to={lessonHref}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-primary hover:bg-primary-dark text-gray-900"
            >
              Học lại bài này
            </Link>
          )}
        </div>
      </div>

      <AttemptSwitcher attempt={attempt} />
    </div>
  );
}

function ScorePill({ icon, label, value }) {
  const has = value !== null && value !== undefined;
  return (
    <span className={"inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border " + scoreTone(value)}>
      {icon}
      <span className="text-xs opacity-80">{label}</span>
      <strong className="font-bold">{has ? value : "—"}</strong>
    </span>
  );
}

/** "00:45 · 14/10" — đủ để phân biệt hai lần học trong cùng một ngày. */
function shortTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())} · ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/**
 * Chuyển giữa các lần học CỦA CÙNG BÀI NÀY.
 *
 * Để học viên so được lần trước sai câu nào, lần này đã sửa được chưa. Chỉ
 * hiện khi bài đã được học từ hai lần trở lên.
 */
function AttemptSwitcher({ attempt }) {
  const lessonId = attempt.lesson ? String(attempt.lesson) : "";
  const { data } = useMyHistory(1, lessonId ? { lessonId } : { lessonId: "__none__" });
  const list = useMemo(() => [...(data?.data || [])].reverse(), [data]);

  if (!lessonId || list.length < 2) return null;

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      <p className="text-[11px] text-gray-400 mb-2">Các lần học bài này</p>
      <div className="flex flex-wrap gap-2">
        {list.map((a) => {
          const on = a._id === attempt._id;
          return (
            <Link
              key={a._id}
              to={`/lich-su-hoc/${a._id}`}
              aria-current={on ? "page" : undefined}
              className={
                "min-w-[11rem] rounded-xl border px-3 py-2 transition " +
                (on
                  ? "border-primary-dark bg-primary/20 ring-1 ring-primary-dark"
                  : "border-gray-200 bg-white hover:border-primary-dark")
              }
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-gray-900">
                  Lần {a.attemptNo}
                  {on && <span className="ml-1.5 text-[10px] font-medium text-orange-700">đang xem</span>}
                </span>
                {/* Giờ đặt TRƯỚC ngày: hai lần học cùng một ngày là chuyện
                    thường, chỉ ghi ngày thì hai thẻ trông y hệt nhau. */}
                <span className="text-[11px] text-gray-400">{shortTime(a.completedAt)}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <LabeledScore label="Bài tập" value={a.exercise?.score100} />
                <LabeledScore label="Phát âm" value={a.speaking?.avgScore} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Một con số kèm NHÃN của nó. Trước đây thẻ chỉ ghi "67 · 66" — người đọc
 * phải tự đoán số nào là bài tập, số nào là phát âm.
 */
function LabeledScore({ label, value }) {
  const has = value !== null && value !== undefined;
  const tone = !has
    ? "text-gray-300"
    : value >= 80
      ? "text-green-600"
      : value >= 60
        ? "text-amber-600"
        : "text-red-500";
  return (
    <span className="text-gray-500">
      {label} <strong className={"font-bold " + tone}>{has ? value : "—"}</strong>
    </span>
  );
}
