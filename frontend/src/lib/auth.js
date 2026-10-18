// Authentication helpers for SkyPulse

const TOKEN_KEY = 'skypulse_jwt_token'

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

export const clearToken = () => {
  try {
    localStorage.clear()
  } catch (err) {
    console.warn('Failed to clear localStorage:', err)
  }
  try {
    sessionStorage.clear()
  } catch (err) {
    console.warn('Failed to clear sessionStorage:', err)
  }
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name))
      }).catch(() => {})
    } catch (e) {}
  }
}

export const getUser = () => {
  const token = getToken()
  if (!token) return null

  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      // It might be a mock token or JSON object in demo mode
      try {
        return JSON.parse(token)
      } catch {
        return null
      }
    }
    const payload = parts[1]
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(decoded)
  } catch (err) {
    console.error('Error decoding token:', err)
    return null
  }
}

export const isAuthenticated = () => {
  const user = getUser()
  if (!user) return false
  if (user.exp && Date.now() >= user.exp * 1000) {
    clearToken()
    return false
  }
  return true
}

export const isAdmin = () => {
  const user = getUser()
  if (user && (user.role === 'admin' || user.isAdmin === true)) {
    return true
  }
  // Also check admin session password if saved
  const adminPassword = localStorage.getItem('admin_password')
  return Boolean(adminPassword)
}
