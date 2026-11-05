import { Link, useParams, useSearchParams } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader.jsx";
import AuthImage from "../../components/materials/AuthImage.jsx";
import { formatTime } from "../../components/materials/VideoPlayer.jsx";
import { myVideoThumbPath, useMyMaterialCourse } from "../../hooks/useMaterials.js";

/**
 * Học liệu khoá học — nội dung một khoá: hai mục "Slide bài giảng" và "Video
 * bài giảng". Khoá chỉ có một loại thì không hiện tab.
 */
export default function MaterialDeckListPage() {
  const { courseSlug } = useParams();
  const [params, setParams] = useSearchParams();
  const { data, isLoading, isError, error } = useMyMaterialCourse(courseSlug);
  const course = data?.course;
  const decks = data?.decks || [];
  const videos = data?.videos || [];
  const bothKinds = decks.length > 0 && videos.length > 0;
  // Tab ghi trên đường dẫn: xem video xong bấm quay lại vẫn ở tab Video.
  const tab = videos.length > 0 && (params.get("tab") === "video" || decks.length === 0) ? "video" : "slide";

  return (
    <div className="min-h-screen">
      <SiteHeader backTo="/hoc-lieu" backLabel="Chọn khoá khác" title={course ? course.name : "Học liệu"} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
        {isError && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-700">{error.message}</p>
            <Link to="/hoc-lieu" className="inline-block mt-3 text-sm text-primary-dark underline">
              Quay lại danh sách khoá
            </Link>
          </div>
        )}

        {course && (
          <>
            <h2 className="text-xl font-bold">{course.name}</h2>
            {course.description && <p className="text-sm text-gray-500 mt-1">{course.description}</p>}

            {bothKinds ? (
              <div className="flex gap-2 mt-4 mb-3" role="tablist">
                {[
                  ["slide", `Slide bài giảng (${decks.length})`],
                  ["video", `Video bài giảng (${videos.length})`],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={tab === value}
                    onClick={() => setParams(value === "video" ? { tab: "video" } : {}, { replace: true })}
                    className={
                      "px-4 py-2 rounded-full text-sm font-medium border transition " +
                      (tab === value ? "bg-primary border-primary-dark text-gray-900" : "bg-white border-gray-300 text-gray-600 hover:border-primary")
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-3 mb-3">
                {videos.length > 0 ? `${videos.length} video bài giảng` : `${decks.length} bài giảng`}
              </p>
            )}

            {decks.length === 0 && videos.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-500">
                Khoá này chưa có bài giảng nào. Giảng viên sẽ cập nhật sớm.
              </div>
            )}

            {data.exercise && <ExerciseCard exercise={data.exercise} courseSlug={courseSlug} />}

            {tab === "video" && <VideoList videos={videos} courseSlug={courseSlug} />}

            <div className={"space-y-3" + (tab === "video" ? " hidden" : "")}>
              {decks.map((d, i) => (
                <Link
                  key={d._id}
                  to={`/hoc-lieu/${courseSlug}/${d._id}`}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-orange-200 p-4 hover:border-primary transition shadow-[0_6px_20px_-6px_rgba(230,168,0,0.25)]"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white font-heading font-semibold text-lg shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-900">{d.title}</p>
                    {d.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{d.description}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">{d.pageCount} trang</p>
                  </div>
                  <span className="shrink-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-medium px-4 py-2 rounded-full">
                    Xem
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function VideoList({ videos, courseSlug }) {
  return (
    <div className="space-y-3">
      {videos.map((v, i) => {
        const p = v.progress;
        const action = !p ? "Xem" : p.completed ? "Xem lại" : "Xem tiếp";
        return (
          <Link
            key={v._id}
            to={`/hoc-lieu/${courseSlug}/video/${v._id}`}
            className="flex items-center gap-3 sm:gap-4 bg-white rounded-2xl border border-orange-200 p-3 sm:p-4 hover:border-primary transition shadow-[0_6px_20px_-6px_rgba(230,168,0,0.25)]"
          >
            <div className="relative w-28 sm:w-40 aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-amber-300 to-orange-400 shrink-0">
              {v.hasThumb && <AuthImage path={myVideoThumbPath(v._id)} alt={v.title} className="absolute inset-0 w-full h-full" />}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              </span>
              {v.durationSec > 0 && (
                <span className="absolute bottom-1 right-1 text-[11px] font-medium bg-black/75 text-white px-1.5 py-0.5 rounded">
                  {formatTime(v.durationSec)}
                </span>
              )}
              {p && p.percent > 0 && (
                <span className="absolute bottom-0 left-0 h-1 bg-red-500" style={{ width: `${p.percent}%` }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400">Video {i + 1}</p>
              <p className="text-sm sm:text-base font-medium text-gray-900 line-clamp-2">{v.title}</p>
              {v.description && <p className="hidden sm:block text-sm text-gray-500 mt-0.5 line-clamp-1">{v.description}</p>}
              <p className={"text-xs mt-1 " + (p?.completed ? "text-green-700 font-medium" : p ? "text-primary-dark font-medium" : "text-gray-400")}>
                {p?.completed ? "✓ Đã xem xong" : p ? `Đã xem ${p.percent}%` : "Chưa xem"}
              </p>

            </div>
            <span className="hidden sm:inline-block shrink-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-medium px-4 py-2 rounded-full">
              {action}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

/** Bài tập của khoá (mỗi khoá một bộ): khoá tới khi xem đủ mọi video. */
function ExerciseCard({ exercise, courseSlug }) {
  const { itemCount, totalVideos, watchedVideos, unlocked, last } = exercise;
  const percent = totalVideos ? Math.round((watchedVideos / totalVideos) * 100) : 100;
  return (
    <div className={"mb-4 rounded-2xl border p-4 " + (unlocked ? "border-green-200 bg-green-50" : "border-orange-200 bg-white")}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <p className="font-medium text-gray-900">
            {unlocked ? "📝" : "🔒"} Bài tập của khoá · {itemCount} câu
          </p>
          <p className="text-sm text-gray-600 mt-0.5">
            {unlocked
              ? last
                ? `Lần gần nhất: điền từ đúng ${last.autoCorrect}/${last.autoTotal}` +
                  (last.ai?.status === "done" && last.ai.total > 0 ? ` · đặt câu đạt ${last.ai.passed}/${last.ai.total}` : "")
                : "Bạn đã xem đủ các video — làm bài tập để ôn lại nhé."
              : `Xem đủ tất cả ${totalVideos} video để mở bài tập. Đã xem đủ ${watchedVideos}/${totalVideos} video.`}
          </p>
        </div>
        {unlocked && (
          <Link
            to={`/hoc-lieu/${courseSlug}/bai-tap`}
            className="shrink-0 text-center bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium px-5 py-2.5 rounded-full"
          >
            {last ? "Xem kết quả / làm lại" : "Làm bài tập →"}
          </Link>
        )}
      </div>
      {!unlocked && (
        <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
