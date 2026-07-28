import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

export function useUploadVideo() {
    return useMutation({
        mutationFn: (file) => api.upload('/admin/uploads/video', file, 'video'),
    })
}