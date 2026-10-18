/**
 * Thẻ đầu trang cho khu vực Lịch sử học.
 *
 * Thẻ trắng cùng kiểu với mọi thẻ bên dưới, chỉ thêm một dải màu mảnh ở mép
 * trên để đánh dấu đây là phần đầu. Không dùng tranh nền: trên nền chung của
 * ứng dụng (vốn đã là một tấm tranh), thêm một lớp tranh nữa làm chữ khó đọc
 * và hai lớp tranh tranh nhau sự chú ý.
 */
export default function HistoryHeader({ icon, badges, title, subtitle, actions, footer }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        {icon && (
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          {badges && <div className="flex flex-wrap items-center gap-2 mb-1.5">{badges}</div>}
          <h1 className="text-2xl font-heading font-bold text-gray-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      {footer && <div className="border-t border-gray-100">{footer}</div>}
    </div>
  );
}

/** Nhãn nhỏ trong thẻ đầu trang. */
export function HeaderBadge({ tone = "plain", title, children }) {
  const styles =
    tone === "green"
      ? "bg-green-50 text-green-700 border-green-200"
      : "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span
      title={title}
      className={"inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border " + styles}
    >
      {children}
    </span>
  );
}

/**
 * Ô vuông mang tên khóa, thay cho ảnh bìa khóa.
 *
 * Ảnh bìa phụ thuộc admin có tải lên hay không — thiếu ảnh là một ô trống
 * hoặc ảnh mặc định lặp lại trên mọi dòng. Tên khóa thì bản ghi nào cũng có,
 * và chính nó là thứ học viên cần nhận ra khi lướt danh sách.
 */
export function CourseTile({ label, size = "md" }) {
  const text = label || "—";
  const dims = size === "sm" ? "w-11 h-11 text-xs" : "w-14 h-14 text-sm";
  return (
    <span
      className={
        "rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-orange-700 font-bold flex items-center justify-center text-center leading-tight shrink-0 px-1 " +
        dims
      }
    >
      {text.length > 6 ? text.slice(0, 6) : text}
    </span>
  );
}
