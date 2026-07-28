import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'

export function useUploadImage() {
    return useMutation({
        mutationFn: (file) => api.upload('/admin/uploads/image', file, 'image'),
    })
}