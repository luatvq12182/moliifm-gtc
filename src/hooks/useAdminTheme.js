import { useEffect, useState } from 'react'

/**
 * Giao diện trang quản trị: 'light' | 'dark' | 'system' (theo máy).
 *
 * Lưu trong localStorage của trình duyệt (mỗi máy một lựa chọn). Chỉ áp cho
 * khu vực quản trị — trang học viên giữ nguyên giao diện sáng.
 */
const KEY = 'admin_theme'
const MODES = ['light', 'dark', 'system']
const media = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null)

function readMode() {
    try {
        const v = localStorage.getItem(KEY)
        return MODES.includes(v) ? v : 'system'
    } catch {
        return 'system'
    }
}

export function useAdminTheme() {
    const [mode, setModeState] = useState(readMode)
    const [systemDark, setSystemDark] = useState(() => Boolean(media()?.matches))

    // Đổi chế độ sáng / tối của máy trong lúc đang mở trang -> theo ngay.
    useEffect(() => {
        const mq = media()
        if (!mq) return undefined
        const onChange = (e) => setSystemDark(e.matches)
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    }, [])

    const setMode = (next) => {
        setModeState(next)
        try {
            localStorage.setItem(KEY, next)
        } catch {
            // trình duyệt chặn lưu -> chỉ áp cho lần mở này
        }
    }

    const dark = mode === 'dark' || (mode === 'system' && systemDark)
    return { mode, setMode, dark }
}
