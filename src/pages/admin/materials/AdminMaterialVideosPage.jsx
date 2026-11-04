import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  adminVideoThumbPath,
  useAddVideo,
  useAdminMaterialCourses,
  useAdminVideos,
  useDeleteVideo,
  useReorderVideos,
  useUpdateVideo,
} from "../../../hooks/useMaterials.js";
import AuthImage from "../../../components/materials/AuthImage.jsx";
import VideoPlayer, { formatTime } from "../../../components/materials/VideoPlayer.jsx";
import { useConfirm } from "../../../components/admin/ConfirmDialog.jsx";
import { useToasts, ToastStack } from "../../../components/admin/Toast.jsx";

/**
 * Học liệu khoá học — video bài giảng của một khoá: dán link YouTube (video để
 * "Không công khai"), sắp xếp, ẩn/hiện, xem trước. Quyền xem dùng chung với
 * slide của khoá.
 */
export default function AdminMaterialVideosPage() {
  const [params, setParams] = useSearchParams();
  const { data: courses = [] } = useAdminMaterialCourses();
  const courseId = params.get("courseId") || courses[0]?._id || "";
  const course = courses.find((c) => c._id === courseId);
  const { data: videos = [], isLoading, isError, error } = useAdminVideos(courseId);

  const add = useAddVideo();
  const update = useUpdateVideo();
  const remove = useDeleteVideo();
  const reorder = useReorderVideos();
  const { confirm, dialog } = useConfirm();
  const toast = useToasts();

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  const [previewing, setPreviewing] = useState(null);
  const [editing, setEditing] = useState(null);

  const input = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  const doAdd = async (e) => {
    e.preventDefault();
    try {
      const v = await add.mutateAsync({ courseId, url: url.trim(), title: title.trim(), status: publishNow ? "published" : "draft" });
      setUrl("");
      setTitle("");
      toast.success(`Đã thêm "${v.title}".`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const move = (i, delta) => {
    const ids = videos.map((v) => v._id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder.mutate({ courseId, ids }, { onError: (err) => toast.error(err.message) });
  };

  const toggleStatus = (v) =>
    update.mutate(
      { id: v._id, payload: { status: v.status === "published" ? "draft" : "published" } },
      {
        onSuccess: () => toast.success(v.status === "published" ? "Đã ẩn video." : "Học viên đã xem được video này."),
        onError: (err) => toast.error(err.message),
      },
    );

  const handleDelete = async (v) => {
    if (
      !(await confirm({
        title: `Xoá "${v.title}"?`,
        message: "Học viên sẽ không xem được nữa, và mất chỗ đang xem dở. Video trên YouTube vẫn còn.",
        confirmLabel: "Xoá",
        tone: "danger",
      }))
    )
      return;
    remove.mutate(v._id, { onSuccess: () => toast.success("Đã xoá video."), onError: (err) => toast.error(err.message) });
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-heading font-semibold">Video bài giảng</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Dán link video YouTube. Học viên xem ngay trên site, không thấy link YouTube; site tự nhớ chỗ học viên đang xem dở.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Khoá học liệu</label>
          <select value={courseId} onChange={(e) => setParams({ courseId: e.target.value })} className={input + " w-full sm:w-80"}>
            {courses.length === 0 && <option value="">Chưa có khoá — tạo ở mục “Khoá học liệu”</option>}
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
                {c.status !== "published" ? " (nháp)" : ""}
              </option>
            ))}
          </select>
        </div>

        {courseId && (
          <form onSubmit={doAdd} className="rounded-xl border-2 border-dashed border-gray-300 p-4 space-y-2">
            <p className="text-sm font-medium text-gray-800">Thêm video vào “{course?.name}”</p>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Link YouTube, vd. https://youtu.be/… hoặc https://www.youtube.com/watch?v=…"
              className={input + " w-full"}
              required
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tên video (để trống = lấy theo tên trên YouTube)"
                className={input + " flex-1"}
              />
              <button
                type="submit"
                disabled={add.isPending || !url.trim()}
                className="bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60 shrink-0"
              >
                {add.isPending ? "Đang đọc video..." : "Thêm video"}
              </button>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
              Cho học viên xem ngay
            </label>
            <div className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
              Trên YouTube Studio, đặt <b>Chế độ hiển thị</b> của video là <b>Không công khai</b> và để bật “Cho phép nhúng”.
              Đừng chọn <b>Riêng tư</b> — video riêng tư không phát được trên site.
            </div>
          </form>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-gray-400">Đang tải...</p>}
        {isError && <p className="p-6 text-sm text-red-600">{error.message}</p>}
        {courseId && !isLoading && videos.length === 0 && <p className="p-6 text-sm text-gray-500 text-center">Khoá này chưa có video nào.</p>}
        <ul className="divide-y divide-gray-100">
          {videos.map((v, i) => (
            <li key={v._id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 rounded border border-gray-200 text-gray-500 disabled:opacity-30" title="Lên">
                    ↑
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === videos.length - 1} className="w-7 h-7 rounded border border-gray-200 text-gray-500 disabled:opacity-30" title="Xuống">
                    ↓
                  </button>
                </div>
                <div className="relative w-28 sm:w-32 aspect-video rounded-lg overflow-hidden bg-gray-200 shrink-0">
                  {v.hasThumb && <AuthImage path={adminVideoThumbPath(v._id)} alt={v.title} className="absolute inset-0 w-full h-full" />}
                  {v.durationSec > 0 && (
                    <span className="absolute bottom-1 right-1 text-[10px] font-medium bg-black/75 text-white px-1 py-0.5 rounded">
                      {formatTime(v.durationSec)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 line-clamp-2">{v.title}</p>
                  <p className="text-xs text-gray-400 truncate">
                    YouTube ·{" "}
                    <a href={v.youtubeUrl || `https://youtu.be/${v.youtubeId}`} target="_blank" rel="noreferrer" className="underline hover:text-gray-600">
                      mở link gốc
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleStatus(v)}
                  className={
                    "text-xs font-medium px-2.5 py-1.5 rounded-lg border " +
                    (v.status === "published" ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-500")
                  }
                  title="Bấm để đổi"
                >
                  {v.status === "published" ? "Đang hiện" : "Đang ẩn"}
                </button>
                <button onClick={() => setPreviewing(v)} className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
                  Xem trước
                </button>
                <button onClick={() => setEditing(v)} className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
                  Sửa
                </button>
                <button onClick={() => handleDelete(v)} className="text-xs px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50">
                  Xoá
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {previewing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setPreviewing(null)}>
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <p className="font-heading font-semibold flex-1 truncate">Xem trước: {previewing.title}</p>
              <button onClick={() => setPreviewing(null)} className="text-sm text-gray-500 hover:text-gray-800 px-2">
                Đóng ✕
              </button>
            </div>
            <VideoPlayer
              key={`${previewing._id}-${previewing.youtubeId}`}
              youtubeId={previewing.youtubeId}
              title={previewing.title}
              thumbPath={previewing.hasThumb ? adminVideoThumbPath(previewing._id) : ""}
              onDuration={(d) => {
                // Máy chủ không đọc được thời lượng (YouTube chặn) -> lấy theo trình phát.
                if (!previewing.durationSec && d > 0) update.mutate({ id: previewing._id, payload: { durationSec: d } });
              }}
            />
          </div>
        </div>
      )}

      {editing && (
        <EditDialog
          video={editing}
          saving={update.isPending}
          onClose={() => setEditing(null)}
          onSave={(payload) =>
            update.mutate(
              { id: editing._id, payload },
              {
                onSuccess: () => {
                  toast.success("Đã lưu.");
                  setEditing(null);
                },
                onError: (err) => toast.error(err.message),
              },
            )
          }
        />
      )}

      {dialog}
      <ToastStack toasts={toast.items} onDismiss={toast.dismiss} />
    </div>
  );
}

function EditDialog({ video, saving, onClose, onSave }) {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description || "");
  const [url, setUrl] = useState(video.youtubeUrl || `https://youtu.be/${video.youtubeId}`);
  const original = video.youtubeUrl || `https://youtu.be/${video.youtubeId}`;
  const input = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50" onClick={onClose}>
      <form
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-3"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ title, description, ...(url.trim() !== original ? { url: url.trim() } : {}) });
        }}
      >
        <h2 className="text-lg font-heading font-semibold">Sửa video</h2>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tên hiển thị cho học viên *</label>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Mô tả ngắn</label>
          <textarea className={input} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Link YouTube</label>
          <input className={input} value={url} onChange={(e) => setUrl(e.target.value)} required />
          <p className="text-[11px] text-gray-400 mt-1">Đổi sang video khác (vd. bản đăng lại) thì chỗ đang xem dở của học viên sẽ được xoá.</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">
            Huỷ
          </button>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium disabled:opacity-60">
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
}
