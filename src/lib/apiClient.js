const API_URL = import.meta.env.VITE_API_URL

// Những nhóm route dùng token admin — còn lại mặc định dùng token học viên
// (curricula/courses/lessons giờ đã yêu cầu đăng nhập học viên).
const ADMIN_SCOPE_PREFIXES = ['/auth/login', '/auth/me', '/students', '/admin']

function isAdminScope(path) {
    return ADMIN_SCOPE_PREFIXES.some((prefix) => path.startsWith(prefix))
}

function getToken(path) {
    return localStorage.getItem(isAdminScope(path) ? 'admin_token' : 'student_token')
}

async function apiFetch(path, options = {}) {
    const token = getToken(path)

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
        // 401 = token hết hạn / không hợp lệ / bị vô hiệu. Tự đăng xuất + đẩy về
        // trang login thay vì để người dùng mắc kẹt ở màn hình lỗi. Xóa đúng
        // loại session (admin hay học viên) tùy request thuộc phạm vi nào.
        // TÀI KHOẢN BỊ KHOÁ CŨNG PHẢI KẾT THÚC PHIÊN, không chỉ token hết hạn.
        //
        // Trước đây chỉ bắt 401. Admin khoá một học viên đang đăng nhập thì máy
        // chủ bắt đầu trả 403 — nhưng giao diện coi đó là lỗi thường: không xoá
        // phiên, không chuyển hướng. Học viên vẫn ở trong ứng dụng và dùng tiếp
        // được mọi trang đã tải sẵn trong bộ nhớ. Khoá tài khoản gần như không
        // có tác dụng cho tới khi họ tự đăng xuất.
        //
        // Nhận diện bằng MÃ của máy chủ, không phải bằng mã trạng thái 403 nói
        // chung: 403 còn dùng cho lỗi giới hạn thiết bị lúc đăng nhập, đá người
        // ta ra ở ca đó là sai.
        const accountLocked = res.status === 403 && data?.code === 'ACCOUNT_LOCKED'
        // Máy khác vừa đăng nhập và chiếm chỗ thiết bị này. Trả 401 nên nhánh
        // dưới vốn đã xoá phiên — chỉ cần nhận ra để còn nói cho học viên biết
        // VÌ SAO, thay vì đẩy họ về màn hình đăng nhập trắng trơn.
        const deviceTakenOver = res.status === 401 && data?.code === 'DEVICE_TAKEN_OVER'

        if (res.status === 401 || accountLocked) {
            if (isAdminScope(path)) {
                localStorage.removeItem('admin_token')
                localStorage.removeItem('admin_info')
            } else {
                localStorage.removeItem('student_token')
                localStorage.removeItem('student_info')
            }

            // Nói rõ vì sao bị đăng xuất. Không có dòng này thì học viên bị đẩy
            // về trang login trắng trơn giữa chừng và tưởng hệ thống lỗi.
            // sessionStorage vì ngay sau đây là một lần tải lại trang.
            if (accountLocked || deviceTakenOver) {
                try {
                    sessionStorage.setItem('logout_reason', data?.message || '')
                } catch {
                    // Chế độ ẩn danh có thể chặn — mất lời nhắn thì vẫn phải đăng xuất.
                }
            }

            // Chỉ chuyển hướng nếu đang không ở sẵn trang login (tránh vòng lặp).
            // Dùng location.href (tải lại cả trang) chứ không phải điều hướng
            // trong ứng dụng: nó xoá sạch bộ nhớ đệm React Query, nếu không thì
            // bài học đã tải vẫn xem được dù đã đăng xuất.
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'
            }
        }
        const err = new Error(data?.message || `Lỗi ${res.status}`)
        err.status = res.status
        throw err
    }

    return data
}

async function apiUpload(path, file, fieldName = 'image') {
    const token = getToken(path)
    const formData = new FormData()
    formData.append(fieldName, file)

    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
    })

    const data = await res.json().catch(() => null)

    if (!res.ok) {
        const err = new Error(data?.message || `Lỗi ${res.status}`)
        err.status = res.status
        throw err
    }

    return data
}

// Tải file nhị phân (hiện dùng cho bản ghi âm luyện nói).
// KHÔNG dùng thẳng <audio src="..."> được, vì thẻ audio không gắn được header
// Authorization. Phải fetch kèm token rồi biến thành object URL.
// Gửi file lên và NHẬN VỀ FILE (không phải JSON).
//
// Dùng cho việc nhập học viên hàng loạt: đẩy danh sách lên, nhận lại bảng tính
// có thêm cột mật khẩu. apiUpload không dùng được vì nó luôn parse JSON, còn
// apiBlob thì chỉ biết GET.
async function apiUploadBlob(path, file, fieldName = 'file') {
    const token = getToken(path)
    const formData = new FormData()
    formData.append(fieldName, file)

    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
    })

    if (!res.ok) {
        // Lỗi thì máy chủ trả JSON chứ không trả file.
        const data = await res.json().catch(() => null)
        const err = new Error(data?.message || `Lỗi ${res.status}`)
        err.status = res.status
        throw err
    }

    return res.blob()
}

async function apiBlob(path) {
    const token = getToken(path)
    const res = await fetch(`${API_URL}${path}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!res.ok) {
        const data = await res.json().catch(() => null)
        const err = new Error(data?.message || `Lỗi ${res.status}`)
        err.status = res.status
        throw err
    }
    return res.blob()
}

export const api = {
    get: (path) => apiFetch(path, { method: 'GET' }),
    post: (path, body) => apiFetch(path, { method: 'POST', body }),
    put: (path, body) => apiFetch(path, { method: 'PUT', body }),
    patch: (path, body) => apiFetch(path, { method: 'PATCH', body }),
    del: (path) => apiFetch(path, { method: 'DELETE' }),
    upload: (path, file, fieldName) => apiUpload(path, file, fieldName),
    uploadBlob: (path, file, fieldName) => apiUploadBlob(path, file, fieldName),
    blob: (path) => apiBlob(path),
}