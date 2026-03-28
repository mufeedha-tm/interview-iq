import api from '../lib/api'

export async function createInterview(payload) {
  const { data } = await api.post('/interviews', payload)
  return data
}

export async function fetchInterview(interviewId) {
  const { data } = await api.get(`/interviews/${interviewId}`)
  return data
}

export async function fetchInterviewHistory(params = {}) {
  const { data } = await api.get('/interviews/history', { params })
  return data
}

export async function updateInterview(interviewId, payload) {
  const { data } = await api.patch(`/interviews/${interviewId}`, payload)
  return data
}

export async function submitInterviewAnswer(interviewId, answerPayload) {
  const { data } = await api.post(`/interviews/${interviewId}/answers`, answerPayload)
  return data
}

export async function updateInterviewResults(interviewId, payload) {
  const { data } = await api.patch(`/interviews/${interviewId}/results`, payload)
  return data
}

export async function deleteInterview(interviewId) {
  const { data } = await api.delete(`/interviews/${interviewId}`)
  return data
}

export async function generateInterviewEngine(payload) {
  const { data } = await api.post('/interviews/engine', payload)
  return data
}

export async function fetchInterviewRoles() {
  const { data } = await api.get('/interviews/roles')
  return data
}

export async function requestNextQuestion(id, payload) {
  const { data } = await api.post(`/interviews/${id}/next-question`, payload)
  return data
}

export async function uploadInterviewMedia(interviewId, questionLabel, blob) {
  const formData = new FormData()
  formData.append('question', questionLabel)
  formData.append('media', blob, blob.type.includes('video') ? 'recording.webm' : 'audio.webm')
  
  const { data } = await api.post(`/interviews/${interviewId}/media`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
