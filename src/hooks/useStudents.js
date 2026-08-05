import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

// Query lấy danh sách học viên — queryKey gồm cả search/page để React Query
// tự tách cache riêng cho từng tổ hợp tham số, và tự gọi lại API khi 1 trong
// các tham số này đổi (không cần tự viết useEffect theo dõi search/page nữa).
export function useStudentsQuery({ search, page, limit = 20 }) {
    return useQuery({
        queryKey: ['students', { search, page, limit }],
        queryFn: () => {
            const params = new URLSearchParams({ page, limit })
            if (search) params.set('search', search)
            return api.get(`/students?${params.toString()}`)
        },
        placeholderData: keepPreviousData, // giữ dữ liệu trang cũ hiển thị trong lúc trang mới đang tải, tránh giật/nháy trắng bảng
    })
}

export function useCreateStudent() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload) => api.post('/students', payload),
        onSuccess: () => {
            // Đánh dấu mọi query có key bắt đầu bằng 'students' là cũ, tự động gọi lại
            queryClient.invalidateQueries({ queryKey: ['students'] })
        },
    })
}

export function useUpdateStudent() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }) => api.put(`/students/${id}`, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] })
        },
    })
}

export function useToggleStudentStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (studentId) => api.patch(`/students/${studentId}/status`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] })
        },
    })
}

export function useResetStudentPassword() {
    return useMutation({
        mutationFn: (studentId) => api.patch(`/students/${studentId}/reset-password`),
        // Không cần invalidateQueries — reset password không đổi dữ liệu hiển thị trong bảng
    })
}

export function useDeleteStudent() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (studentId) => api.del(`/students/${studentId}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['students'] })
        },
    })
}

export function useResetStudentDevices() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, target }) => api.patch(`/students/${id}/reset-devices`, { target }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-students'] }),
    })
}