import api from '../lib/api'

export async function signupUser(payload) {
  const { data } = await api.post('/auth/signup', payload)
  return data
}

export async function verifyEmailOtp(payload) {
  const { data } = await api.post('/auth/verify-email', payload)
  return data
}

export async function resendOtp(email) {
  const { data } = await api.post('/auth/resend-otp', { email })
  return data
}

export async function loginUser(credentials) {
  const { data } = await api.post('/auth/login', credentials)
  return data
}

export async function forgotPassword(email) {
  const { data } = await api.post('/auth/forgot-password', { email })
  return data
}

export async function resendPasswordOtp(email) {
  const { data } = await api.post('/auth/resend-password-otp', { email })
  return data
}

export async function resetPassword(payload) {
  const { data } = await api.post('/auth/reset-password', payload)
  return data
}

export async function getCurrentUser() {
  const { data } = await api.get('/auth/me')
  return data
}

export async function logoutUser() {
  const { data } = await api.post('/auth/logout')
  return data
}

export async function updateProfile(profileData) {
  const { data } = await api.patch('/auth/me', profileData)
  return data
}

export async function changePassword(passwordData) {
  const { data } = await api.post('/auth/change-password', passwordData)
  return data
}

export async function uploadAvatar(file) {
  const formData = new FormData()
  formData.append('avatar', file)

  const { data } = await api.post('/auth/avatar', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return data
}
