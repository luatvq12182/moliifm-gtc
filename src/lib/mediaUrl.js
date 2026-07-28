const API_URL = import.meta.env.VITE_API_URL || ''
const SERVER_ORIGIN = API_URL.replace(/\/api\/?$/, '')

// Ảnh do admin upload được backend trả về dạng đường dẫn tương đối
// (vd. "/uploads/images/xxx.png") — cần ghép với domain của backend mới xem
// được, vì frontend và backend chạy khác domain/port. Ảnh tĩnh cũ (đặt sẵn
// trong thư mục public của chính frontend, vd. "/images/logo.png") thì giữ
// nguyên, không đụng tới.
export function resolveUploadUrl(path) {
    if (!path) return ''
    if (path.startsWith('http://') || path.startsWith('https://')) return path
    if (path.startsWith('/uploads/')) return `${SERVER_ORIGIN}${path}`
    return path
}