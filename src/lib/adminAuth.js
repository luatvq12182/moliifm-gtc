const TOKEN_KEY = 'admin_token'
const ADMIN_KEY = 'admin_info'

export function saveAdminSession(token, admin) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin))
}

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getAdminInfo() {
  const raw = localStorage.getItem(ADMIN_KEY)
  return raw ? JSON.parse(raw) : null
}

export function clearAdminSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(ADMIN_KEY)
}

export function isAdminLoggedIn() {
  return Boolean(getAdminToken())
}