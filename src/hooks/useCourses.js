import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

export function useCoursesQuery(curriculumId) {
    return useQuery({
        queryKey: ['admin-courses', curriculumId],
        queryFn: () => api.get(`/admin/courses?curriculumId=${curriculumId}`),
        enabled: Boolean(curriculumId), // chỉ gọi API khi đã chọn giáo trình
    })
}

export function useCreateCourse() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload) => api.post('/admin/courses', payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-courses'] }),
    })
}

export function useUpdateCourse() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }) => api.put(`/admin/courses/${id}`, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-courses'] }),
    })
}

export function useDeleteCourse() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id) => api.del(`/admin/courses/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-courses'] }),
    })
}