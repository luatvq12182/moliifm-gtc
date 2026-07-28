import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

export function useCurriculaQuery() {
    return useQuery({
        queryKey: ['admin-curricula'],
        queryFn: () => api.get('/admin/curricula'),
    })
}

export function useCreateCurriculum() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (payload) => api.post('/admin/curricula', payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-curricula'] }),
    })
}

export function useUpdateCurriculum() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, payload }) => api.put(`/admin/curricula/${id}`, payload),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-curricula'] }),
    })
}

export function useDeleteCurriculum() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id) => api.del(`/admin/curricula/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-curricula'] }),
    })
}