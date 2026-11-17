/**
 * Thiết bị của học viên (mỗi tài khoản 1 chỗ máy tính + 1 chỗ điện thoại):
 * biểu tượng loại máy, trình duyệt · hệ điều hành đọc từ user-agent, đăng nhập
 * từ bao giờ; nút đăng xuất khỏi máy đó.
 */

/** "Chrome · macOS" từ chuỗi user-agent. */
function deviceName(ua) {
  const s = String(ua || "");
  const browser = /Edg\//.test(s)
    ? "Edge"
    : /OPR\/|Opera/.test(s)
      ? "Opera"
      : /CocosCreator|Zalo/i.test(s)
        ? "Zalo"
        : /FBAN|FBAV/.test(s)
          ? "Facebook"
          : /CriOS|Chrome\//.test(s)
            ? "Chrome"
            : /FxiOS|Firefox\//.test(s)
              ? "Firefox"
              : /Safari\//.test(s)
                ? "Safari"
                : "";
  const os = /iPhone/.test(s)
    ? "iPhone"
    : /iPad/.test(s)
      ? "iPad"
      : /Android/.test(s)
        ? "Android"
        : /Windows/.test(s)
          ? "Windows"
          : /Mac OS X|Macintosh/.test(s)
            ? "macOS"
            : /Linux/.test(s)
              ? "Linux"
              : "";
  return [browser, os].filter(Boolean).join(" · ") || "Thiết bị không rõ";
}

/** "3 ngày" — đăng nhập được bao lâu rồi (chi tiết giờ giấc ở tooltip). */
function since(date) {
  if (!date) return "";
  const sec = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 3600) return `${Math.max(1, Math.round(sec / 60))} phút`;
  if (sec < 86400) return `${Math.round(sec / 3600)} giờ`;
  if (sec < 30 * 86400) return `${Math.round(sec / 86400)} ngày`;
  return new Date(date).toLocaleDateString("vi-VN");
}

const LaptopIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="5" width="16" height="11" rx="1.5" />
    <path d="M2 19h20" />
  </svg>
);
const PhoneIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </svg>
);
const LogoutIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
  </svg>
);

/** Một máy đang đăng nhập: biểu tượng + chấm xanh, "Chrome · macOS", từ bao giờ, nút đăng xuất. */
export function DeviceChip({ kind, slot, onLogout }) {
  const label = kind === "desktop" ? "Máy tính" : "Điện thoại";
  const Icon = kind === "desktop" ? LaptopIcon : PhoneIcon;
  const name = deviceName(slot.userAgent);
  const from = since(slot.firstLoginAt);
  return (
    <span
      className="inline-flex items-center gap-2 h-8 pl-2 pr-0.5 rounded-lg border border-gray-200 bg-white whitespace-nowrap"
      title={`${label} · ${name}${slot.firstLoginAt ? ` · đăng nhập lúc ${new Date(slot.firstLoginAt).toLocaleString("vi-VN")}` : ""}`}
    >
      <span className="relative text-gray-600">
        <Icon />
        <span className="absolute -right-0.5 -bottom-0.5 w-2 h-2 rounded-full bg-green-500 ring-2 ring-white" />
      </span>
      <span className="text-xs font-medium text-gray-800">{name}</span>
      {from && <span className="text-[11px] text-gray-400">· {from}</span>}
      <button
        type="button"
        onClick={onLogout}
        aria-label={`Đăng xuất ${label.toLowerCase()}`}
        title={`Đăng xuất khỏi ${label.toLowerCase()}`}
        className="w-7 h-7 rounded-md grid place-items-center text-gray-400 hover:text-red-600 hover:bg-red-50"
      >
        <LogoutIcon />
      </button>
    </span>
  );
}

/**
 * Cột "Thiết bị": chỉ hiện máy ĐANG đăng nhập (chỗ trống không cần hiện);
 * chưa có máy nào thì một dòng mờ. Có cả 2 máy thì thêm "Đăng xuất cả 2".
 * onLogout(target): 'desktop' | 'mobile' | 'both'.
 */
export function DeviceList({ devices, onLogout, alwaysShowBoth = false }) {
  const slots = [
    ["desktop", devices?.desktop],
    ["mobile", devices?.mobile],
  ].filter(([, slot]) => slot?.deviceId);
  if (slots.length === 0) {
    return <span className="text-xs text-gray-400 whitespace-nowrap">Chưa đăng nhập</span>;
  }
  return (
    <div className="flex flex-col items-start gap-1">
      {slots.map(([kind, slot]) => (
        <DeviceChip key={kind} kind={kind} slot={slot} onLogout={() => onLogout(kind)} />
      ))}
      {slots.length === 2 && (
        <button
          type="button"
          onClick={() => onLogout("both")}
          className={"text-[11px] text-red-500 hover:underline whitespace-nowrap " + (alwaysShowBoth ? "" : "opacity-0 group-hover/row:opacity-100 focus:opacity-100 transition-opacity")}
        >
          Đăng xuất cả 2 máy
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ active, short = false }) {
  return (
    <span
      className={
        "inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium px-2 py-1 rounded-md " +
        (active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500")
      }
    >
      <span className={"w-1.5 h-1.5 rounded-full " + (active ? "bg-green-500" : "bg-gray-400")} />
      {active ? (short ? "Hoạt động" : "Đang hoạt động") : "Đã khóa"}
    </span>
  );
}
