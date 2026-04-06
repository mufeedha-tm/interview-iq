import api from '../lib/api'

export async function fetchDashboardData() {
  const { data } = await api.get('/analytics/summary')
  return data
}

export async function fetchLeaderboard(filter = 'all-time', sortBy = 'averageScore') {
  const { data } = await api.get(`/analytics/leaderboard?filter=${filter}&sortBy=${sortBy}`)
  return data
}

export async function getAdminDashboard() {
  const { data } = await api.get('/analytics/admin-dashboard')
  return data
}
