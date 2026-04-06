import api from '../lib/api'

export async function getQuestions(params = {}) {
  const { data } = await api.get('/questions', { params })
  return data
}

export async function getQuestionById(id) {
  const { data } = await api.get(`/questions/${id}`)
  return data
}

export async function createQuestion(payload) {
  const { data } = await api.post('/questions', payload)
  return data
}

export async function updateQuestion(id, payload) {
  const { data } = await api.put(`/questions/${id}`, payload)
  return data
}

export async function deleteQuestion(id) {
  const { data } = await api.delete(`/questions/${id}`)
  return data
}
