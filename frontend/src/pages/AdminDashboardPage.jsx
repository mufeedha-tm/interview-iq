import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { Button, SectionIntro, Panel } from '../components/UI'
import { getAdminDashboard } from '../services/dashboardService'

function AdminDashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      try {
        const dashboardData = await getAdminDashboard()
        setData(dashboardData)
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load admin dashboard.')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionIntro
          eyebrow="Admin Dashboard"
          title="Platform Analytics"
          copy="Monitor user activity and platform performance."
        />
        <div className="loading-shell text-sm text-ink-500">Loading dashboard...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <SectionIntro eyebrow="Admin Dashboard" title="Error" copy="Unable to load dashboard data." />
      </div>
    )
  }

  const subscriptionData = Array.isArray(data.subscriptionBreakdown)
    ? data.subscriptionBreakdown.reduce(
        (acc, item) => {
          acc[item._id] = item.count
          return acc
        },
        {}
      )
    : {}

  const difficultyData = Array.isArray(data.interviewsByDifficulty)
    ? data.interviewsByDifficulty.reduce(
        (acc, item) => {
          acc[item._id || 'unknown'] = item.count
          return acc
        },
        {}
      )
    : {}

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Admin Dashboard"
        title="Platform Analytics"
        copy="Monitor user activity and platform performance."
      />

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel
          title="Total Users"
          copy={
            <>
              <p className="text-3xl font-bold text-accent-500">{data.totalUsers}</p>
              <p className="mt-2 text-sm text-ink-500">{data.verifiedUsers} verified</p>
            </>
          }
        />
        <Panel
          title="Total Interviews"
          copy={
            <>
              <p className="text-3xl font-bold text-accent-500">{data.totalInterviews}</p>
              <p className="mt-2 text-sm text-ink-500">{data.completedInterviews} completed</p>
            </>
          }
        />
        <Panel
          title="Active Users (7d)"
          copy={
            <>
              <p className="text-3xl font-bold text-accent-500">{data.activeUsers}</p>
              <p className="mt-2 text-sm text-ink-500">Last 7 days</p>
            </>
          }
        />
        <Panel
          title="Avg Interview Score"
          copy={
            <>
              <p className="text-3xl font-bold text-accent-500">{data.averageScore}%</p>
              <p className="mt-2 text-sm text-ink-500">Platform average</p>
            </>
          }
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="New Signups (7d)" copy={`${data.newSignups} new users`}>
          <div className="space-y-3 mt-4">
            {data.signupsByDay && data.signupsByDay.length > 0 ? (
              data.signupsByDay.map((day) => (
                <div key={day._id} className="flex justify-between items-center">
                  <span className="text-sm text-ink-600 dark:text-ink-400">{day._id}</span>
                  <span className="font-semibold">{day.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-500">No signup data</p>
            )}
          </div>
        </Panel>

        <Panel title="Subscription Tiers" copy="Active subscriptions">
          <div className="space-y-3 mt-4">
            {Object.entries(subscriptionData).length > 0 ? (
              Object.entries(subscriptionData).map(([tier, count]) => (
                <div key={tier} className="flex justify-between items-center">
                  <span className="text-sm text-ink-600 dark:text-ink-400 capitalize">{tier}</span>
                  <span className="font-semibold">{count} users</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink-500">No subscription data</p>
            )}
          </div>
        </Panel>
      </div>

      {/* Top Skills */}
      <Panel title="Most Popular Skills" copy="Skills tested in interviews">
        <div className="space-y-3 mt-4">
          {data.topSkills && data.topSkills.length > 0 ? (
            data.topSkills.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-sm">{item.skill}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-ink-200 dark:bg-ink-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-500"
                      style={{
                        width: `${((item.count / data.totalInterviews) * 100).toFixed(0)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-10 text-right">{item.count}</span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-ink-500">No skill data</p>
          )}
        </div>
      </Panel>

      {/* Difficulty Breakdown */}
      <Panel title="Interviews by Difficulty" copy="Distribution of interview difficulties">
        <div className="space-y-3 mt-4">
          {Object.entries(difficultyData).length > 0 ? (
            Object.entries(difficultyData).map(([difficulty, count]) => {
              const percentage = ((count / data.totalInterviews) * 100).toFixed(1)
              return (
                <div key={difficulty} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{difficulty}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-ink-200 dark:bg-ink-700 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="text-sm font-semibold w-16 text-right">
                      {count} ({percentage}%)
                    </span>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-ink-500">No difficulty data</p>
          )}
        </div>
      </Panel>

      {/* Top Performing Users */}
      <Panel title="Top 5 Performing Users" copy="Users with highest average scores">
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-ink-500 dark:text-ink-400 border-b border-ink-200 dark:border-ink-700">
              <tr>
                <th className="text-left py-2 px-2">User</th>
                <th className="text-right py-2 px-2">Avg Score</th>
                <th className="text-right py-2 px-2">Interviews</th>
              </tr>
            </thead>
            <tbody>
              {data.topUsers && data.topUsers.length > 0 ? (
                data.topUsers.map((user) => (
                  <tr key={user.userId} className="border-b border-ink-100 dark:border-ink-800">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-semibold">{user.name || 'Unknown'}</p>
                        <p className="text-xs text-ink-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold">{user.avgScore}%</td>
                    <td className="py-3 px-2 text-right">{user.totalInterviews}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="py-4 text-center text-ink-500">
                    No user performance data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Monthly Trend */}
      <Panel title="Interviews Trend (6 months)" copy="Monthly interview completion">
        <div className="space-y-3 mt-4">
          {data.monthlyInterviews && data.monthlyInterviews.length > 0 ? (
            data.monthlyInterviews.map((month) => {
              const maxCount = Math.max(...data.monthlyInterviews.map((m) => m.count), 1)
              const barWidth = ((month.count / maxCount) * 100).toFixed(0)
              return (
                <div key={month.month} className="flex items-center gap-3">
                  <span className="text-sm w-12">{month.month}</span>
                  <div className="flex-1 h-8 bg-ink-200 dark:bg-ink-700 rounded overflow-hidden">
                    <div
                      className="h-full bg-accent-500 flex items-center justify-end pr-2 text-xs font-semibold text-white"
                      style={{ width: `${barWidth}%` }}
                    >
                      {month.count > 0 && month.count}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-ink-500">No monthly data</p>
          )}
        </div>
      </Panel>
    </div>
  )
}

export default AdminDashboardPage
