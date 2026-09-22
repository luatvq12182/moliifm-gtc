import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hỏi lại trước khi làm việc có hậu quả.
 *
 * VÌ SAO THAY confirm() CỦA TRÌNH DUYỆT:
 *  - Nó chặn cứng cả tab, không hiện được trạng thái đang xử lý.
 *  - Không tô màu được, nên "Khoá tài khoản" và "Mở khoá" trông y hệt nhau —
 *    trong khi một cái cắt quyền truy cập còn một cái trả lại.
 *  - Trình duyệt hiện kèm tên miền và cho phép người dùng chặn vĩnh viễn hộp
 *    thoại; chặn rồi thì confirm() luôn trả về false và thao tác im lặng
 *    không chạy, không ai hiểu vì sao.
 *
 * Dùng — thay được 1-1 cho confirm() vì cùng trả về true/false:
 *   const { confirm, dialog } = useConfirm()
 *   if (!(await confirm({ title, message, confirmLabel, tone }))) return
 *   ...
 *   {dialog}
 */
export function useConfirm() {
  const [state, setState] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback((options) => {
    // Gọi confirm() lần nữa khi hộp thoại trước chưa trả lời thì resolver cũ bị
    // ghi đè, và chỗ `await` của lần trước TREO VĨNH VIỄN. Lớp phủ che hết màn
    // hình nên bình thường không bấm được nút thứ hai, nhưng phím tắt hay thao
    // tác tự động thì vẫn lọt — trả lời "không" cho lần trước cho chắc.
    if (resolver.current) {
      resolver.current(false);
      resolver.current = null;
    }
    setState(options);
    return new Promise((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((answer) => {
    setState(null);
    if (resolver.current) {
      resolver.current(answer);
      resolver.current = null;
    }
  }, []);

  // Component rời khỏi màn hình lúc hộp thoại còn mở -> trả lời "không" để
  // Promise không treo mãi.
  useEffect(() => {
    return () => {
      if (resolver.current) {
        resolver.current(false);
        resolver.current = null;
      }
    };
  }, []);

  const dialog = state ? (
    <ConfirmDialog
      {...state}
      onCancel={() => settle(false)}
      onConfirm={() => settle(true)}
    />
  ) : null;

  return { confirm, dialog };
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  tone = "normal", // 'normal' | 'danger'
  onCancel,
  onConfirm,
}) {
  const confirmRef = useRef(null);

  useEffect(() => {
    // Đưa con trỏ vào nút xác nhận: bấm Enter là xong, bấm Esc là hủy.
    confirmRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const danger = tone === "danger";

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-[70]"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-heading font-semibold mb-1.5">{title}</h2>
        <p className="text-sm text-gray-600 leading-snug mb-5">{message}</p>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm border border-gray-300 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={
              "px-4 py-2 rounded-lg text-sm font-medium " +
              (danger
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-primary hover:bg-primary-dark text-gray-900")
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
