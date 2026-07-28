const TOKEN_KEY = 'student_token'
const STUDENT_KEY = 'student_info'

export function saveStudentSession(token, student) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(STUDENT_KEY, JSON.stringify(student))
}

export function getStudentToken() {
    return localStorage.getItem(TOKEN_KEY)
}

export function getStudentInfo() {
    const raw = localStorage.getItem(STUDENT_KEY)
    return raw ? JSON.parse(raw) : null
}

export function clearStudentSession() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(STUDENT_KEY)
}

export function isStudentLoggedIn() {
    return Boolean(getStudentToken())
}