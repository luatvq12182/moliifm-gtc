import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

// Khoá gốc của mọi query danh sách học viên.
//
// KHAI BÁO MỘT CHỖ, KHÔNG GÕ TAY Ở TỪNG MUTATION. Trước đây mỗi nơi tự viết
// chuỗi, và useResetStudentDevices lỡ gõ 'admin-students' — một khoá không
// khớp query nào. Hậu quả rất khó lần ra: API chạy đúng, thông báo "đã reset
// thành công" hiện ra, nhưng bảng không tải lại nên vẫn thấy thiết bị cũ còn
// đó. Không có lỗi nào để mà bắt.
//
// Dùng chung hằng số thì gõ sai là lỗi biên dịch, không phải lỗi âm thầm.
export const STUDENTS_KEY = ['students']

// Query lấy danh sách học viên — queryKey gồm cả search/status/page để React
// Query tự tách cache riêng cho từng tổ hợp tham số, và tự gọi lại API khi 1
// trong các tham số này đổi (không cần tự viết useEffect theo dõi nữa).
//
// LỌC Ở MÁY CHỦ, không lọc ở trình duyệt: danh sách có phân trang, lọc phía
// trình duyệt thì chỉ lọc được 20 dòng của trang hiện tại — giáo viên bấm
// "Đã khóa" mà học viên bị khóa nằm ở trang 3 thì không thấy gì.
export function useStudentsQuery({ search, status, page, limit = 20 }) {
    return useQuery({
        queryKey: [...STUDENTS_KEY, { search, status, page, limit }],
        queryFn: () => {
            const params = new URLSearchParams({ page, limit })
            if (search) params.set('search', search)
            if (status) params.set('status', status)
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
            queryClient.invalidateQueries({ queryKey: STUDENTS_KEY })
        },
    })
}

export function useUpdateStudent() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }) => api.put(`/students/${id}`, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: STUDENTS_KEY })
        },
    })
}

export function useToggleStudentStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (studentId) => api.patch(`/students/${studentId}/status`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: STUDENTS_KEY })
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
            queryClient.invalidateQueries({ queryKey: STUDENTS_KEY })
        },
    })
}

export function useResetStudentDevices() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, target }) => api.patch(`/students/${id}/reset-devices`, { target }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: STUDENTS_KEY }),
    })
}