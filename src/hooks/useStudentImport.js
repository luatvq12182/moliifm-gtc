import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

// Đẩy file cho máy chủ soát, KHÔNG tạo tài khoản nào. Trả về báo cáo để admin
// xem trước.
export function usePreviewImport() {
    return useMutation({
        mutationFn: (file) => api.upload('/students/import/preview', file, 'file'),
    })
}

// Tạo thật. Gửi LẠI chính file đó chứ không gửi danh sách dòng đã soát: máy chủ
// đọc và soát lại từ đầu, nên trình duyệt không thể chèn thêm dòng, và bắt được
// cả trường hợp có người vừa tạo trùng email xen vào giữa hai bước.
export function useCommitImport() {
    return useMutation({
        mutationFn: (file) => api.uploadBlob('/students/import/commit', file, 'file'),
    })
}

// Đưa file về máy người dùng. Thu hồi object URL sau khi bấm, kẻo mỗi lần tải
// là một blob bị bỏ quên trong bộ nhớ.
export function saveFile(blob, filename) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadTemplate() {
    const blob = await api.blob('/students/import/template')
    saveFile(blob, 'mau-danh-sach-hoc-vien.xlsx')
}
