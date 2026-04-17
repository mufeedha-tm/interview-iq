import axios from 'axios'
import {
  clearAuthSession,
  storeAuthSession,
  getStoredAccessToken,
  getStoredRefreshToken,
} from './auth'

const DEFAULT_DEV_API_BASE_URL = 'http://localhost:4000/api'
const configuredApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').trim()
const configuredDevApiBaseUrl = String(import.meta.env.VITE_DEV_API_BASE_URL || '').trim()

function resolveApiBaseUrl() {
  if (import.meta.env.DEV) {
    return configuredDevApiBaseUrl || DEFAULT_DEV_API_BASE_URL
  }
  return configuredApiBaseUrl || DEFAULT_DEV_API_BASE_URL
}

const apiBaseUrl = resolveApiBaseUrl()

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

let isRefreshing = false
let failedQueue = []
api.interceptors.request.use((config) => {
  const token = getStoredAccessToken()
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

const NON_REFRESHABLE_AUTH_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/verify-email',
  '/auth/resend-otp',
  '/auth/forgot-password',
  '/auth/resend-password-otp',
  '/auth/reset-password',
  '/auth/refresh-token',
]

function normalizeRequestPath(url = '') {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try { return new URL(url).pathname } catch { return url }
  }
  return url
}

function shouldSkipTokenRefresh(requestConfig = {}) {
  if (requestConfig.skipAuthRefresh) return true
  const requestPath = normalizeRequestPath(requestConfig.url || '')
  return NON_REFRESHABLE_AUTH_PATHS.some(
    (path) => requestPath === path || requestPath.endsWith(path)
  )
}

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (!originalRequest) return Promise.reject(error)
    if (shouldSkipTokenRefresh(originalRequest)) return Promise.reject(error)

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          if (token) {
            originalRequest.headers['Authorization'] = `Bearer ${token}`
          }
          return api(originalRequest)
        }).catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
       
        const storedRefreshToken = getStoredRefreshToken()
        if (!storedRefreshToken) {
          throw new Error('No refresh token stored')
        }

        const { data } = await axios.post(
          `${apiBaseUrl}/auth/refresh-token`,
          { refreshToken: storedRefreshToken },
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: false,             
          }
        )

        storeAuthSession(data)
        const newAccessToken = data.accessToken
        processQueue(null, newAccessToken)

        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (err) {
        processQueue(err, null)
        clearAuthSession()
        window.dispatchEvent(new CustomEvent('auth:logout'))
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
