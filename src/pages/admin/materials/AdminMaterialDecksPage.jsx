import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  adminDeckPagePath,
  useAdminDecks,
  useAdminMaterialCourses,
  useDeleteDeck,
  useReorderDecks,
  useRetryDeck,
  useUpdateDeck,
  useUploadDeck,
  useAddGoogleDeck,
  useSyncGoogleDeck,
} from "../../../hooks/useMaterials.js";
import SlideViewer from "../../../components/materials/SlideViewer.jsx";
import { useConfirm } from "../../../components/admin/ConfirmDialog.jsx";
import { useToasts, ToastStack } from "../../../components/admin/Toast.jsx";

const ACCEPT = ".pptx,.ppt,.odp,.pdf";
const MAX_MB = 100;

const formatSize = (bytes) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Học liệu khoá học — bộ slide của một khoá: tải lên, xem trước, sắp xếp, ẩn/hiện.
 *
 * Tải file lên xong máy chủ mới chuyển sang ảnh (vài giây tới vài phút tuỳ số
 * trang); danh sách tự cập nhật trạng thái, không cần tải lại trang.
 */
export default function AdminMaterialDecksPage() {
  const [params, setParams] = useSearchParams();
  const { data: courses = [] } = useAdminMaterialCourses();
  const courseId = params.get("courseId") || courses[0]?._id || "";
  const course = courses.find((c) => c._id === courseId);
  const { data: decks = [], isLoading, isError, error } = useAdminDecks(courseId);

  const upload = useUploadDeck();
  const update = useUpdateDeck();
  const retry = useRetryDeck();
  const remove = useDeleteDeck();
  const reorder = useReorderDecks();
  const addGoogle = useAddGoogleDeck();
  const syncGoogle = useSyncGoogleDeck();
  const [mode, setMode] = useState("file"); // file | google
  const [googleUrl, setGoogleUrl] = useState("");
  const [googleTitle, setGoogleTitle] = useState("");
  const { confirm, dialog } = useConfirm();
  const toast = useToasts();

  const [progress, setProgress] = useState(null); // % đang tải lên, null = không tải
  const [publishNow, setPublishNow] = useState(true);
  const [previewing, setPreviewing] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const fileRef = useRef(null);
  const replaceRef = useRef(null);
  const replaceTarget = useRef(null);

  const checkFile = (file) => {
    if (!file) return false;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File ${formatSize(file.size)} vượt quá ${MAX_MB} MB. Hãy nén ảnh trong slide hoặc tách thành nhiều bộ.`);
      return false;
    }
    return true;
  };

  const doUpload = async (file, deckId) => {
    if (!checkFile(file)) return;
    setProgress(0);
    try {
      await upload.mutateAsync({
        courseId,
        file,
        deckId,
        status: publishNow ? "published" : "draft",
        onProgress: setProgress,
      });
      toast.success(deckId ? "Đã tải file mới, đang chuyển đổi..." : `Đã tải "${file.name}", đang chuyển đổi...`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProgress(null);
    }
  };

  const move = (i, delta) => {
    const ids = decks.map((d) => d._id);
    const j = i + delta;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder.mutate({ courseId, ids }, { onError: (err) => toast.error(err.message) });
  };

  const toggleStatus = (d) =>
    update.mutate(
      { id: d._id, payload: { status: d.status === "published" ? "draft" : "published" } },
      {
        onSuccess: () => toast.success(d.status === "published" ? "Đã ẩn bộ slide." : "Học viên đã xem được bộ slide này."),
        onError: (err) => toast.error(err.message),
      },
    );

  const handleDelete = async (d) => {
    if (!(await confirm({ title: `Xoá "${d.title}"?`, message: "Học viên sẽ không xem được nữa. Không hoàn tác được.", confirmLabel: "Xoá", tone: "danger" })))
      return;
    remove.mutate(d._id, { onSuccess: () => toast.success("Đã xoá bộ slide."), onError: (err) => toast.error(err.message) });
  };

  // Mỗi dòng một link — dán cả loạt file từ Drive một lần.
  const googleLines = googleUrl.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Link thư mục: máy chủ bung ra từng file trong đó -> chưa biết trước bao nhiêu bộ.
  const hasFolder = googleLines.some((l) => /\/folders\//.test(l));
  const oneDeck = googleLines.length <= 1 && !hasFolder;

  const doAddGoogle = async (e) => {
    e.preventDefault();
    try {
      const res = await addGoogle.mutateAsync({
        courseId,
        urls: googleLines,
        title: oneDeck ? googleTitle.trim() : "",
        status: publishNow ? "published" : "draft",
      });
      setGoogleUrl("");
      setGoogleTitle("");
      const n = res?.decks?.length || 0;
      const skipped = res?.skipped || [];
      toast.success(
        (n > 1 ? `Đã thêm ${n} bộ slide, đang lấy từ Google...` : "Đã thêm, đang lấy slide từ Google...") +
          (skipped.length ? ` Bỏ qua ${skipped.length} mục không phải slide: ${skipped.join(", ")}.` : ""),
      );
    } catch (err) {
      toast.error(err.message);
    }
  };

  const doSync = async (d) => {
    if (
      !(await confirm({
        title: `Cập nhật "${d.title}" từ Google?`,
        message: "Lấy lại bản mới nhất trên Google Slides. Trong lúc lấy (vài giây tới vài phút), học viên tạm chưa xem được bộ slide này.",
        confirmLabel: "Cập nhật",
      }))
    )
      return;
    syncGoogle.mutate(d._id, {
      onSuccess: () => toast.success("Đang lấy bản mới từ Google..."),
      onError: (err) => toast.error(err.message),
    });
  };

  const previewPath = useCallback((n) => adminDeckPagePath(previewing?._id, n), [previewing]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-heading font-semibold">Bộ slide bài giảng</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Tải lên file PowerPoint / PDF, hoặc dán link Google Slides / Google Drive. Học viên chỉ xem được trên web, không tải về được.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 space-y-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Khoá học liệu</label>
          <select
            value={courseId}
            onChange={(e) => setParams({ courseId: e.target.value })}
            className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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

        {courseId && (
          <div className="rounded-xl border-2 border-dashed border-gray-300 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-gray-800 mr-2">Thêm bộ slide vào “{course?.name}”</p>
              {[
                ["file", "Tải file lên"],
                ["google", "Dán link Google (Slides / Drive)"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value)}
                  className={
                    "px-3 py-1.5 text-xs font-medium rounded-lg border " +
                    (mode === value ? "bg-primary border-primary-dark text-gray-900" : "border-gray-300 text-gray-600 hover:bg-gray-50")
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {mode === "file" ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <p className="flex-1 text-xs text-gray-500">
                  .pptx, .ppt, .odp, .pdf — tối đa {MAX_MB} MB. Tên bộ slide lấy theo tên file, đổi lại được sau.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPT}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    e.target.value = "";
                    doUpload(f);
                  }}
                />
                <button
                  type="button"
                  disabled={progress !== null}
                  onClick={() => fileRef.current?.click()}
                  className="bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60 shrink-0"
                >
                  {progress !== null ? `Đang tải lên ${progress}%` : "Chọn file slide"}
                </button>
              </div>
            ) : (
              <form onSubmit={doAddGoogle} className="space-y-2">
                <textarea
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                  rows={Math.min(8, Math.max(2, googleLines.length + 1))}
                  placeholder={"Dán link Google Slides, link file PDF / PowerPoint, hoặc link cả thư mục trên Google Drive.\nNhiều link thì mỗi dòng một link."}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  {/* Tự đặt tên chỉ khi thêm MỘT file; nhiều link / thư mục thì tên lấy theo tên file. */}
                  {oneDeck ? (
                    <input
                      value={googleTitle}
                      onChange={(e) => setGoogleTitle(e.target.value)}
                      placeholder="Tên bài giảng (để trống = lấy theo tên file)"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  ) : (
                    <p className="flex-1 text-xs text-gray-500">
                      {hasFolder
                        ? "Mỗi file PDF / PowerPoint / Google Slides trong thư mục thành một bộ slide, xếp theo số bài, tên lấy theo tên file."
                        : `${googleLines.length} link — mỗi link thành một bộ slide, tên lấy theo tên file trên Google.`}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={addGoogle.isPending || googleLines.length === 0}
                    className="bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-60 shrink-0"
                  >
                    {addGoogle.isPending
                      ? hasFolder
                        ? "Đang đọc thư mục..."
                        : "Đang thêm..."
                      : hasFolder
                        ? "Thêm cả thư mục"
                        : googleLines.length > 1
                          ? `Thêm ${googleLines.length} bộ slide`
                          : "Thêm"}
                  </button>
                </div>
                <div className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                  Trước khi dán: trên Google Drive / Google Slides, bấm <b>Chia sẻ</b> → “Bất kỳ ai có đường liên kết” (Người
                  xem). Dán link <b>thư mục</b> thì lấy mọi file PDF / PowerPoint trong đó (không lấy thư mục con). Máy chủ lấy
                  một bản về để hiển thị — học viên <b>không thấy link Google</b>,
                  không tải về được. Khi sửa file trên Google, bấm “Cập nhật từ Google”.
                </div>
              </form>
            )}

            <label className="inline-flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
              Cho học viên xem ngay khi chuyển đổi xong
            </label>
          </div>
        )}
        {progress !== null && (
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <input
        ref={replaceRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files[0];
          e.target.value = "";
          if (replaceTarget.current) doUpload(f, replaceTarget.current);
        }}
      />

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-gray-400">Đang tải...</p>}
        {isError && <p className="p-6 text-sm text-red-600">{error.message}</p>}
        {courseId && !isLoading && decks.length === 0 && (
          <p className="p-6 text-sm text-gray-500 text-center">Khoá này chưa có bộ slide nào.</p>
        )}
        <ul className="divide-y divide-gray-100">
          {decks.map((d, i) => (
            <li key={d._id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 rounded border border-gray-200 text-gray-500 disabled:opacity-30" title="Lên">
                  ↑
                </button>
                <button onClick={() => move(i, 1)} disabled={i === decks.length - 1} className="w-7 h-7 rounded border border-gray-200 text-gray-500 disabled:opacity-30" title="Xuống">
                  ↓
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{d.title}</p>
                <p className="text-xs text-gray-400 truncate">
                  {d.source?.kind === "google" ? (
                    <>
                      {d.source.googleType === "drive" ? "Google Drive" : "Google Slides"} ·{" "}
                      <a href={d.source.googleUrl} target="_blank" rel="noreferrer" className="underline hover:text-gray-600">
                        mở bản gốc
                      </a>
                    </>
                  ) : (
                    <>
                      {d.source?.originalName} · {formatSize(d.source?.bytes || 0)}
                    </>
                  )}
                </p>
                <ConversionStatus deck={d} onRetry={() => retry.mutate(d._id, { onError: (err) => toast.error(err.message) })} />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleStatus(d)}
                  className={
                    "text-xs font-medium px-2.5 py-1.5 rounded-lg border " +
                    (d.status === "published" ? "border-green-200 bg-green-50 text-green-700" : "border-gray-200 bg-gray-50 text-gray-500")
                  }
                  title="Bấm để đổi"
                >
                  {d.status === "published" ? "Đang hiện" : "Đang ẩn"}
                </button>
                <button
                  onClick={() => setPreviewing(d)}
                  disabled={d.conversion !== "ready"}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                >
                  Xem trước
                </button>
                <button onClick={() => setRenaming(d)} className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50">
                  Đổi tên
                </button>
                {d.source?.kind === "google" && (
                  <button
                    onClick={() => doSync(d)}
                    disabled={d.conversion === "processing"}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Cập nhật từ Google
                  </button>
                )}
                <button
                  onClick={() => {
                    replaceTarget.current = d._id;
                    replaceRef.current?.click();
                  }}
                  disabled={progress !== null}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40"
                >
                  Thay file
                </button>
                <button onClick={() => handleDelete(d)} className="text-xs px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50">
                  Xoá
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {previewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setPreviewing(null)}>
          <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl p-4 max-h-[95vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <p className="font-heading font-semibold flex-1 truncate">Xem trước: {previewing.title}</p>
              <button onClick={() => setPreviewing(null)} className="text-sm text-gray-500 hover:text-gray-800 px-2">
                Đóng ✕
              </button>
            </div>
            <SlideViewer key={`${previewing._id}-${previewing.version}`} pages={previewing.pages} pagePath={previewPath} watermark="" />
          </div>
        </div>
      )}

      {renaming && (
        <RenameDialog
          deck={renaming}
          saving={update.isPending}
          onClose={() => setRenaming(null)}
          onSave={(payload) =>
            update.mutate(
              { id: renaming._id, payload },
              {
                onSuccess: () => {
                  toast.success("Đã lưu.");
                  setRenaming(null);
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

function ConversionStatus({ deck, onRetry }) {
  if (deck.conversion === "processing")
    return (
      <p className="text-xs text-amber-700 mt-0.5 flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full border-2 border-amber-300 border-t-amber-700 animate-spin" />
        {deck.source?.kind === "google" ? "Đang lấy slide từ Google..." : "Đang chuyển sang ảnh..."} (vài giây tới vài phút tuỳ số trang)
      </p>
    );
  if (deck.conversion === "failed")
    return (
      <p className="text-xs text-red-600 mt-0.5">
        Lỗi: {deck.conversionError || "Không chuyển được file."}{" "}
        <button onClick={onRetry} className="underline font-medium">
          Thử lại
        </button>
      </p>
    );
  return <p className="text-xs text-gray-500 mt-0.5">{deck.pageCount} trang</p>;
}

function RenameDialog({ deck, saving, onClose, onSave }) {
  const [title, setTitle] = useState(deck.title);
  const [description, setDescription] = useState(deck.description || "");
  const input = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50" onClick={onClose}>
      <form
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-3"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ title, description });
        }}
      >
        <h2 className="text-lg font-heading font-semibold">Đổi tên bộ slide</h2>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tên hiển thị cho học viên *</label>
          <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Mô tả ngắn</label>
          <textarea className={input} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
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
