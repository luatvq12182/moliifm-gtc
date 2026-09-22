/**
 * BẢN SAO CỦA gtc-api/src/lib/phone.js — giữ hai bên GIỐNG HỆT NHAU.
 *
 * Form đăng nhập và form thêm học viên cần báo "số không hợp lệ" ngay lúc gõ,
 * không chờ gửi lên máy chủ. Bên API có `npm run verify` mục 8 chạy cả hai bản
 * trên cùng bộ ca và bắt lỗi nếu chúng cho kết quả khác nhau.
 *
 * Chuẩn hoá về "0xxxxxxxxx": bỏ dấu cách/chấm/gạch, đổi +84 và 84 ở đầu thành 0.
 */
export function normalizePhone(input) {
    if (input === null || input === undefined) return ''
    let s = String(input).trim()
    if (!s) return ''

    const plus = s.startsWith('+')
    s = s.replace(/\D/g, '')
    if (!s) return ''

    if (plus && s.startsWith('84')) {
        s = '0' + s.slice(2)
    } else if (!plus && s.startsWith('84') && s.length >= 11) {
        s = '0' + s.slice(2)
    }

    if (!/^0\d{9,10}$/.test(s)) return ''
    return s
}

export function isValidPhone(input) {
    return normalizePhone(input) !== ''
}

// Hiển thị cho dễ đọc: 0901234567 -> 090 123 4567. Chỉ để NHÌN, không dùng
// để lưu hay so sánh.
export function formatPhone(phone) {
    const p = normalizePhone(phone)
    if (!p) return phone || ''
    if (p.length === 10) return `${p.slice(0, 3)} ${p.slice(3, 6)} ${p.slice(6)}`
    return `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}`
}
