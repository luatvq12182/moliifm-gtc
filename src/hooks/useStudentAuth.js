import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'
import { saveStudentSession } from '../lib/studentAuth.js'

export function useStudentLogin() {
    return useMutation({
        mutationFn: ({ email, password }) => api.post('/auth/student/login', { email, password }),
        onSuccess: (data) => {
            saveStudentSession(data.token, data.student)
        },
    })
}