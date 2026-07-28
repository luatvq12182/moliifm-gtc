import { useEffect, useState } from "react";
import { slugify } from "../../lib/slugify.js";
import ImageUploadField from "./ImageUploadField.jsx";

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  thumbnail: "",
  level: "",
  certificate: "",
  order: 0,
  status: "draft",
};

// curriculumId KHÔNG có trong form — khóa học luôn được tạo trong đúng ngữ
// cảnh giáo trình đang chọn ở trang cha (AdminCoursesPage), tránh admin lỡ
// tạo nhầm khóa vào giáo trình khác.
export default function CourseFormModal({
  open,
  mode,
  course,
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
    if (mode === "edit" && course) {
      setForm({
        name: course.name || "",
        slug: course.slug || "",
        description: course.description || "",
        thumbnail: course.thumbnail || "",
        level: course.level || "",
        certificate: course.certificate || "",
        order: course.order ?? 0,
        status: course.status || "draft",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, mode, course]);

  if (!open) return null;

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
        className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-semibold">
            {mode === "edit" ? "Sửa khóa học" : "Thêm khóa học mới"}
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
              Tên khóa học *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={handleNameChange}
              placeholder="HSK1"
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
              placeholder="hsk1"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Chỉ cần duy nhất trong phạm vi giáo trình này, có thể trùng với
              khóa ở giáo trình khác.
            </p>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Mô tả</label>
            <textarea
              value={form.description}
              onChange={handleChange("description")}
              rows={2}
              placeholder="Trình độ sơ cấp - giao tiếp cơ bản hằng ngày"
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
              <label className="text-xs text-gray-500 mb-1 block">Cấp độ</label>
              <input
                type="text"
                value={form.level}
                onChange={handleChange("level")}
                placeholder="Sơ cấp"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Đạt trình độ
              </label>
              <input
                type="text"
                value={form.certificate}
                onChange={handleChange("certificate")}
                placeholder="HSK 1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

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
                  : "Tạo khóa học"}
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
