import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

/**
 * Lịch sử hoàn thành bài học.
 *
 * Khóa truy vấn khai một chỗ — cùng lý do đã ghi trong useStudents.js.
 */
export const HISTORY_KEY = ['lesson-history']

export const myHistoryKey = (page, filters = {}) => [...HISTORY_KEY, 'me', page, filters]
export const myAttemptKey = (id) => [...HISTORY_KEY, 'me', 'attempt', id]
export const studentHistoryKey = (studentId, page) => [...HISTORY_KEY, 'student', studentId, page]
export const studentAttemptKey = (studentId, id) => [...HISTORY_KEY, 'student', studentId, 'attempt', id]

// ---------- học viên ----------

/**
 * Ghi lại một lượt hoàn thành bài.
 *
 * Máy chủ tự chống nộp trùng trong vòng một phút, nên bấm thử lại khi mạng
 * chập sẽ không tạo bản ghi thứ hai.
 */
export function useSaveLessonAttempt() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (payload) => api.post('/lesson-attempts', payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: HISTORY_KEY }),
    })
}

/**
 * Lịch sử của chính học viên.
 *
 * @param filters { courseSlug, lessonId, range }  range là MÃ ('7d', '30d'...)
 *   chứ không phải mốc ngày — xem RANGES ở máy chủ.
 */
export function useMyHistory(page = 1, filters = {}) {
    const clean = {}
    for (const [k, v] of Object.entries(filters)) if (v) clean[k] = v

    return useQuery({
        queryKey: myHistoryKey(page, clean),
        queryFn: () => {
            const params = new URLSearchParams({ page, limit: 20, ...clean })
            return api.get(`/lesson-attempts?${params.toString()}`)
        },
        // Giữ dữ liệu cũ trong lúc tải dữ liệu mới, tránh nháy trắng khi đổi
        // bộ lọc hoặc chuyển trang.
        placeholderData: (prev) => prev,
    })
}

export function useMyAttempt(id) {
    return useQuery({
        queryKey: myAttemptKey(id),
        queryFn: () => api.get(`/lesson-attempts/${id}`),
        enabled: Boolean(id),
    })
}

// ---------- quản trị ----------

export function useStudentHistory(studentId, page = 1) {
    return useQuery({
        queryKey: studentHistoryKey(studentId, page),
        queryFn: () => api.get(`/students/${studentId}/lesson-attempts?page=${page}&limit=20`),
        enabled: Boolean(studentId),
    })
}

export function useStudentAttempt(studentId, id) {
    return useQuery({
        queryKey: studentAttemptKey(studentId, id),
        queryFn: () => api.get(`/students/${studentId}/lesson-attempts/${id}`),
        enabled: Boolean(studentId && id),
    })
}

/**
 * Đường dẫn nghe lại một bản ghi âm.
 *
 * KHÔNG dùng thẳng được trong <audio src="...">: route có kiểm quyền bằng
 * header Authorization, mà thẻ audio không gắn header được. Phải tải về bằng
 * fetch kèm token rồi biến thành object URL — xem RecordingPlayer.
 */
export const myRecordingPath = (attemptId) => `/lesson-attempts/recordings/${attemptId}`
export const studentRecordingPath = (studentId, attemptId) =>
    `/students/${studentId}/recordings/${attemptId}`
