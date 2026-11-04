import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader.jsx";
import VideoPlayer, { formatTime } from "../../components/materials/VideoPlayer.jsx";
import { api } from "../../lib/apiClient.js";
import { myVideoProgressPath, myVideoThumbPath, useMyMaterialCourse, useMyVideo } from "../../hooks/useMaterials.js";

/**
 * Học liệu khoá học — xem một video bài giảng. Lưu chỗ đang xem để lần sau mở
 * lại xem tiếp (video thường dài cỡ 1 tiếng).
 */
export default function MaterialVideoPage() {
  const { courseSlug, videoId } = useParams();
  const { data: video, isLoading, isError, error } = useMyVideo(videoId);
  const { data: courseData } = useMyMaterialCourse(courseSlug);
  const listPath = `/hoc-lieu/${courseSlug}?tab=video`;

  // Lưu tiến độ: lỗi mạng thì bỏ qua — lần báo sau (10 giây nữa) sẽ ghi đè.
  const saveProgress = useCallback(
    (body, { keepalive } = {}) => {
      const path = myVideoProgressPath(videoId);
      (keepalive ? api.putKeepalive(path, body) : api.put(path, body)).catch(() => {});
    },
    [videoId],
  );

  // Xem xong rồi thì mở lại từ đầu; đang dở thì phát tiếp (trừ khi gần hết).
  const p = video?.progress;
  const startAt = p && !p.completed && p.position > 15 && (!video.durationSec || p.position < video.durationSec - 20) ? p.position : 0;

  const videos = courseData?.videos || [];
  const index = videos.findIndex((v) => v._id === videoId);
  const prev = index > 0 ? videos[index - 1] : null;
  const next = index >= 0 && index < videos.length - 1 ? videos[index + 1] : null;

  return (
    <div className="min-h-screen">
      <SiteHeader backTo={listPath} backLabel="Danh sách video" title={video ? video.title : "Video bài giảng"} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {isLoading && <p className="text-sm text-gray-400">Đang tải...</p>}
        {isError && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <p className="text-gray-700">{error.message}</p>
            <Link to={listPath} className="inline-block mt-3 text-sm text-primary-dark underline">
              Quay lại danh sách video
            </Link>
          </div>
        )}

        {video && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-2 sm:p-3">
              <VideoPlayer
                key={`${video._id}-${video.youtubeId}`}
                youtubeId={video.youtubeId}
                title={video.title}
                thumbPath={video.hasThumb ? myVideoThumbPath(video._id) : ""}
                startAt={startAt}
                onProgress={saveProgress}
              />
            </div>

            <div className="mt-4">
              {index >= 0 && <p className="text-xs text-primary-dark font-medium">Video {index + 1} / {videos.length}</p>}
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 mt-0.5">{video.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {video.course?.name}
                {video.durationSec > 0 && ` · ${formatTime(video.durationSec)}`}
              </p>
              {video.description && <p className="text-sm text-gray-700 mt-2 whitespace-pre-line">{video.description}</p>}
              <p className="hidden sm:block text-xs text-gray-400 mt-3">
                Phím tắt: K / Space phát–dừng · J / L lùi–tới 10 giây · ← → 5 giây · F toàn màn hình · M tắt tiếng
              </p>
            </div>

            {(prev || next) && (
              <div className="grid grid-cols-2 gap-3 mt-5">
                {prev ? (
                  <Link to={`/hoc-lieu/${courseSlug}/video/${prev._id}`} className="bg-white rounded-xl border border-gray-200 hover:border-primary p-3 min-w-0">
                    <span className="block text-xs text-gray-400">← Video trước</span>
                    <span className="block text-sm font-medium text-gray-900 truncate">{prev.title}</span>
                  </Link>
                ) : (
                  <span />
                )}
                {next && (
                  <Link to={`/hoc-lieu/${courseSlug}/video/${next._id}`} className="bg-white rounded-xl border border-gray-200 hover:border-primary p-3 text-right min-w-0">
                    <span className="block text-xs text-gray-400">Video tiếp theo →</span>
                    <span className="block text-sm font-medium text-gray-900 truncate">{next.title}</span>
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
