import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  getStudentInfo,
  isStudentLoggedIn,
  clearStudentSession,
} from "../lib/studentAuth.js";
import ThumbnailImage from "./ThumbnailImage.jsx";

// Header dùng chung cho mọi trang phía học viên (ngoài trang Login).
// backTo/backLabel là breadcrumb "quay lại" của riêng từng trang — truyền
// backTo={null} (mặc định) ở trang chủ vì logo đã đóng vai trò đó rồi.
export default function SiteHeader({
  backTo = null,
  backLabel = "",
  title = "",
}) {
  const navigate = useNavigate();
  const loggedIn = isStudentLoggedIn();
  const student = getStudentInfo();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    clearStudentSession();
    setMenuOpen(false);
    navigate("/login");
  };

  return (
    <header className="bg-primary px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <ThumbnailImage
            src="/images/logo-moliifm.png"
            alt="Molii"
            className="w-24 object-cover shrink-0"
          />
        </Link>

        {backTo && (
          <div className="min-w-0 border-l border-white/40 pl-3">
            <Link
              to={backTo}
              className="text-xs text-gray-700 hover:underline inline-flex items-center gap-1"
            >
              <ArrowLeftIcon /> {backLabel}
            </Link>
            {title && (
              <p className="text-sm font-heading font-semibold text-gray-900 truncate">
                {title}
              </p>
            )}
          </div>
        )}

        {!backTo && title && (
          <p className="text-sm font-heading font-semibold text-gray-900 truncate border-l border-white/40 pl-3">
            {title}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {loggedIn ? (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2"
            >
              <span className="w-9 h-9 rounded-full bg-white flex items-center justify-center font-medium text-gray-700">
                {student?.name?.[0] || "H"}
              </span>
              <span className="text-sm font-medium hidden sm:inline">
                {student?.name || "Học viên"}
              </span>
              <ChevronDownIcon />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-20">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Đăng xuất
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <Link
            to="/login"
            className="text-sm font-medium bg-white text-gray-800 px-4 py-2 rounded-full hover:bg-gray-50"
          >
            Đăng nhập
          </Link>
        )}
      </div>
    </header>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.73 21a2 2 0 01-3.46 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline
        points="6 9 12 15 18 9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
