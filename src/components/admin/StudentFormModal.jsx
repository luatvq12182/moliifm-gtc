import { useEffect, useState } from "react";
import { isValidPhone } from "../../lib/phone.js";

const EMPTY_FORM = { name: "", phone: "", email: "" };

// Dùng chung cho cả 2 chế độ:
// - mode="create": student = null, submit gọi API tạo mới
// - mode="edit": student = object học viên đang sửa, form tự điền sẵn dữ liệu
export default function StudentFormModal({
  open,
  mode,
  student,
  onClose,
  onSubmit,
  submitting,
  apiError,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");

  // Mỗi lần modal mở lại (đổi student hoặc chuyển create/edit), reset lại form
  useEffect(() => {
    if (!open) return;
    setFormError("");
    if (mode === "edit" && student) {
      setForm({
        name: student.name || "",
        email: student.email || "",
        phone: student.phone || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, mode, student]);

  if (!open) return null;

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.phone.trim()) {
      setFormError("Vui lòng nhập đầy đủ tên và số điện thoại.");
      return;
    }
    // Báo ngay ở đây thay vì chờ máy chủ: học viên sẽ dùng số này để đăng
    // nhập, gõ nhầm một chữ số là họ không vào được mà không hiểu vì sao.
    if (!isValidPhone(form.phone)) {
      setFormError("Số điện thoại không hợp lệ. Ví dụ: 0901 234 567 hoặc +84 901 234 567.");
      return;
    }

    onSubmit(form);
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
            {mode === "edit" ? "Sửa thông tin học viên" : "Thêm học viên mới"}
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
            <label className="text-xs text-gray-500 mb-1 block">Họ tên *</label>
            <input
              type="text"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Nguyễn Văn A"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Số điện thoại * <span className="text-gray-400">(dùng để đăng nhập)</span>
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={handleChange("phone")}
              placeholder="0901 234 567"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              Email <span className="text-gray-400">(không bắt buộc)</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="hocvien@email.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {(formError || apiError) && (
            <p className="text-xs text-red-600">{formError || apiError}</p>
          )}

          {mode === "create" && (
            <p className="text-[11px] text-gray-400 leading-snug">
              Mật khẩu đăng nhập ban đầu chính là số điện thoại ở trên. Học viên
              tự đổi lại được trong mục Đổi mật khẩu.
            </p>
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
                  : "Tạo học viên"}
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
