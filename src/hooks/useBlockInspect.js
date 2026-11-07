import { useEffect } from 'react'

/**
 * Chặn các đường mở công cụ nhà phát triển (DevTools) / xem mã nguồn / lưu
 * trang PHỔ BIẾN trên trang xem bài giảng (video, slide):
 *
 *  - Chuột phải ở mọi chỗ trên trang (trừ ô nhập chữ — vẫn cần dán, chọn gợi ý
 *    của bộ gõ).
 *  - Phím tắt: F12; Ctrl+Shift+I/J/C/K (Windows/Linux); ⌥⌘I/J/C (Mac);
 *    Ctrl+U, ⌥⌘U (xem mã nguồn); Ctrl/⌘+S (lưu trang).
 *
 * KHÔNG chặn được tuyệt đối: vẫn mở được DevTools từ menu của trình duyệt,
 * hoặc mở sẵn trước khi vào trang. Đây là rào cản cho người dùng thường —
 * đã báo khách. Không dùng ở trang làm bài tập.
 */

// So theo `code` (vị trí phím), không theo `key`: trên Mac giữ ⌥ thì `key`
// thành ký tự đặc biệt (⌥I -> "ˆ").
const DEVTOOLS_CODES = ['KeyI', 'KeyJ', 'KeyC', 'KeyK']

function isBlockedShortcut(e) {
    if (e.key === 'F12' || e.code === 'F12') return true
    const mod = e.ctrlKey || e.metaKey
    if (!mod) return false
    // Ctrl+Shift+I/J/C/K (Windows) · ⌘⌥I/J/C (Mac) · ⌘⇧C (Mac, chọn phần tử)
    if ((e.shiftKey || e.altKey) && DEVTOOLS_CODES.includes(e.code)) return true
    // Xem mã nguồn: Ctrl+U (Windows) · ⌘⌥U (Mac)
    if (e.code === 'KeyU' && (e.ctrlKey || e.altKey)) return true
    // Lưu trang
    if (e.code === 'KeyS' && !e.shiftKey && !e.altKey) return true
    return false
}

const isTextField = (el) => Boolean(el?.closest?.('input, textarea, select, [contenteditable="true"]'))

export function useBlockInspect(enabled = true) {
    useEffect(() => {
        if (!enabled) return undefined
        const onKey = (e) => {
            if (!isBlockedShortcut(e)) return
            e.preventDefault()
            e.stopPropagation()
        }
        const onContextMenu = (e) => {
            if (!isTextField(e.target)) e.preventDefault()
        }
        // Bắt ở pha capture để chạy trước mọi xử lý khác trên trang.
        window.addEventListener('keydown', onKey, true)
        document.addEventListener('contextmenu', onContextMenu, true)
        return () => {
            window.removeEventListener('keydown', onKey, true)
            document.removeEventListener('contextmenu', onContextMenu, true)
        }
    }, [enabled])
}
