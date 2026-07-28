import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAdminSession, getAdminInfo } from "../lib/adminAuth.js";

const NAV_ITEMS = [
  {
    type: "link",
    to: "/admin/students",
    label: "Tài khoản học viên",
    icon: <UsersIcon />,
  },
  {
    type: "group",
    label: "Luyện nghe nói qua video AI",
    icon: <VideoIcon />,
    children: [
      { to: "/admin/gtc/curricula", label: "Giáo trình", available: true },
      { to: '/admin/gtc/courses', label: 'Khóa học', available: true },
      { to: "/admin/gtc/lessons", label: "Bài học", available: true },
    ],
  },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mở sẵn nhóm menu nào có route con đang active, để vào thẳng trang con
  // không bị "ẩn mất" trong nhóm đóng.
  const [openGroups, setOpenGroups] = useState(() =>
    NAV_ITEMS.filter(
      (item) =>
        item.type === "group" &&
        item.children.some((c) => location.pathname.startsWith(c.to)),
    ).map((item) => item.label),
  );

  const toggleGroup = (label) => {
    setOpenGroups((groups) =>
      groups.includes(label)
        ? groups.filter((g) => g !== label)
        : [...groups, label],
    );
  };

  const handleLogout = () => {
    clearAdminSession();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={
          "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 " +
          "lg:static lg:translate-x-0 lg:z-auto " +
          (sidebarOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-full bg-primary flex items-center justify-center font-heading font-bold text-sm shrink-0">
              孔
            </span>
            <div className="min-w-0">
              <p className="font-heading font-semibold text-sm leading-tight truncate">
                MOLII EDUCATION
              </p>
              <p className="text-[11px] text-gray-400 leading-tight">
                Trang quản trị
              </p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-50 lg:hidden shrink-0"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) =>
            item.type === "link" ? (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition " +
                  (isActive
                    ? "bg-primary/20 text-primary-dark font-medium"
                    : "text-gray-600 hover:bg-gray-50")
                }
              >
                {item.icon}
                {item.label}
              </NavLink>
            ) : (
              <div key={item.label}>
                <button
                  onClick={() => toggleGroup(item.label)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  {item.icon}
                  <span className="flex-1 text-left">{item.label}</span>
                  <ChevronIcon open={openGroups.includes(item.label)} />
                </button>

                {openGroups.includes(item.label) && (
                  <div className="mt-1 ml-4 pl-3 border-l border-gray-100 space-y-1">
                    {item.children.map((child) =>
                      child.available ? (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) =>
                            "block px-3 py-2 rounded-lg text-sm transition " +
                            (isActive
                              ? "bg-primary/20 text-primary-dark font-medium"
                              : "text-gray-500 hover:bg-gray-50")
                          }
                        >
                          {child.label}
                        </NavLink>
                      ) : (
                        <span
                          key={child.label}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 cursor-not-allowed"
                        >
                          {child.label}
                          <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
                            Sắp có
                          </span>
                        </span>
                      ),
                    )}
                  </div>
                )}
              </div>
            ),
          )}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-gray-50 w-full"
          >
            <LogoutIcon /> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 lg:hidden shrink-0"
            >
              <MenuIcon />
            </button>
            <p className="text-sm text-gray-400 truncate hidden sm:block">
              Khu vực quản trị
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-medium">
              AD
            </span>
            <span className="text-sm font-medium hidden sm:inline">
              {getAdminInfo()?.name || "Admin"}
            </span>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function UsersIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="9" cy="8" r="3.5" />
      <path
        d="M2.5 20a6.5 6.5 0 0113 0M16 8.5a3 3 0 110-6M22 20a5.5 5.5 0 00-6.5-5.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function VideoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="2" y="5" width="15" height="14" rx="2" />
      <path
        d="M17 9.5l5-3v11l-5-3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon() {
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
        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
    </svg>
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

function ChevronIcon({ open }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={"transition-transform " + (open ? "rotate-180" : "")}
    >
      <polyline
        points="6 9 12 15 18 9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
