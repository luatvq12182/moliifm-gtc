// Chuyển tên tiếng Việt có dấu thành slug an toàn cho URL
// (vd. "Giáo trình HSK 2.0" -> "giao-trinh-hsk-2-0")
export function slugify(text) {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
}