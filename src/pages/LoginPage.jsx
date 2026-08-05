import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminLogin } from "../hooks/useAuth.js";
import { useStudentLogin } from "../hooks/useStudentAuth.js";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const adminLogin = useAdminLogin();
  const studentLogin = useStudentLogin();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    setError("");
    setLoading(true);

    // Form đăng nhập dùng chung cho cả học viên và admin — thử tài khoản học
    // viên trước (đa số người dùng), nếu không khớp mới thử tài khoản admin,
    // cuối cùng mới báo lỗi sai email/mật khẩu.
    try {
      await studentLogin.mutateAsync({ email, password });
      navigate("/");
      return;
    } catch (studentErr) {
      // Lỗi 403 = mật khẩu ĐÚNG nhưng thiết bị bị chặn (hoặc tài khoản bị
      // khóa). Hiện thẳng message từ server, không thử đăng nhập admin nữa.
      // Chỉ khi lỗi KHÔNG phải 403 (vd. 401 sai mật khẩu) mới thử tài khoản
      // admin bên dưới.
      if (studentErr.status === 403) {
        setError(studentErr.message);
        setLoading(false);
        return;
      }
      // Các lỗi khác (sai mật khẩu student...) -> thử tiếp tài khoản admin
    }

    try {
      await adminLogin.mutateAsync({ email, password });
      navigate("/admin/students");
    } catch (adminErr) {
      setError("Email hoặc mật khẩu không đúng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-orange-200 shadow-[0_12px_32px_-8px_rgba(230,168,0,0.25)] p-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary mx-auto mb-3 flex items-center justify-center text-xl font-heading font-bold">
            孔
          </div>
          <h1 className="font-heading font-bold text-lg">MOLII EDUCATION</h1>
          <p className="text-xs text-gray-500 mt-1">
            Đăng nhập để tiếp tục học tập
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@email.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-medium bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white mt-2 disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </div>
    </div>
  );
}
