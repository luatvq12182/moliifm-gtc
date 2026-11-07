import { useCallback, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import SiteHeader from "../../components/SiteHeader.jsx";
import VideoPlayer, { formatTime } from "../../components/materials/VideoPlayer.jsx";
import { api } from "../../lib/apiClient.js";
import { myVideoProgressPath, myVideoThumbPath, useMyMaterialCourse, useMyVideo } from "../../hooks/useMaterials.js";
import { groupLabel, groupOf, videoListPath } from "../../data/videoGroups.js";

/**
 * Học liệu khoá học — xem một video bài giảng. Lưu chỗ đang xem để lần sau mở
 * lại xem tiếp (video thường dài cỡ 1 tiếng).
 *
 * Bài tập là của KHOÁ: phải xem đủ TẤT CẢ video nhóm "bài giảng bổ sung"
 * của khoá (mỗi video 95% thời lượng thực sự phát, tua không tính) mới
 * mở — máy chủ quyết định, trang chỉ hiện. Video "theo giáo trình" chỉ để xem.
 */
export default function MaterialVideoPage() {
  const { courseSlug, videoId } = useParams();
  const { data: video, isLoading, isError, error } = useMyVideo(videoId);
  const { data: courseData } = useMyMaterialCourse(courseSlug);
  // Quay lại đúng mục video (bổ sung / theo giáo trình).
  const group = groupOf(video);
  const listPath = videoListPath(courseSlug, group);

  const playerRef = useRef(null);
  const [liveSec, setLiveSec] = useState(null); // giây đã xem, tính ngay trên trình duyệt
  const [doneNow, setDoneNow] = useState(false); // máy chủ vừa báo đã xem đủ

  // Lưu tiến độ. Trả Promise: lỗi mạng thì trình phát giữ các đoạn vừa xem,
  // gửi kèm lần sau.
  const saveProgress = useCallback(
    (body, { keepalive } = {}) => {
      const path = myVideoProgressPath(videoId);
      if (keepalive) return api.putKeepalive(path, body);
      return api.put(path, body).then((res) => {
        if (res?.completed) setDoneNow(true);
        return res;
      });
    },
    [videoId],
  );

  // Xem xong rồi thì mở lại từ đầu; đang dở thì phát tiếp (trừ khi gần hết).
  const p = video?.progress;
  const startAt = p && !p.completed && p.position > 15 && (!video.durationSec || p.position < video.durationSec - 20) ? p.position : 0;

  // Trước / sau và số thứ tự tính trong cùng nhóm với video đang xem.
  const videos = (courseData?.videos || []).filter((v) => groupOf(v) === group);
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
                watched={video.progress?.watched || []}
                onProgress={saveProgress}
                onWatchedChange={setLiveSec}
                ref={playerRef}
              />
            </div>

            <WatchStatus
              video={video}
              courseSlug={courseSlug}
              done={doneNow || Boolean(video.progress?.completed)}
              watchedSec={liveSec ?? video.progress?.watchedSec ?? 0}
              onJump={() => {
                const at = playerRef.current?.firstUnwatched();
                if (at === null || at === undefined) return;
                playerRef.current.seekTo(at);
                playerRef.current.play();
              }}
            />

            <div className="mt-4">
              {index >= 0 && (
                <p className="text-xs text-primary-dark font-medium">
                  {groupLabel(group)} · Video {index + 1} / {videos.length}
                </p>
              )}
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

/** Đã xem video này bao nhiêu + tình trạng bài tập của khoá. */
function WatchStatus({ video, courseSlug, done, watchedSec, onJump }) {
  const duration = video.durationSec || 0;
  const percent = done ? 100 : duration ? Math.min(99, Math.floor((watchedSec / duration) * 100)) : 0;
  // Video theo giáo trình không liên quan bài tập của khoá.
  const ex = groupOf(video) === "supplement" ? video.exercise : null;
  // Video này vừa xem đủ trong lần mở trang này -> cộng ngay vào số video đã xem đủ.
  const justDone = done && !video.progress?.completed;
  const watchedVideos = ex ? Math.min(ex.totalVideos, ex.watchedVideos + (justDone ? 1 : 0)) : 0;
  const unlocked = ex && watchedVideos >= ex.totalVideos;
  const last = ex?.last;

  return (
    <div className="mt-4 rounded-2xl border border-orange-200 bg-white p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          {done ? (
            <p className="font-medium text-green-700">✓ Bạn đã xem đủ video này</p>
          ) : (
            <p className="text-sm text-gray-700">
              Đã xem <b>{percent}%</b> video này{ex ? "" : "."}
            </p>
          )}
        </div>
        {!done && watchedSec > 0 && (
          <button
            type="button"
            onClick={onJump}
            className="shrink-0 text-sm font-medium px-4 py-2 rounded-full border border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            Xem đoạn chưa xem
          </button>
        )}
      </div>
      {!done && (
        <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
      )}

      {ex && (
        <div className={"mt-3 pt-3 border-t border-orange-100 flex flex-col sm:flex-row sm:items-center gap-3"}>
          <p className="flex-1 text-sm text-gray-700">
            {unlocked ? "📝 " : "🔒 "}
            <b>Bài tập của khoá</b> ({ex.itemCount} câu):{" "}
            {unlocked
              ? last
                ? `lần gần nhất điền từ đúng ${last.autoCorrect}/${last.autoTotal}` +
                  (last.ai?.status === "done" && last.ai.total > 0 ? `, đặt câu đạt ${last.ai.passed}/${last.ai.total}` : "")
                : "đã mở — bạn làm được rồi!"
              : `mở khi bạn xem đủ cả ${ex.totalVideos} video bài giảng bổ sung — đã xem đủ ${watchedVideos}/${ex.totalVideos}.`}
          </p>
          {unlocked && (
            <Link
              to={`/hoc-lieu/${courseSlug}/bai-tap`}
              className="shrink-0 text-center bg-gradient-to-r from-amber-400 to-orange-500 text-white font-medium px-5 py-2.5 rounded-full"
            >
              {last ? "Xem kết quả / làm lại" : "Làm bài tập →"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
