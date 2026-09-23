import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChangePassword } from "../hooks/useStudentAuth.js";
import { getStudentInfo } from "../lib/studentAuth.js";
import SiteHeader from "../components/SiteHeader.jsx";

const MIN_LENGTH = 6;

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const student = getStudentInfo();
  const changePassword = useChangePassword();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Mật khẩu ban đầu của học viên là SỐ ĐIỆN THOẠI của chính họ. Nhắc thẳng ra
  // ở đây: nhiều người không nhớ mình đang dùng mật khẩu gì, và nếu không nói
  // thì họ sẽ bỏ dở ngay ở ô đầu tiên.
  const stillUsingPhone = form.currentPassword === student?.phone;

  const setField = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setError("");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError("Vui lòng điền đầy đủ cả ba ô.");
      return;
    }
    if (form.newPassword.length < MIN_LENGTH) {
      setError(`Mật khẩu mới phải có ít nhất ${MIN_LENGTH} ký tự.`);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Hai ô mật khẩu mới chưa khớp nhau.");
      return;
    }
    if (form.newPassword === form.currentPassword) {
      setError("Mật khẩu mới phải khác mật khẩu hiện tại.");
      return;
    }
    // Đổi sang chính số điện thoại của mình thì coi như không đổi gì — máy chủ
    // không cấm, nhưng chặn ở đây để học viên không tự vô hiệu hoá việc mình
    // vừa làm.
    if (student?.phone && form.newPassword === student.phone) {
      setError(
        "Mật khẩu mới không nên là số điện thoại của bạn — đó chính là mật khẩu mặc định.",
      );
      return;
    }

    changePassword.mutate(
      { currentPassword: form.currentPassword, newPassword: form.newPassword },
      {
        onSuccess: () => setDone(true),
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader backTo="/" backLabel="Trang chủ" title="Đổi mật khẩu" />

      <main className="max-w-md mx-auto px-4 py-8">
        {done ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
            <span className="inline-flex w-12 h-12 rounded-full bg-green-100 text-green-700 items-center justify-center mb-3">
              <CheckIcon />
            </span>
            <h2 className="text-lg font-heading font-semibold mb-1">
              Đã đổi mật khẩu
            </h2>
            <button
              onClick={() => navigate("/")}
              className="w-full py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900"
            >
              Quay lại học
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            {student?.phone && (
              <p className="text-sm text-gray-500 mb-5 leading-snug">
                Tên đăng nhập của bạn là{" "}
                <span className="font-medium text-gray-700">
                  {student.phone}
                </span>
                . Nếu chưa từng đổi, mật khẩu hiện tại chính là số điện thoại
                đó.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <Field
                label="Mật khẩu hiện tại"
                value={form.currentPassword}
                onChange={setField("currentPassword")}
                autoComplete="current-password"
                hint={
                  stillUsingPhone
                    ? "Bạn đang dùng mật khẩu mặc định — đổi đi là đúng rồi."
                    : ""
                }
              />
              <Field
                label="Mật khẩu mới"
                value={form.newPassword}
                onChange={setField("newPassword")}
                autoComplete="new-password"
                hint={`Ít nhất ${MIN_LENGTH} ký tự.`}
              />
              <Field
                label="Nhập lại mật khẩu mới"
                value={form.confirmPassword}
                onChange={setField("confirmPassword")}
                autoComplete="new-password"
              />

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={changePassword.isPending}
                  className="flex-1 py-2.5 rounded-lg font-medium bg-primary hover:bg-primary-dark text-gray-900 disabled:opacity-60"
                >
                  {changePassword.isPending ? "Đang đổi..." : "Đổi mật khẩu"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, onChange, autoComplete, hint }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      <div className="relative">
        <input
          // Cho phép hiện mật khẩu: học viên gõ trên điện thoại rất hay sai,
          // mà gõ sai ba ô liền thì họ bỏ cuộc chứ không thử lại.
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-700 px-1.5 py-1"
        >
          {visible ? "Ẩn" : "Hiện"}
        </button>
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
