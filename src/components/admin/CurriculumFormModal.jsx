import { useEffect, useState } from "react";
import ImageUploadField from "./ImageUploadField.jsx";
import { slugify } from "../../lib/slugify.js";

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  thumbnail: "",
  order: 0,
  status: "draft",
};

// Dùng chung cho tạo mới và sửa, giống pattern StudentFormModal đã có.
export default function CurriculumFormModal({
  open,
  mode,
  curriculum,
  onClose,
  onSubmit,
  submitting,
  apiError,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFormError("");
    setSlugTouched(mode === "edit");
    if (mode === "edit" && curriculum) {
      setForm({
        name: curriculum.name || "",
        slug: curriculum.slug || "",
        description: curriculum.description || "",
        thumbnail: curriculum.thumbnail || "",
        order: curriculum.order ?? 0,
        status: curriculum.status || "draft",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, mode, curriculum]);

  if (!open) return null;

  // Lúc tạo mới, gõ tên sẽ tự sinh slug — trừ khi người dùng đã tự tay sửa
  // ô slug (slugTouched = true), lúc đó thôi không tự ghi đè nữa.
  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((f) => ({
      ...f,
      name,
      slug: slugTouched ? f.slug : slugify(name),
    }));
  };

  const handleSlugChange = (e) => {
    setSlugTouched(true);
    setForm((f) => ({ ...f, slug: e.target.value }));
  };

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.slug.trim()) {
      setFormError("Vui lòng nhập đầy đủ tên và slug.");
      return;
    }

    onSubmit({ ...form, order: Number(form.order) || 0 });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold">
            {mode === "edit" ? "Sửa giáo trình" : "Thêm giáo trình mới"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400"
          >
            <CloseIcon />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Tên giáo trình *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={handleNameChange}
              placeholder="Giáo trình HSK tiêu chuẩn 2.0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Slug (dùng trong URL) *
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={handleSlugChange}
              placeholder="gtc-2-0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Tự sinh theo tên, có thể sửa tay nếu cần.
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Mô tả</label>
            <textarea
              value={form.description}
              onChange={handleChange("description")}
              rows={2}
              placeholder="Mô tả ngắn về giáo trình..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <ImageUploadField
            label="Ảnh thumbnail"
            value={form.thumbnail}
            onChange={(url) => setForm((f) => ({ ...f, thumbnail: url }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Thứ tự hiển thị
              </label>
              <input
                type="number"
                value={form.order}
                onChange={handleChange("order")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Trạng thái
              </label>
              <select
                value={form.status}
                onChange={handleChange("status")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="draft">Bản nháp</option>
                <option value="published">Đã xuất bản</option>
              </select>
            </div>
          </div>

          {(formError || apiError) && (
            <p className="text-xs text-red-600">{formError || apiError}</p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg font-medium bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white disabled:opacity-60"
            >
              {submitting
                ? "Đang lưu..."
                : mode === "edit"
                  ? "Lưu thay đổi"
                  : "Tạo giáo trình"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  );
}
