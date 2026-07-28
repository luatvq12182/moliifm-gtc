const API_URL = import.meta.env.VITE_API_URL

// Những nhóm route dùng token admin — còn lại mặc định dùng token học viên
// (curricula/courses/lessons giờ đã yêu cầu đăng nhập học viên).
const ADMIN_SCOPE_PREFIXES = ['/auth/login', '/auth/me', '/students', '/admin']

function getToken(path) {
    const isAdminScope = ADMIN_SCOPE_PREFIXES.some((prefix) => path.startsWith(prefix))
    return localStorage.getItem(isAdminScope ? 'admin_token' : 'student_token')
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
        throw new Error(data?.message || `Lỗi ${res.status}`)
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
        throw new Error(data?.message || `Lỗi ${res.status}`)
    }

    return data
}

export const api = {
    get: (path) => apiFetch(path, { method: 'GET' }),
    post: (path, body) => apiFetch(path, { method: 'POST', body }),
    put: (path, body) => apiFetch(path, { method: 'PUT', body }),
    patch: (path, body) => apiFetch(path, { method: 'PATCH', body }),
    del: (path) => apiFetch(path, { method: 'DELETE' }),
    upload: (path, file, fieldName) => apiUpload(path, file, fieldName),
}