import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  adminVideoThumbPath,
  useAddVideo,
  useAdminMaterialCourses,
  useAdminVideos,
  useDeleteVideo,
  useImportPlaylist,
  useReorderVideos,
  useUpdateVideo,
} from "../../../hooks/useMaterials.js";
import AuthImage from "../../../components/materials/AuthImage.jsx";
import VideoPlayer, { formatTime } from "../../../components/materials/VideoPlayer.jsx";
import { useConfirm } from "../../../components/admin/ConfirmDialog.jsx";
import { useToasts, ToastStack } from "../../../components/admin/Toast.jsx";
import { VIDEO_GROUPS, groupOf } from "../../../data/videoGroups.js";

const GROUP_NOTE = {
  supplement: "Học viên xem đủ hết video mục này mới làm được bài tập của khoá.",
  curriculum: "Chỉ để xem — không có bài tập, không bắt xem đủ.",
};

/**
 * Học liệu khoá học — video bài giảng của một khoá: dán link YouTube (video để
 * "Không công khai"), sắp xếp, ẩn/hiện, xem trước. Quyền xem dùng chung với
 * slide của khoá.
 *
 * Hai mục video (bổ sung / theo giáo trình) chia tab, ghi trên đường dẫn
 * ?nhom=…; video thêm mới vào đúng mục của tab đang mở.
 */
export default function AdminMaterialVideosPage() {
  const [params, setParams] = useSearchParams();
  const { data: courses = [] } = useAdminMaterialCourses();
  const courseId = params.get("courseId") || courses[0]?._id || "";
  const course = courses.find((c) => c._id === courseId);
  const { data: videos = [], isLoading, isError, error } = useAdminVideos(courseId);

  const add = useAddVideo();
  const importList = useImportPlaylist();
  const update = useUpdateVideo();
  const remove = useDeleteVideo();
  const reorder = useReorderVideos();
  const { confirm, dialog } = useConfirm();
  const toast = useToasts();

  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [publishNow, setPublishNow] = useState(true);
  // Tab đang mở = mục video; thêm video mới vào đúng mục này.
  const group = (VIDEO_GROUPS.find((g) => g.slug === params.get("nhom")) || VIDEO_GROUPS[0]).id;
  const setTab = (g) => setParams({ courseId, nhom: VIDEO_GROUPS.find((x) => x.id === g).slug }, { replace: true });
  const groupInfo = VIDEO_GROUPS.find((g) => g.id === group);
  const list = videos.filter((v) => groupOf(v) === group);
  const [previewing, setPreviewing] = useState(null);
  const [editing, setEditing] = useState(null);

  const input = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  const doAdd = async (e) => {
    e.preventDefault();
    try {
      const v = await add.mutateAsync({ courseId, url: url.trim(), title: title.trim(), status: publishNow ? "published" : "draft", group });
      setUrl("");
      setTitle("");
      toast.success(`Đã thêm "${v.title}".`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Sắp xếp trong từng nhóm.
  // Link có danh sách phát (?list=…) -> cho nhập cả danh sách. Link chỉ là trang
  // danh sách (youtube.com/playlist) thì không có video lẻ để thêm.
  const hasList = /[?&]list=[A-Za-z0-9_-]{10,}/.test(url);
  const playlistOnly = /youtube\.com\/playlist/i.test(url);

  const doImport = async () => {
    try {
      const res = await importList.mutateAsync({ courseId, url: url.trim(), group, status: publishNow ? "published" : "draft" });
      setUrl("");
      setTitle("");
      const skipped = res.skipped || [];
      const already = skipped.filter((x) => x.reason === "đã có trong khoá").length;
      const hidden = skipped.length - already;
      toast.success(
        `Đã nhập ${res.created} video từ danh sách “${res.playlistTitle || "YouTube"}”.` +
          (already ? ` Bỏ qua ${already} video đã có.` : "") +
          (hidden ? ` Bỏ qua ${hidden} video riêng tư / đã xoá.` : "") +
          (res.hasMore ? " Danh sách dài hơn 100 video — phần sau chưa nhập, hãy chia nhỏ danh sách." : ""),
      );
    } catch (err) {
      toast.error(err.message);
    }
  };

  const move = (list, i, delta) => {
    const ids = list.map((v) => v._id);
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

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div>
          <label className="text-xs text-gray-500 mb-1 block">Khoá học liệu</label>
          <select
            value={courseId}
            onChange={(e) => setParams({ courseId: e.target.value, nhom: groupInfo.slug })}
            className={input + " w-full sm:w-80"}
          >
            {courses.length === 0 && <option value="">Chưa có khoá — tạo ở mục “Khoá học liệu”</option>}
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
                {c.status !== "published" ? " (nháp)" : ""}
              </option>
            ))}
          </select>
          </div>
          {/* Mỗi khoá MỘT bộ bài tập — học viên xem hết video nhóm bổ sung mới làm. */}
          {course && (
            <Link
              to={`/admin/materials/courses/${course._id}/exercise`}
              className={
                "text-sm text-center px-4 py-2 rounded-lg border " +
                (course.exerciseCount ? "border-violet-200 bg-violet-50 text-violet-700" : "border-gray-300 hover:bg-gray-50")
              }
            >
              {course.exerciseCount ? `Bài tập của khoá (${course.exerciseCount} câu)` : "+ Soạn bài tập của khoá"}
            </Link>
          )}
        </div>
      </div>

      {courseId && (
        <>
          <div className="flex gap-1 border-b border-gray-200 mb-4" role="tablist">
            {VIDEO_GROUPS.map((g) => {
              const n = videos.filter((v) => groupOf(v) === g.id).length;
              const active = g.id === group;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(g.id)}
                  className={
                    "px-4 py-2.5 -mb-px text-sm font-medium border-b-2 transition " +
                    (active ? "border-primary-dark text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800")
                  }
                >
                  {g.short} <span className={"ml-1 text-xs px-1.5 py-0.5 rounded-full " + (active ? "bg-primary/30" : "bg-gray-100")}>{n}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 -mt-2 mb-3">{GROUP_NOTE[group]}</p>

          <form onSubmit={doAdd} className="rounded-xl border-2 border-dashed border-gray-300 p-4 space-y-2 bg-white mb-4">
            <p className="text-sm font-medium text-gray-800">
              Thêm video vào mục “{groupInfo.short}”
            </p>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Link 1 video YouTube, hoặc link danh sách phát (youtube.com/playlist?list=…) để nhập cả danh sách"
              className={input + " w-full"}
              required
            />
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {playlistOnly ? (
                <p className="flex-1 text-xs text-gray-500">
                  Link danh sách phát — mỗi video trong danh sách thành một video của mục này, đúng thứ tự; video đã có sẽ bỏ qua.
                </p>
              ) : (
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Tên video (để trống = lấy theo tên trên YouTube)"
                  className={input + " flex-1"}
                />
              )}
              {!playlistOnly && (
                <button
                  type="submit"
                  disabled={add.isPending || importList.isPending || !url.trim()}
                  className={
                    "text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60 shrink-0 " +
                    (hasList ? "border border-gray-300 hover:bg-gray-50" : "bg-primary hover:bg-primary-dark text-gray-900")
                  }
                >
                  {add.isPending ? "Đang đọc video..." : hasList ? "Chỉ thêm video này" : "Thêm video"}
                </button>
              )}
              {hasList && (
                <button
                  type="button"
                  onClick={doImport}
                  disabled={importList.isPending || add.isPending}
                  className="bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60 shrink-0"
                >
                  {importList.isPending ? "Đang nhập danh sách..." : "Nhập cả danh sách phát"}
                </button>
              )}
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
              Cho học viên xem ngay
            </label>
            <div className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
              Trên YouTube Studio, đặt <b>Chế độ hiển thị</b> của video (và danh sách phát) là <b>Không công khai</b> và để bật
              “Cho phép nhúng”. Đừng chọn <b>Riêng tư</b> — video / danh sách riêng tư không đọc được, không phát được trên site.
            </div>
          </form>
        </>
      )}

      {isLoading && <p className="p-6 text-sm text-gray-400">Đang tải...</p>}
      {isError && <p className="p-6 text-sm text-red-600">{error.message}</p>}
      {courseId && !isLoading && (
        <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
          {list.length === 0 ? (
            <p className="p-6 text-sm text-gray-500 text-center">Mục này chưa có video nào.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {list.map((v, i) => (
            <li key={v._id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => move(list, i, -1)} disabled={i === 0} className="w-7 h-7 rounded border border-gray-200 text-gray-500 disabled:opacity-30" title="Lên">
                        ↑
                      </button>
                      <button onClick={() => move(list, i, 1)} disabled={i === list.length - 1} className="w-7 h-7 rounded border border-gray-200 text-gray-500 disabled:opacity-30" title="Xuống">
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
          )}
        </section>
      )}

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
  const [group, setGroup] = useState(groupOf(video));
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
          onSave({ title, description, group, ...(url.trim() !== original ? { url: url.trim() } : {}) });
        }}
      >
        <h2 className="text-lg font-heading font-semibold">Sửa video</h2>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tên hiển thị cho học viên *</label>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Nhóm</label>
          <select className={input} value={group} onChange={(e) => setGroup(e.target.value)}>
            {VIDEO_GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
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
