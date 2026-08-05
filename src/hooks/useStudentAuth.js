import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'
import { saveStudentSession } from '../lib/studentAuth.js'
import { getDeviceId, getDeviceType } from '../lib/deviceId.js'

export function useStudentLogin() {
    return useMutation({
        mutationFn: ({ email, password }) =>
            api.post('/auth/student/login', {
                email,
                password,
                deviceId: getDeviceId(),
                deviceType: getDeviceType(),
            }),
        onSuccess: (data) => {
            saveStudentSession(data.token, data.student)
        },
    })
}