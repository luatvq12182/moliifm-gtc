import { useState } from "react";

// Hiện mật khẩu tạm sau khi tạo học viên mới hoặc reset mật khẩu — có nút copy,
// vì alert() mặc định của trình duyệt không cho bôi đen/copy nội dung.
export default function CredentialModal({
  open,
  studentName,
  tempPassword,
  onClose,
}) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Trình duyệt cũ/không phải secure context có thể chặn Clipboard API —
      // người dùng vẫn có thể tự bôi đen text để copy thủ công trong trường hợp này.
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-heading font-semibold mb-1">
          Mật khẩu tạm đã được tạo
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Gửi mật khẩu này cho học viên{" "}
          <span className="font-medium">{studentName}</span> — hệ thống sẽ không
          hiển thị lại được nữa sau khi đóng cửa sổ này.
        </p>

        <div className="flex items-center gap-2 mb-4">
          <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono select-all">
            {tempPassword}
          </code>
          <button
            onClick={handleCopy}
            className={
              "shrink-0 px-3 py-2.5 rounded-lg text-sm font-medium border " +
              (copied
                ? "bg-green-50 border-green-300 text-green-700"
                : "border-gray-300 hover:bg-gray-50 text-gray-700")
            }
          >
            {copied ? "Đã copy ✓" : "Copy"}
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-lg font-medium bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white"
        >
          Đã lưu, đóng lại
        </button>
      </div>
    </div>
  );
}
