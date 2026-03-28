import api from '../lib/api'

export async function uploadResume(file) {
  const formData = new FormData()
  formData.append('resume', file)

  const { data } = await api.post('/resume/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return data
}

export async function getResume() {
  const { data } = await api.get('/resume/me')
  return data
}
