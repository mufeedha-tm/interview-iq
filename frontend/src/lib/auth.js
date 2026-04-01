const USER_KEY = 'interviewiq_user';
const ACCESS_TOKEN_KEY = 'interviewiq_access_token';
const REFRESH_TOKEN_KEY = 'interviewiq_refresh_token';

export function getStoredToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function getStoredUser() {
  const value = localStorage.getItem(USER_KEY)

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export function storeAuthSession({ user, accessToken, refreshToken }) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  }
}

export function clearAuthSession() {
  localStorage.removeItem(USER_KEY)
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}
