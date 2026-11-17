import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearAdminSession, getAdminInfo } from "../lib/adminAuth.js";
import { useAdminTheme } from "../hooks/useAdminTheme.js";
import { NAV_SECTIONS, currentPage } from "../admin/nav.jsx";
import CommandPalette from "../admin/CommandPalette.jsx";
import {
  IconChevronDown,
  IconChevronRight,
  IconClose,
  IconLogout,
  IconMenu,
  IconMonitor,
  IconMoon,
  IconPanel,
  IconSearch,
  IconSun,
} from "../admin/icons.jsx";
import "../admin/admin-theme.css";

/**
 * Khung trang quản trị kiểu dashboard hiện đại:
 *  - thanh bên nằm trên nền, thu gọn được thành cột biểu tượng (rê chuột vào
 *    nhóm để hiện menu con);
 *  - nội dung nằm trong một "bảng" nổi bo góc (inset);
 *  - bảng lệnh ⌘K / Ctrl+K để tới nhanh mọi trang;
 *  - giao diện Sáng / Tối / Theo máy.
 * Màu lấy từ biến CSS trong admin/admin-theme.css.
 */
const SIDEBAR_KEY = "admin_sidebar";
const readCollapsed = () => {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "collapsed";
  } catch {
    return false;
  }
};

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const initials = (name) =>
  String(name || "Admin")
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

function itemClass(active, rail) {
  return (
    "relative flex items-center gap-2.5 h-9 rounded-lg text-[13.5px] transition-colors " +
    (rail ? "justify-center w-full " : "px-2.5 ") +
    (active
      ? "bg-[var(--a-panel)] text-[var(--a-text)] font-medium shadow-[0_1px_2px_rgba(0,0,0,.06),0_0_0_1px_var(--a-border)] [&>svg]:text-[var(--a-accent-strong)]"
      : "text-[var(--a-text-4)] hover:text-[var(--a-text)] hover:bg-[var(--a-hover-strong)]")
  );
}

function Avatar({ name }) {
  return (
    <span className="w-8 h-8 rounded-full shrink-0 grid place-items-center text-[11px] font-semibold text-[#3b2a00] bg-[conic-gradient(from_180deg,#ffd76b,#f5a524,#ffe7a3,#ffd76b)] ring-2 ring-[var(--a-panel)] shadow-sm">
      {initials(name)}
    </span>
  );
}

/** Nhóm menu ở chế độ thu gọn: biểu tượng + menu con hiện khi rê chuột / focus. */
function RailGroup({ item, active }) {
  return (
    <div className="relative group/rail">
      <button type="button" className={itemClass(active, true)} aria-label={item.label} aria-haspopup="menu">
        <item.icon size={17} />
      </button>
      <div className="invisible opacity-0 group-hover/rail:visible group-hover/rail:opacity-100 group-focus-within/rail:visible group-focus-within/rail:opacity-100 transition-opacity absolute left-full top-0 pl-3 z-50">
        <div role="menu" className="w-56 rounded-xl border border-[var(--a-border)] bg-[var(--a-panel)] shadow-[var(--a-shadow-lg)] p-1.5">
          <p className="px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--a-faint)]">{item.label}</p>
          {item.children.map((c) => (
            <NavLink key={c.to} to={c.to} role="menuitem" className={({ isActive }) => itemClass(isActive, false) + " text-[13px]"}>
              <c.icon size={15} />
              {c.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}

function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

const THEMES = [
  ["light", "Sáng", <IconSun key="l" size={15} />],
  ["dark", "Tối", <IconMoon key="d" size={15} />],
  ["system", "Theo máy", <IconMonitor key="s" size={15} />],
];

/** Nút giao diện trên thanh trên: biểu tượng hiện tại + menu chọn Sáng / Tối / Theo máy. */
function ThemeMenu({ mode, dark, onChange }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Đổi giao diện"
        title="Giao diện"
        className="w-9 h-9 rounded-lg grid place-items-center text-[var(--a-muted)] hover:text-[var(--a-text)] hover:bg-[var(--a-hover)]"
      >
        {dark ? <IconMoon size={17} /> : <IconSun size={17} />}
      </button>
      {open && (
        <div role="radiogroup" aria-label="Giao diện" className="adm-pop absolute right-0 mt-2 w-44 rounded-xl border border-[var(--a-border)] bg-[var(--a-panel)] shadow-[var(--a-shadow-lg)] p-1.5 z-50">
          {THEMES.map(([value, label, icon]) => {
            const on = mode === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`Giao diện: ${label}`}
                onClick={() => {
                  onChange(value);
                  setOpen(false);
                }}
                className={"w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13px] " + (on ? "bg-[var(--a-hover-strong)] text-[var(--a-text)] font-medium" : "text-[var(--a-text-4)] hover:bg-[var(--a-hover)]")}
              >
                {icon}
                <span className="flex-1 text-left">{label}</span>
                {on && <span className="w-1.5 h-1.5 rounded-full bg-[var(--a-accent)]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserMenu({ name, email, onLogout }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Tài khoản" className="rounded-full hover:ring-4 hover:ring-[var(--a-hover-strong)] transition">
        <Avatar name={name} />
      </button>
      {open && (
        <div role="menu" className="adm-pop absolute right-0 mt-2 w-64 rounded-xl border border-[var(--a-border)] bg-[var(--a-panel)] shadow-[var(--a-shadow-lg)] p-1.5 z-50">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar name={name} />
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-[var(--a-text)] truncate">{name || "Admin"}</p>
              {email && <p className="text-xs text-[var(--a-muted)] truncate">{email}</p>}
            </div>
          </div>
          <div className="h-px bg-[var(--a-border-soft)] my-1" />
          <button type="button" role="menuitem" onClick={onLogout} className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-[13px] text-[var(--a-text-3)] hover:bg-[var(--a-hover)] hover:text-red-600">
            <IconLogout size={15} /> Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode, dark } = useAdminTheme();
  const admin = getAdminInfo();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const page = currentPage(location.pathname);

  // Mở sẵn nhóm có trang đang mở.
  const [openGroups, setOpenGroups] = useState(() =>
    NAV_SECTIONS.flatMap((s) => s.items)
      .filter((i) => i.type === "group" && i.children.some((c) => location.pathname.startsWith(c.to)))
      .map((i) => i.label),
  );
  const toggleGroup = (label) => setOpenGroups((g) => (g.includes(label) ? g.filter((x) => x !== label) : [...g, label]));

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(SIDEBAR_KEY, c ? "open" : "collapsed");
      } catch {
        // bỏ qua
      }
      return !c;
    });
  };

  const handleLogout = useCallback(() => {
    clearAdminSession();
    navigate("/login");
  }, [navigate]);

  // ⌘K / Ctrl+K: bảng lệnh.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const crumbs = !page ? ["Khu vực quản trị"] : !page.end && location.pathname.length > page.to.length + 1 ? [...page.trail, "Chi tiết"] : page.trail;
  const rail = collapsed && !mobileOpen;

  return (
    <div className={"admin-root min-h-screen lg:flex lg:p-2" + (dark ? " dark" : "")} style={{ "--a-sidebar-w": collapsed ? "76px" : "268px" }}>
      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={
          "fixed inset-y-0 left-0 z-40 flex flex-col transition-[width,transform] duration-200 w-[280px] " +
          "bg-[var(--a-panel)] border-r border-[var(--a-border)] lg:bg-transparent lg:border-0 " +
          "lg:sticky lg:top-2 lg:h-[calc(100vh-16px)] lg:translate-x-0 lg:z-30 " +
          (rail ? "lg:w-[68px] " : "lg:w-[260px] ") +
          (mobileOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        {/* Đầu thanh bên: thương hiệu */}
        <div className={"h-14 flex items-center gap-2.5 shrink-0 " + (rail ? "justify-center" : "px-3")}>
          <span className="w-9 h-9 rounded-[10px] bg-[#ffffff] grid place-items-center shrink-0 shadow-[0_1px_2px_rgba(0,0,0,.08)] ring-1 ring-black/5 overflow-hidden">
            <img src="/images/logo-moliifm.webp" alt="Molii" className="w-8 h-8 object-contain" />
          </span>
          {!rail && (
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold text-[var(--a-text)] leading-tight truncate">Molii Education</p>
              <p className="text-[11.5px] text-[var(--a-muted)] leading-tight">Bảng quản trị</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="w-8 h-8 rounded-lg grid place-items-center text-[var(--a-muted)] hover:bg-[var(--a-hover)] lg:hidden"
            aria-label="Đóng menu"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Tìm nhanh */}
        <div className={"px-3 " + (rail ? "mb-2" : "mb-3")}>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            title="Tìm nhanh (Ctrl K)"
            className={
              "w-full h-9 flex items-center gap-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-panel)] text-[var(--a-muted)] hover:text-[var(--a-text)] shadow-[var(--a-shadow)] transition-colors " +
              (rail ? "justify-center" : "px-2.5")
            }
          >
            <IconSearch size={15} />
            {!rail && (
              <>
                <span className="flex-1 text-left text-[13px]">Tìm nhanh…</span>
                <kbd className="adm-kbd">{isMac ? "⌘" : "Ctrl"}</kbd>
                <kbd className="adm-kbd">K</kbd>
              </>
            )}
          </button>
        </div>

        {/* Thu gọn: không cuộn (để menu con nổi ra ngoài được), ít mục nên vẫn đủ chỗ. */}
        <nav className={"flex-1 pb-3 " + (rail ? "px-3 overflow-visible" : "px-2 overflow-y-auto")} aria-label="Menu quản trị">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mb-4">
              {!rail ? <p className="px-2.5 mb-1 text-[11.5px] font-medium text-[var(--a-faint)]">{section.label}</p> : <div className="mx-auto mb-2 w-5 h-px bg-[var(--a-border)]" />}
              <div className="space-y-px">
                {section.items.map((item) =>
                  item.type === "link" ? (
                    <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)} title={rail ? item.label : undefined} className={({ isActive }) => itemClass(isActive, rail)}>
                      <item.icon size={17} />
                      {!rail && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  ) : rail ? (
                    <RailGroup key={item.label} item={item} active={item.children.some((c) => location.pathname.startsWith(c.to))} />
                  ) : (
                    <div key={item.label}>
                      <button type="button" onClick={() => toggleGroup(item.label)} aria-expanded={openGroups.includes(item.label)} className={itemClass(false, false) + " w-full"}>
                        <item.icon size={17} />
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        <IconChevronDown size={14} className={"transition-transform text-[var(--a-faint)] " + (openGroups.includes(item.label) ? "" : "-rotate-90")} />
                      </button>
                      {openGroups.includes(item.label) && (
                        <div className="mt-px mb-1 space-y-px">
                          {item.children.map((c) => (
                            <NavLink key={c.to} to={c.to} onClick={() => setMobileOpen(false)} className={({ isActive }) => itemClass(isActive, false) + " pl-[34px] text-[13px]"}>
                              <c.icon size={15} />
                              <span className="truncate">{c.label}</span>
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </nav>

        {/* Tài khoản + thu gọn */}
        <div className={"shrink-0 p-2 " + (rail ? "flex flex-col items-center gap-2" : "")}>
          {!rail ? (
            <div className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-[var(--a-hover)]">
              <Avatar name={admin?.name} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[var(--a-text)] truncate">{admin?.name || "Admin"}</p>
                <p className="text-[11.5px] text-[var(--a-muted)] truncate">{admin?.email || "Quản trị viên"}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Đăng xuất"
                aria-label="Đăng xuất"
                className="w-8 h-8 rounded-lg grid place-items-center text-[var(--a-muted)] hover:text-red-600 hover:bg-[var(--a-hover-strong)]"
              >
                <IconLogout size={16} />
              </button>
            </div>
          ) : (
            <Avatar name={admin?.name} />
          )}
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            aria-label={collapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            className={"hidden lg:flex h-8 items-center gap-2 rounded-lg text-[12.5px] text-[var(--a-muted)] hover:text-[var(--a-text)] hover:bg-[var(--a-hover)] " + (rail ? "w-8 justify-center" : "w-full px-2.5 mt-1")}
          >
            <IconPanel size={16} />
            {!rail && "Thu gọn"}
          </button>
        </div>
      </aside>

      <div className="adm-panel flex-1 min-w-0 min-h-screen lg:min-h-[calc(100vh-16px)] flex flex-col">
        <header className="sticky top-0 z-20 h-14 shrink-0 px-4 sm:px-6 flex items-center gap-2 sm:gap-3 border-b border-[var(--a-border-soft)] bg-[color-mix(in_srgb,var(--a-panel)_80%,transparent)] backdrop-blur-xl">
          <button type="button" onClick={() => setMobileOpen(true)} className="w-9 h-9 -ml-1 rounded-lg grid place-items-center text-[var(--a-muted)] hover:bg-[var(--a-hover)] lg:hidden" aria-label="Mở menu">
            <IconMenu size={18} />
          </button>
          <nav className="min-w-0 flex-1 flex items-center gap-1 text-[13.5px]" aria-label="Đường dẫn">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <span key={c + i} className={"items-center gap-1 min-w-0 " + (last ? "flex" : "hidden sm:flex")}>
                  {i > 0 && <IconChevronRight size={14} className="text-[var(--a-fainter)] shrink-0 hidden sm:block" />}
                  <span className={"truncate " + (last ? "font-medium text-[var(--a-text)]" : "text-[var(--a-muted)]")}>{c}</span>
                </span>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex items-center gap-2 h-8 pl-2.5 pr-1.5 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] text-[13px] text-[var(--a-muted)] hover:text-[var(--a-text)] w-56"
          >
            <IconSearch size={14} />
            <span className="flex-1 text-left">Tìm trang, lệnh…</span>
            <kbd className="adm-kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
          </button>
          <ThemeMenu mode={mode} dark={dark} onChange={setMode} />
          <UserMenu name={admin?.name} email={admin?.email} onLogout={handleLogout} />
        </header>

        <main className="flex-1 px-4 sm:px-8 py-7">
          <div key={location.pathname} className="adm-fade max-w-[1320px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onTheme={setMode} onLogout={handleLogout} />
    </div>
  );
}
