import { useState } from "react";
import { Link } from "react-router-dom";
import { useAdminExamLevels, useDeleteExamLevel, useSaveExamLevel } from "../../../hooks/useExam.js";
import { slugify } from "../../../lib/slugify.js";
import ImageUploadField from "../../../components/admin/ImageUploadField.jsx";
import { useConfirm } from "../../../components/admin/ConfirmDialog.jsx";
import { useToasts, ToastStack } from "../../../components/admin/Toast.jsx";

/** Luyện thi HSK 3.0 — danh sách cấp thi (HSK3, HSK4…). */
export default function AdminExamLevelsPage() {
  const { data: levels = [], isLoading, isError, error } = useAdminExamLevels();
  const save = useSaveExamLevel();
  const remove = useDeleteExamLevel();
  const { confirm, dialog } = useConfirm();
  const toast = useToasts();
  const [editing, setEditing] = useState(null); // null | {} (tạo mới) | level

  const handleDelete = async (level) => {
    if (!(await confirm({ title: `Xoá cấp "${level.name}"?`, message: "Không hoàn tác được.", confirmLabel: "Xoá", tone: "danger" })))
      return;
    try {
      await remove.mutateAsync({ id: level._id });
      toast.success(`Đã xoá cấp "${level.name}".`);
    } catch (err) {
      // Còn video / học viên -> hỏi lại kèm con số cụ thể rồi mới xoá hẳn.
      if (err.code !== "EXAM_LEVEL_IN_USE") return toast.error(err.message);
      if (!(await confirm({ title: "Cấp này vẫn đang được dùng", message: `${err.message} Vẫn xoá?`, confirmLabel: "Xoá hết", tone: "danger" })))
        return;
      try {
        await remove.mutateAsync({ id: level._id, force: true });
        toast.success(`Đã xoá cấp "${level.name}" cùng toàn bộ nội dung.`);
      } catch (e2) {
        toast.error(e2.message);
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl font-heading font-semibold">Cấp thi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mỗi cấp (HSK3, HSK4…) gồm video hướng dẫn kỹ năng thi và đề luyện thi cho học viên được cấp quyền</p>
        </div>
        <button
          onClick={() => setEditing({})}
          className="bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium px-4 py-2 rounded-lg"
        >
          + Thêm cấp thi
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-gray-400">Đang tải...</p>}
        {isError && <p className="p-6 text-sm text-red-600">{error.message}</p>}
        {!isLoading && levels.length === 0 && (
          <p className="p-6 text-sm text-gray-500 text-center">Chưa có cấp thi nào. Bấm “Thêm cấp thi” để tạo.</p>
        )}
        {levels.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-2.5 font-medium">Cấp thi</th>
                <th className="px-4 py-2.5 font-medium">Trạng thái</th>
                <th className="px-4 py-2.5 font-medium">Nội dung</th>
                <th className="px-4 py-2.5 font-medium">Học viên được vào</th>
                <th className="px-4 py-2.5 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {levels.map((c) => (
                <tr key={c._id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">/{c.slug}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "text-xs font-medium px-2 py-1 rounded-full " +
                        (c.status === "published" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500")
                      }
                    >
                      {c.status === "published" ? "Đang hiện" : "Nháp (ẩn)"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/exam/videos?levelId=${c._id}`} className="block text-primary-dark hover:underline">
                      {c.videoCount || 0} video kỹ năng thi
                    </Link>
                    <Link to={`/admin/exam/tests?levelId=${c._id}`} className="block text-primary-dark hover:underline">
                      {c.testCount || 0} đề luyện thi
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/exam/access?levelId=${c._id}`} className="text-primary-dark hover:underline">
                      {c.studentCount} học viên
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => setEditing(c)} className="text-sm text-gray-600 hover:text-gray-900 px-2">
                      Sửa
                    </button>
                    <button onClick={() => handleDelete(c)} className="text-sm text-red-600 hover:text-red-700 px-2">
                      Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <LevelForm
          level={editing}
          submitting={save.isPending}
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            try {
              await save.mutateAsync({ id: editing._id, payload });
              toast.success(editing._id ? "Đã lưu cấp thi." : "Đã tạo cấp thi.");
              setEditing(null);
            } catch (err) {
              toast.error(err.message);
            }
          }}
        />
      )}

      {dialog}
      <ToastStack toasts={toast.items} onDismiss={toast.dismiss} />
    </div>
  );
}

function LevelForm({ level, submitting, onClose, onSubmit }) {
  const isEdit = Boolean(level._id);
  const [form, setForm] = useState({
    name: level.name || "",
    slug: level.slug || "",
    description: level.description || "",
    thumbnail: level.thumbnail || "",
    order: level.order ?? 0,
    status: level.status || "draft",
  });
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const input = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50" onClick={onClose}>
      <form
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 space-y-3 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ ...form, order: Number(form.order) || 0 });
        }}
      >
        <h2 className="text-lg font-heading font-semibold">{isEdit ? "Sửa cấp thi" : "Thêm cấp thi"}</h2>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tên cấp thi *</label>
          <input
            className={input}
            value={form.name}
            placeholder="VD: Luyện thi HSK3 3.0"
            onChange={(e) => {
              const name = e.target.value;
              setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) }));
            }}
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Đường dẫn (slug) *</label>
          <input
            className={input}
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug")(e);
            }}
            required
          />
          <p className="text-[11px] text-gray-400 mt-1">Chữ thường không dấu, số, dấu gạch ngang. VD: hsk3</p>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Mô tả</label>
          <textarea className={input} rows={2} value={form.description} onChange={set("description")} />
        </div>
        <ImageUploadField label="Ảnh bìa — hình vuông (không bắt buộc)" value={form.thumbnail} onChange={(url) => setForm((f) => ({ ...f, thumbnail: url }))} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Thứ tự</label>
            <input type="number" className={input} value={form.order} onChange={set("order")} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Trạng thái</label>
            <select className={input} value={form.status} onChange={set("status")}>
              <option value="draft">Nháp (ẩn)</option>
              <option value="published">Đang hiện</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50">
            Huỷ
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dark text-gray-900 text-sm font-medium disabled:opacity-60"
          >
            {submitting ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </form>
    </div>
  );
}
