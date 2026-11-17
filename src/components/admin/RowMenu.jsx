import { useEffect, useRef, useState } from "react";

/**
 * Nút "⋯" mở danh sách thao tác của một dòng (bảng quản trị).
 * items: [{ label, onClick, danger? } | { separator: true }]
 *
 * Menu đặt theo màn hình (position: fixed) — bảng nằm trong khung cuộn ngang
 * nên menu thả xuống bình thường sẽ bị cắt ở các dòng cuối. Gần đáy màn hình
 * thì mở lên trên; cuộn trang thì tự đóng (cuộn ngang trong bảng thì không).
 */
const MENU_W = 192;
export default function RowMenu({ items, label = "Thao tác" }) {
  const [pos, setPos] = useState(null); // null = đóng
  const ref = useRef(null);
  const open = pos !== null;
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setPos(null);
    };
    const shut = () => setPos(null);
    const onKey = (e) => e.key === "Escape" && setPos(null);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", shut);
    window.addEventListener("resize", shut);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", shut);
      window.removeEventListener("resize", shut);
    };
  }, [open]);

  const toggle = (e) => {
    if (open) return setPos(null);
    const r = e.currentTarget.getBoundingClientRect();
    const height = items.length * 36 + 12;
    const up = r.bottom + height + 8 > window.innerHeight;
    setPos({ left: Math.max(8, r.right - MENU_W), top: up ? r.top - height - 4 : r.bottom + 4 });
  };
  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="w-8 h-8 rounded-lg grid place-items-center text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open && (
        <div role="menu" style={{ position: "fixed", left: pos.left, top: pos.top, width: MENU_W }} className="z-50 rounded-xl border border-gray-200 bg-white shadow-xl p-1 whitespace-normal text-left">
          {items.map((it, i) =>
            it.separator ? (
              <div key={i} className="h-px my-1 bg-gray-100" />
            ) : (
              <button
                key={it.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setPos(null);
                  it.onClick();
                }}
                className={"block w-full text-left text-[13px] px-2.5 py-2 rounded-lg hover:bg-gray-50 " + (it.danger ? "text-red-600" : "text-gray-700")}
              >
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
