import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/apiClient.js'
import { saveStudentSession } from '../lib/studentAuth.js'
import { getDeviceId, getDeviceType } from '../lib/deviceId.js'

export function useStudentLogin() {
    return useMutation({
        mutationFn: ({ phone, password }) =>
            api.post('/auth/student/login', {
                phone,
                password,
                deviceId: getDeviceId(),
                deviceType: getDeviceType(),
            }),
        onSuccess: (data) => {
            saveStudentSession(data.token, data.student)
        },
    })
}

// Học viên tự đổi mật khẩu. Phải biết mật khẩu hiện tại — xem changeOwnPassword
// bên gtc-api để biết vì sao.
//
// KHÔNG đụng vào phiên đăng nhập: máy chủ dùng JWT nên token đang cầm vẫn hợp
// lệ sau khi đổi. Đá học viên ra ngay sau khi họ vừa đổi thành công là vô cớ.
export function useChangePassword() {
    return useMutation({
        mutationFn: ({ currentPassword, newPassword }) =>
            api.patch('/auth/student/change-password', { currentPassword, newPassword }),
    })
}
