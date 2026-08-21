import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

// Lịch sử luyện nói của MỘT học viên. `enabled` cho phép hoãn gọi API cho tới
// khi modal thật sự mở và cờ tính năng đang bật.
export function usePracticeAttemptsQuery({ studentId, page = 1, limit = 20, enabled = true }) {
    return useQuery({
        queryKey: ['practice-attempts', studentId, page, limit],
        queryFn: () => api.get(`/students/${studentId}/practice-attempts?page=${page}&limit=${limit}`),
        enabled: Boolean(studentId) && enabled,
        placeholderData: keepPreviousData,
    })
}

// Tải bản ghi âm về dạng Blob rồi tạo object URL cho thẻ <audio>.
// Người gọi có trách nhiệm URL.revokeObjectURL khi không dùng nữa.
export async function fetchAttemptAudioUrl(studentId, attemptId) {
    const blob = await api.blob(`/students/${studentId}/practice-attempts/${attemptId}/audio`)
    return URL.createObjectURL(blob)
}

// Xoá sạch lịch sử của một học viên — dùng khi nghiệm thu xong hoặc khi học
// viên yêu cầu xoá dữ liệu cá nhân.
export function useDeletePracticeHistory() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (studentId) => api.del(`/students/${studentId}/practice-attempts`),
        onSuccess: (_data, studentId) => {
            queryClient.invalidateQueries({ queryKey: ['practice-attempts', studentId] })
        },
    })
}
