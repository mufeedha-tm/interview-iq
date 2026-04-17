
const USER_KEY = 'interviewiq_user';
const ACCESS_TOKEN_KEY = 'interviewiq_access_token';
const REFRESH_TOKEN_KEY = 'interviewiq_refresh_token';

export function getStoredUser() {
  try {
    const value = localStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY) || null;
}

export function getStoredRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY) || null;
}
export function storeAuthSession(data) {
  try {
    if (data?.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }
    if (data?.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    }
    if (data?.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    }
  } catch {
    
  }
}

export function clearAuthSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
