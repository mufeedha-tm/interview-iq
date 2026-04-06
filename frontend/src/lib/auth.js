const USER_KEY = 'interviewiq_user';

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${name}=`));
  if (!value) return null;
  return value.split('=')[1] || null;
};

const setCookie = (name, value, options = {}) => {
  if (typeof document === 'undefined') return;
  let cookieString = `${name}=${value}; path=/;`;

  if (options.maxAge) {
    cookieString += ` max-age=${options.maxAge};`;
  }
  if (options.expires) {
    cookieString += ` expires=${options.expires.toUTCString()};`;
  }
  if (options.sameSite) {
    cookieString += ` SameSite=${options.sameSite};`;
  }
  if (options.secure) {
    cookieString += ' Secure;';
  }

  document.cookie = cookieString;
};

const deleteCookie = (name) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
};

export function getStoredUser() {
  const value = getCookie(USER_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value));
  } catch {
    return null;
  }
}

export function storeAuthSession({ user }) {
  if (user) {
    setCookie(USER_KEY, encodeURIComponent(JSON.stringify(user)), {
      maxAge: 7 * 24 * 60 * 60,
      sameSite: 'Lax',
    });
  }
}

export function clearAuthSession() {
  deleteCookie(USER_KEY);
}
