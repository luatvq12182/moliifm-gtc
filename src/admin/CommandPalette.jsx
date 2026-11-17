import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ALL_PAGES } from "./nav.jsx";
import { IconLogout, IconMonitor, IconMoon, IconSearch, IconSun } from "./icons.jsx";

/**
 * Bảng lệnh (⌘K / Ctrl+K): gõ để tìm và mở nhanh mọi trang quản trị, đổi giao
 * diện, đăng xuất. ↑ ↓ chọn, Enter mở, Esc đóng.
 */
const fold = (s) =>
  String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d");

export default function CommandPalette({ open, onClose, onTheme, onLogout }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const commands = useMemo(
    () => [
      ...ALL_PAGES.map((p) => ({ id: p.to, group: "Đi tới trang", label: p.label, hint: p.group || "", icon: p.icon, run: () => navigate(p.to) })),
      { id: "t-light", group: "Giao diện", label: "Giao diện sáng", icon: IconSun, run: () => onTheme("light") },
      { id: "t-dark", group: "Giao diện", label: "Giao diện tối", icon: IconMoon, run: () => onTheme("dark") },
      { id: "t-system", group: "Giao diện", label: "Giao diện theo máy", icon: IconMonitor, run: () => onTheme("system") },
      { id: "logout", group: "Tài khoản", label: "Đăng xuất", icon: IconLogout, run: onLogout },
    ],
    [navigate, onTheme, onLogout],
  );

  const results = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean);
    if (!words.length) return commands;
    return commands.filter((c) => {
      const hay = fold(`${c.label} ${c.hint} ${c.group}`);
      return words.every((w) => hay.includes(w));
    });
  }, [q, commands]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const close = () => {
    setQ("");
    setActive(0);
    onClose();
  };
  const runAt = (i) => {
    const c = results[i];
    if (!c) return;
    close();
    c.run();
  };
  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      runAt(active);
    } else if (e.key === "Escape") {
      close();
    }
  };

  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh] px-4 bg-black/40 backdrop-blur-sm" onMouseDown={close}>
      <div
        role="dialog"
        aria-label="Bảng lệnh"
        className="adm-pop w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--a-border)] bg-[var(--a-panel)] shadow-[var(--a-shadow-lg)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[var(--a-border-soft)]">
          <IconSearch className="text-[var(--a-faint)] shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKey}
            placeholder="Tìm trang, lệnh… (vd. kết quả, đề, slide, tối)"
            className="adm-bare flex-1 bg-transparent text-[15px] outline-none text-[var(--a-text)] placeholder:text-[var(--a-faint)]"
            aria-label="Tìm lệnh"
          />
          <kbd className="adm-kbd">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-8 text-center text-sm text-[var(--a-muted)]">Không tìm thấy “{q}”.</p>}
          {results.map((c, i) => {
            const head = c.group !== lastGroup ? c.group : null;
            lastGroup = c.group;
            const Icon = c.icon;
            return (
              <div key={c.id}>
                {head && <p className="px-3 pt-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--a-faint)]">{head}</p>}
                <button
                  type="button"
                  data-active={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => runAt(i)}
                  className={
                    "w-full flex items-center gap-3 px-3 h-10 rounded-lg text-left text-sm transition-colors " +
                    (i === active ? "bg-[var(--a-hover-strong)] text-[var(--a-text)]" : "text-[var(--a-text-3)]")
                  }
                >
                  <span className={"w-7 h-7 rounded-md grid place-items-center shrink-0 " + (i === active ? "bg-[var(--a-accent)] text-[#1d1606]" : "bg-[var(--a-surface-3)] text-[var(--a-muted)]")}>
                    <Icon size={15} />
                  </span>
                  <span className="flex-1 truncate">{c.label}</span>
                  {c.hint && <span className="text-xs text-[var(--a-faint)] truncate max-w-[45%]">{c.hint}</span>}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 px-4 h-10 border-t border-[var(--a-border-soft)] text-[11px] text-[var(--a-faint)]">
          <span>
            <kbd className="adm-kbd">↑</kbd> <kbd className="adm-kbd">↓</kbd> chọn
          </span>
          <span>
            <kbd className="adm-kbd">Enter</kbd> mở
          </span>
          <span className="ml-auto">
            <kbd className="adm-kbd">Ctrl</kbd> <kbd className="adm-kbd">K</kbd> mở bảng lệnh
          </span>
        </div>
      </div>
    </div>
  );
}
