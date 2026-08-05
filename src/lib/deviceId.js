// Sinh & lưu 1 device ID duy nhất cho mỗi trình duyệt trên mỗi thiết bị.
// Lưu trong localStorage — tồn tại qua các lần đăng nhập, chỉ mất khi học
// viên xóa dữ liệu trình duyệt / dùng chế độ ẩn danh (lúc đó bị coi là thiết
// bị mới và cần admin reset, đúng như đã thống nhất về phương án này).
const DEVICE_ID_KEY = 'gtc_device_id'

export function getDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY)
    if (!id) {
        id = generateId()
        localStorage.setItem(DEVICE_ID_KEY, id)
    }
    return id
}

function generateId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID()
    }
    return 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 11)
}

// Phân loại thiết bị theo User-Agent. Trả về 'mobile' hoặc 'desktop'.
// Tablet gộp vào mobile.
export function getDeviceType() {
    const ua = navigator.userAgent || ''
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua)
    return isMobile ? 'mobile' : 'desktop'
}