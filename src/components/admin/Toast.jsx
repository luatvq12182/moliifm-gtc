import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Báo kết quả thao tác bằng một thẻ nổi góc màn hình.
 *
 * VÌ SAO CẦN: nhiều thao tác trong trang quản trị chỉ đổi một chi tiết nhỏ trên
 * bảng — khoá tài khoản thì đổi màu một cái nhãn, reset thiết bị thì đổi chữ
 * "Đã đăng ký" thành "Trống". Giáo viên bấm xong nhìn không ra là đã chạy chưa,
 * nên bấm lại lần nữa. Phải nói thẳng ra là xong rồi.
 *
 * VÌ SAO KHÔNG DÙNG alert(): nó chặn cả trang, phải bấm OK mới làm tiếp được,
 * và trông như lỗi trình duyệt chứ không như một phần của sản phẩm. Lỗi thì
 * đáng để người dùng dừng lại đọc — nhưng "đã khoá xong" thì không.
 *
 * Dùng:
 *   const toast = useToasts()
 *   toast.success('Đã khóa tài khoản của Nguyễn Văn A.')
 *   toast.error(err.message)
 *   ...
 *   <ToastStack toasts={toast.items} onDismiss={toast.dismiss} />
 */

const SUCCESS_MS = 4000
// Lỗi ở lại lâu hơn: người dùng cần đọc hiểu chuyện gì xảy ra, và thường phải
// làm gì đó tiếp theo.
const ERROR_MS = 8000

export function useToasts() {
  const [items, setItems] = useState([]);
  const nextId = useRef(1);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setItems((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (tone, message) => {
      if (!message) return;
      const id = nextId.current++;
      setItems((list) => [...list, { id, tone, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), tone === "error" ? ERROR_MS : SUCCESS_MS),
      );
      return id;
    },
    [dismiss],
  );

  // Rời trang lúc còn thẻ đang đếm giờ -> dọn timer, tránh setState trên
  // component đã gỡ.
  useEffect(() => {
    const running = timers.current;
    return () => {
      running.forEach((t) => clearTimeout(t));
      running.clear();
    };
  }, []);

  const success = useCallback((message) => push("success", message), [push]);
  const error = useCallback(
    (message) => push("error", message || "Có lỗi xảy ra, thử lại nhé."),
    [push],
  );

  return { items, push, dismiss, success, error };
}

export function ToastStack({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    // aria-live="polite": trình đọc màn hình đọc thông báo khi nó xuất hiện mà
    // không cắt ngang việc người dùng đang làm.
    <div
      aria-live="polite"
      className="fixed z-[60] inset-x-3 bottom-3 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96 flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const [shown, setShown] = useState(false);

  // Trượt vào ở khung hình kế tiếp, không phải ngay lúc dựng — dựng và đổi
  // trạng thái trong cùng một khung thì trình duyệt không thấy có gì thay đổi
  // để mà chuyển cảnh.
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isError = toast.tone === "error";

  return (
    <div
      className={
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg transition-all duration-200 " +
        (isError
          ? "bg-red-50 border-red-200 text-red-800"
          : "bg-green-50 border-green-200 text-green-800") +
        (shown ? " opacity-100 translate-y-0" : " opacity-0 translate-y-2")
      }
    >
      <span className="shrink-0 mt-0.5">
        {isError ? <AlertIcon /> : <CheckIcon />}
      </span>
      <p className="flex-1 text-sm leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Đóng thông báo"
        className="shrink-0 opacity-50 hover:opacity-100"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 16.5v.5" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}
