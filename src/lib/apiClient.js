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
        if (res.status === 401) {
            if (isAdminScope(path)) {
                localStorage.removeItem('admin_token')
                localStorage.removeItem('admin_info')
            } else {
                localStorage.removeItem('student_token')
                localStorage.removeItem('student_info')
            }
            // Chỉ chuyển hướng nếu đang không ở sẵn trang login (tránh vòng lặp)
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
    blob: (path) => apiBlob(path),
}