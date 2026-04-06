import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { Button, Panel, SectionIntro } from '../components/UI'
import { getAdminDashboard } from '../services/dashboardService'
import { getUserById, getUsers } from '../services/userService'
import { Icon } from '../components/Icons'

function AdminDashboardPage() {
  const [data, setData] = useState(null)
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserDetails, setSelectedUserDetails] = useState(null)
  const [selectedUserStats, setSelectedUserStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      try {
        const [dashboardData, userData] = await Promise.all([
          getAdminDashboard(),
          getUsers({ page: 1, limit: 6 }),
        ])

        const nextUsers = userData.users || []
        setData(dashboardData)
        setUsers(nextUsers)
        setSelectedUserId(nextUsers[0]?._id || '')
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load admin dashboard.')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUserDetails(null)
      setSelectedUserStats(null)
      return
    }

    let active = true

    async function loadSelectedUser() {
      setDetailsLoading(true)
      try {
        const detailData = await getUserById(selectedUserId)
        if (!active) return
        setSelectedUserDetails(detailData.user || null)
        setSelectedUserStats(detailData.stats || null)
      } catch (error) {
        if (!active) return
        setSelectedUserDetails(null)
        setSelectedUserStats(null)
        toast.error(error.response?.data?.message || 'Failed to load user details.')
      } finally {
        if (active) {
          setDetailsLoading(false)
        }
      }
    }

    loadSelectedUser()

    return () => {
      active = false
    }
  }, [selectedUserId])

  const subscriptionData = Array.isArray(data?.subscriptionBreakdown)
    ? data.subscriptionBreakdown.reduce((acc, item) => {
        acc[item._id] = item.count
        return acc
      }, {})
    : {}

  const difficultyData = Array.isArray(data?.interviewsByDifficulty)
    ? data.interviewsByDifficulty.reduce((acc, item) => {
        acc[item._id || 'unknown'] = item.count
        return acc
      }, {})
    : {}

  const adminMenu = useMemo(
    () => [
      {
        label: 'Dashboard overview',
        copy: 'Platform metrics and user spotlight.',
        icon: 'chart',
        active: true,
      },
      {
        label: 'Manage users',
        copy: 'Open the full user administration page.',
        icon: 'user',
        to: '/admin-users',
      },
      {
        label: 'Question bank',
        copy: 'Create and manage interview questions.',
        icon: 'doc',
        to: '/admin-questions',
      },
      {
        label: 'Joined reports',
        copy: 'Inspect reports and feedback records.',
        icon: 'doc',
        to: '/admin-reports',
      },
    ],
    [],
  )

  const selectedUserMeta = [
    { label: 'Role', value: selectedUserDetails?.role || 'user' },
    { label: 'Verification', value: selectedUserDetails?.isVerified ? 'Verified' : 'Pending' },
    { label: 'Subscription', value: selectedUserDetails?.subscriptionTier || 'free' },
    { label: 'Target role', value: selectedUserDetails?.targetRole || 'Not set' },
    { label: 'Resume', value: selectedUserDetails?.resumeUrl ? 'Uploaded' : 'Not uploaded' },
    { label: 'Premium credits', value: String(selectedUserDetails?.premiumInterviewsRemaining ?? 0) },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionIntro
          eyebrow="Admin Dashboard"
          title="Admin control panel"
          copy="Loading platform metrics and recent users."
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

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Admin Dashboard"
        title="Admin control panel"
        copy="This panel is for admin only. Review platform health, inspect user accounts, and jump into moderation tools."
        action={
          <div className="flex flex-wrap gap-3">
            <Button to="/admin-users" variant="secondary">
              <Icon name="user" className="h-4 w-4" />
              Open users
            </Button>
            <Button to="/admin-questions" variant="secondary">
              <Icon name="doc" className="h-4 w-4" />
              Manage questions
            </Button>
            <Button to="/admin-reports">
              <Icon name="doc" className="h-4 w-4" />
              Open reports
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="soft-panel p-5 md:p-6">
          <div className="space-y-2 border-b border-ink-100 pb-5 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-400 dark:text-ink-300">
              Admin panel
            </p>
            <h2 className="font-display text-2xl font-semibold text-ink-950 dark:text-white">
              Control center
            </h2>
            <p className="text-sm leading-6 text-ink-500 dark:text-ink-300">
              A private workspace for you to review users, activity, and platform-wide analytics.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {adminMenu.map((item) =>
              item.to ? (
                <Button key={item.label} to={item.to} variant="ghost" className="w-full justify-start rounded-2xl px-4 py-4">
                  <Icon name={item.icon} className="h-4 w-4" />
                  <span className="flex flex-col items-start">
                    <span>{item.label}</span>
                    <span className="text-xs font-medium text-ink-400 dark:text-ink-300">{item.copy}</span>
                  </span>
                </Button>
              ) : (
                <div
                  key={item.label}
                  className="rounded-2xl border border-coral-200 bg-coral-50/80 px-4 py-4 text-coral-700 shadow-sm dark:border-coral-500/20 dark:bg-coral-500/10 dark:text-coral-100"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white/80 p-2 dark:bg-white/10">
                      <Icon name={item.icon} className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-coral-600 dark:text-coral-200/80">{item.copy}</p>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl bg-ink-50 px-4 py-4 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400 dark:text-ink-300">Users</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink-950 dark:text-white">{data.totalUsers}</p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">{data.verifiedUsers} verified</p>
            </div>
            <div className="rounded-2xl bg-ink-50 px-4 py-4 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400 dark:text-ink-300">Active 7d</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink-950 dark:text-white">{data.activeUsers}</p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">Recently active accounts</p>
            </div>
            <div className="rounded-2xl bg-ink-50 px-4 py-4 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400 dark:text-ink-300">Avg score</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink-950 dark:text-white">{data.averageScore}%</p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">Platform average</p>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
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
              title="New Signups"
              copy={
                <>
                  <p className="text-3xl font-bold text-accent-500">{data.newSignups}</p>
                  <p className="mt-2 text-sm text-ink-500">Last 7 days</p>
                </>
              }
            />
            <Panel
              title="Premium Users"
              copy={
                <>
                  <p className="text-3xl font-bold text-accent-500">{subscriptionData.premium || 0}</p>
                  <p className="mt-2 text-sm text-ink-500">Tracked subscriptions</p>
                </>
              }
            />
          </div>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.25fr)_360px]">
            <Panel
              title="Recent users"
              copy="Select a user to inspect their account details."
              action={
                <Button to="/admin-users" variant="secondary">
                  Full user manager
                </Button>
              }
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead className="border-b border-ink-200 text-ink-500 dark:border-ink-700 dark:text-ink-400">
                    <tr>
                      <th className="px-3 py-3 text-left font-semibold">User</th>
                      <th className="px-3 py-3 text-left font-semibold">Target role</th>
                      <th className="px-3 py-3 text-left font-semibold">Subscription</th>
                      <th className="px-3 py-3 text-left font-semibold">Status</th>
                      <th className="px-3 py-3 text-right font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isActive = selectedUserId === user._id
                      return (
                        <tr
                          key={user._id}
                          className={`border-b border-ink-100 dark:border-ink-800 ${
                            isActive ? 'bg-coral-50/70 dark:bg-coral-500/10' : ''
                          }`}
                        >
                          <td className="px-3 py-4">
                            <div>
                              <p className="font-semibold text-ink-950 dark:text-white">
                                {[user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed user'}
                              </p>
                              <p className="text-xs text-ink-500 dark:text-ink-300">{user.email}</p>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-ink-600 dark:text-ink-300">{user.targetRole || 'Not set'}</td>
                          <td className="px-3 py-4">
                            <span className={`status-chip ${user.subscriptionTier === 'premium' ? 'status-chip-danger' : 'status-chip-neutral'}`}>
                              {user.subscriptionTier || 'free'}
                            </span>
                          </td>
                          <td className="px-3 py-4">
                            <span className={`status-chip ${user.isVerified ? 'status-chip-success' : 'status-chip-danger'}`}>
                              {user.isVerified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant={isActive ? 'accent' : 'ghost'}
                                className="px-3 py-2 text-xs"
                                onClick={() => setSelectedUserId(user._id)}
                              >
                                View details
                              </Button>
                              <Button to={`/admin-users?search=${encodeURIComponent(user.email)}`} variant="secondary" className="px-3 py-2 text-xs">
                                Manage
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Selected user details" copy="Focused account information for the selected user.">
              {detailsLoading ? (
                <div className="loading-shell text-sm text-ink-500">Loading user details...</div>
              ) : selectedUserDetails ? (
                <div className="space-y-5">
                  <div className="rounded-3xl bg-ink-50 p-5 dark:bg-white/5">
                    <p className="font-display text-2xl font-semibold text-ink-950 dark:text-white">
                      {[selectedUserDetails.firstName, selectedUserDetails.lastName].filter(Boolean).join(' ') || 'Unnamed user'}
                    </p>
                    <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{selectedUserDetails.email}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="status-chip status-chip-neutral uppercase">{selectedUserDetails.role || 'user'}</span>
                      <span className={`status-chip ${selectedUserDetails.isVerified ? 'status-chip-success' : 'status-chip-danger'}`}>
                        {selectedUserDetails.isVerified ? 'Verified' : 'Pending verification'}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {selectedUserMeta.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-ink-100 bg-white/80 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400 dark:text-ink-300">{item.label}</p>
                        <p className="mt-2 text-sm font-semibold text-ink-950 dark:text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-ink-50 px-4 py-4 dark:bg-white/5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400 dark:text-ink-300">Total interviews</p>
                      <p className="mt-2 font-display text-2xl font-semibold text-ink-950 dark:text-white">{selectedUserStats?.totalInterviews ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-ink-50 px-4 py-4 dark:bg-white/5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400 dark:text-ink-300">Completed</p>
                      <p className="mt-2 font-display text-2xl font-semibold text-ink-950 dark:text-white">{selectedUserStats?.completedInterviews ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-ink-50 px-4 py-4 dark:bg-white/5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400 dark:text-ink-300">Avg score</p>
                      <p className="mt-2 font-display text-2xl font-semibold text-ink-950 dark:text-white">{selectedUserStats?.averageScore ?? 0}%</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-ink-100 bg-white/90 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400 dark:text-ink-300">Latest activity</p>
                    {selectedUserStats?.latestInterview ? (
                      <div className="mt-3 space-y-2">
                        <p className="font-semibold text-ink-950 dark:text-white">{selectedUserStats.latestInterview.title}</p>
                        <p className="text-sm text-ink-500 dark:text-ink-300">
                          Status: {selectedUserStats.latestInterview.status} | Difficulty: {selectedUserStats.latestInterview.difficulty}
                        </p>
                        <p className="text-sm text-ink-500 dark:text-ink-300">
                          Score: {selectedUserStats.latestInterview.results?.score ?? 'Pending'}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-ink-500 dark:text-ink-300">
                        This user has not started any interviews yet.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-state">Select a user to view their details.</div>
              )}
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="New Signups (7d)" copy={`${data.newSignups} new users`}>
              <div className="mt-4 space-y-3">
                {data.signupsByDay && data.signupsByDay.length > 0 ? (
                  data.signupsByDay.map((day) => (
                    <div key={day._id} className="flex items-center justify-between">
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
              <div className="mt-4 space-y-3">
                {Object.entries(subscriptionData).length > 0 ? (
                  Object.entries(subscriptionData).map(([tier, count]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <span className="text-sm capitalize text-ink-600 dark:text-ink-400">{tier}</span>
                      <span className="font-semibold">{count} users</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-ink-500">No subscription data</p>
                )}
              </div>
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="Most Popular Skills" copy="Skills tested in interviews">
              <div className="mt-4 space-y-3">
                {data.topSkills && data.topSkills.length > 0 ? (
                  data.topSkills.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm">{item.skill}</span>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-32 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700">
                          <div
                            className="h-full bg-accent-500"
                            style={{ width: `${((item.count / data.totalInterviews) * 100).toFixed(0)}%` }}
                          />
                        </div>
                        <span className="w-10 text-right text-sm font-semibold">{item.count}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-ink-500">No skill data</p>
                )}
              </div>
            </Panel>

            <Panel title="Interviews by Difficulty" copy="Distribution of interview difficulties">
              <div className="mt-4 space-y-3">
                {Object.entries(difficultyData).length > 0 ? (
                  Object.entries(difficultyData).map(([difficulty, count]) => {
                    const percentage = ((count / data.totalInterviews) * 100).toFixed(1)
                    return (
                      <div key={difficulty} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{difficulty}</span>
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-32 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-700">
                            <div className="h-full bg-sky-500" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="w-16 text-right text-sm font-semibold">
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
          </div>

          <Panel title="Top performing users" copy="Users with the highest interview averages.">
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-ink-200 text-ink-500 dark:border-ink-700 dark:text-ink-400">
                  <tr>
                    <th className="px-2 py-2 text-left">User</th>
                    <th className="px-2 py-2 text-right">Avg Score</th>
                    <th className="px-2 py-2 text-right">Interviews</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topUsers && data.topUsers.length > 0 ? (
                    data.topUsers.map((user) => (
                      <tr key={user.userId} className="border-b border-ink-100 dark:border-ink-800">
                        <td className="px-2 py-3">
                          <div>
                            <p className="font-semibold">{user.name || 'Unknown'}</p>
                            <p className="text-xs text-ink-500">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-right font-semibold">{user.avgScore}%</td>
                        <td className="px-2 py-3 text-right">{user.totalInterviews}</td>
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

          <Panel title="Interviews trend (6 months)" copy="Monthly interview completion volume across the platform.">
            <div className="mt-4 space-y-3">
              {data.monthlyInterviews && data.monthlyInterviews.length > 0 ? (
                data.monthlyInterviews.map((month) => {
                  const maxCount = Math.max(...data.monthlyInterviews.map((m) => m.count), 1)
                  const barWidth = ((month.count / maxCount) * 100).toFixed(0)
                  return (
                    <div key={month.month} className="flex items-center gap-3">
                      <span className="w-12 text-sm">{month.month}</span>
                      <div className="h-8 flex-1 overflow-hidden rounded bg-ink-200 dark:bg-ink-700">
                        <div
                          className="flex h-full items-center justify-end bg-accent-500 pr-2 text-xs font-semibold text-white"
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
      </div>
    </div>
  )
}

export default AdminDashboardPage
