import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'
import { saveAdminSession } from '../lib/adminAuth.js'

export function useAdminLogin() {
    return useMutation({
        mutationFn: ({ email, password }) => api.post('/auth/login', { email, password }),
        onSuccess: (data) => {
            saveAdminSession(data.token, data.admin)
        },
    })
}