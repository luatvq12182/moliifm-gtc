import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

export function useLessonsQuery(courseId) {
    return useQuery({
        queryKey: ['admin-lessons', courseId],
        queryFn: () => api.get(`/admin/lessons?courseId=${courseId}`),
        enabled: Boolean(courseId),
    })
}

export function useLessonQuery(id) {
    return useQuery({
        queryKey: ['admin-lesson', id],
        queryFn: () => api.get(`/admin/lessons/${id}`),
        enabled: Boolean(id),
    })
}

export function useCreateLesson() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload) => api.post('/admin/lessons', payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-lessons'] }),
    })
}

export function useUpdateLesson() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }) => api.put(`/admin/lessons/${id}`, payload),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-lessons'] })
            queryClient.invalidateQueries({ queryKey: ['admin-lesson', variables.id] })
        },
    })
}

export function useToggleLessonStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id) => api.patch(`/admin/lessons/${id}/status`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-lessons'] }),
    })
}

export function useDeleteLesson() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id) => api.del(`/admin/lessons/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-lessons'] }),
    })
}