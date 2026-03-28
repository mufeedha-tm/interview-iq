const USER_KEY = 'interviewiq_user';

export function getStoredToken() {
  return null; // Token is now managed securely via HttpOnly cookies
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

export function storeAuthSession({ user }) {
  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }
}

export function clearAuthSession() {
  localStorage.removeItem(USER_KEY)
}
