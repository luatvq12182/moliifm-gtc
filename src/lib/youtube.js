// Cho phép admin dán nguyên link YouTube (nhiều dạng khác nhau) hoặc dán
// thẳng ID video — luôn quy về đúng 11 ký tự ID để lưu vào DB.
export function extractYoutubeId(input) {
    if (!input) return ''
    const trimmed = input.trim()

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed

    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ]
    for (const pattern of patterns) {
        const match = trimmed.match(pattern)
        if (match) return match[1]
    }
    return trimmed
}