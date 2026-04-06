import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { useSearchParams } from 'react-router-dom'
import { Button, Panel, SectionIntro } from '../components/UI'
import { Icon } from '../components/Icons'
import { deleteUser, getUserById, getUsers, updateUser } from '../services/userService'

function formatDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(value) {
  if (!value) return 'Not available'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUserDetails, setSelectedUserDetails] = useState(null)
  const [selectedUserStats, setSelectedUserStats] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterForm, setFilterForm] = useState({ search: '', role: '' })
  const [editForm, setEditForm] = useState({
    role: 'user',
    subscriptionTier: 'free',
    isVerified: false,
    premiumInterviewsRemaining: 0,
  })

  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || ''
  const page = Number.parseInt(searchParams.get('page') || '1', 10)

  useEffect(() => {
    setFilterForm({ search, role })
  }, [search, role])

  useEffect(() => {
    async function loadUsers() {
      setLoading(true)
      try {
        const data = await getUsers({
          page,
          limit: 10,
          search: search || undefined,
          role: role || undefined,
        })

        const nextUsers = data.users || []
        setUsers(nextUsers)
        setPagination(
          data.pagination || {
            page: 1,
            limit: 10,
            totalPages: 1,
            total: nextUsers.length,
          },
        )

        setSelectedUserId((current) => {
          if (nextUsers.some((user) => user._id === current)) return current
          return nextUsers[0]?._id || ''
        })
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load users.')
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [page, role, search])

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
        const data = await getUserById(selectedUserId)
        if (!active) return

        const nextUser = data.user || null
        setSelectedUserDetails(nextUser)
        setSelectedUserStats(data.stats || null)
        setEditForm({
          role: nextUser?.role || 'user',
          subscriptionTier: nextUser?.subscriptionTier || 'free',
          isVerified: Boolean(nextUser?.isVerified),
          premiumInterviewsRemaining: nextUser?.premiumInterviewsRemaining ?? 0,
        })
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

  const adminMenu = useMemo(
    () => [
      {
        label: 'Manage users',
        copy: 'Private account review and moderation workspace.',
        icon: 'user',
        active: true,
      },
      {
        label: 'Dashboard overview',
        copy: 'Return to the full platform analytics page.',
        icon: 'chart',
        to: '/admin-dashboard',
      },
      {
        label: 'Question bank',
        copy: 'Manage interview questions with CRUD tools.',
        icon: 'doc',
        to: '/admin-questions',
      },
      {
        label: 'Joined reports',
        copy: 'Inspect feedback and issue reports.',
        icon: 'doc',
        to: '/admin-reports',
      },
    ],
    [],
  )

  const listStats = useMemo(() => {
    const adminCount = users.filter((user) => user.role === 'admin').length
    const premiumCount = users.filter((user) => user.subscriptionTier === 'premium').length
    const verifiedCount = users.filter((user) => user.isVerified).length

    return {
      adminCount,
      premiumCount,
      verifiedCount,
    }
  }, [users])

  const selectedUserMeta = [
    { label: 'Joined', value: formatDate(selectedUserDetails?.createdAt) },
    { label: 'Target role', value: selectedUserDetails?.targetRole || 'Not set' },
    { label: 'Experience', value: selectedUserDetails?.experienceLevel || 'Not set' },
    { label: 'Resume uploaded', value: selectedUserDetails?.resumeUploadedAt ? formatDate(selectedUserDetails.resumeUploadedAt) : 'No' },
    { label: 'Resume score', value: selectedUserDetails?.resumeEvaluation?.score ?? 'Not scored' },
    { label: 'Premium expires', value: formatDate(selectedUserDetails?.premiumExpiresAt) },
  ]

  function handleSearchSubmit(event) {
    event.preventDefault()

    const nextParams = {}
    if (filterForm.search.trim()) nextParams.search = filterForm.search.trim()
    if (filterForm.role) nextParams.role = filterForm.role
    nextParams.page = '1'
    setSearchParams(nextParams)
  }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > pagination.totalPages) return

    const nextParams = Object.fromEntries(searchParams.entries())
    nextParams.page = String(newPage)
    setSearchParams(nextParams)
  }

  async function handleSaveUser() {
    if (!selectedUserDetails?._id) return

    setSaving(true)
    try {
      const payload = {
        role: editForm.role,
        subscriptionTier: editForm.subscriptionTier,
        isVerified: editForm.isVerified,
        premiumInterviewsRemaining: Number(editForm.premiumInterviewsRemaining) || 0,
      }

      const { user: updatedUser } = await updateUser(selectedUserDetails._id, payload)

      setUsers((current) => current.map((user) => (user._id === updatedUser._id ? updatedUser : user)))
      setSelectedUserDetails(updatedUser)
      setEditForm({
        role: updatedUser.role || 'user',
        subscriptionTier: updatedUser.subscriptionTier || 'free',
        isVerified: Boolean(updatedUser.isVerified),
        premiumInterviewsRemaining: updatedUser.premiumInterviewsRemaining ?? 0,
      })
      toast.success('User updated successfully.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user.')
    } finally {
      setSaving(false)
    }
  }

  function handleResetEdit() {
    setEditForm({
      role: selectedUserDetails?.role || 'user',
      subscriptionTier: selectedUserDetails?.subscriptionTier || 'free',
      isVerified: Boolean(selectedUserDetails?.isVerified),
      premiumInterviewsRemaining: selectedUserDetails?.premiumInterviewsRemaining ?? 0,
    })
  }

  async function handleDelete(userId) {
    const confirmed = window.confirm('Delete this user? This cannot be undone.')
    if (!confirmed) return

    try {
      await deleteUser(userId)
      const remainingUsers = users.filter((user) => user._id !== userId)
      setUsers(remainingUsers)
      setPagination((current) => ({
        ...current,
        total: Math.max((current.total || 1) - 1, 0),
      }))

      if (selectedUserId === userId) {
        setSelectedUserId(remainingUsers[0]?._id || '')
      }

      toast.success('User deleted successfully.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user.')
    }
  }

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Admin Dashboard"
        title="User management panel"
        copy="This page is visible only to you as admin. Search accounts, review user profiles, and update access or subscription details from one place."
        action={
          <div className="flex flex-wrap gap-3">
            <Button to="/admin-dashboard" variant="secondary">
              <Icon name="chart" className="h-4 w-4" />
              Back to dashboard
            </Button>
            <Button to="/admin-questions" variant="secondary">
              <Icon name="doc" className="h-4 w-4" />
              Question bank
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
              User control
            </h2>
            <p className="text-sm leading-6 text-ink-500 dark:text-ink-300">
              A private review area where you can inspect user details and moderate accounts without exposing this page to normal users.
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
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400 dark:text-ink-300">This page</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink-950 dark:text-white">{users.length}</p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">Users on current page</p>
            </div>
            <div className="rounded-2xl bg-ink-50 px-4 py-4 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400 dark:text-ink-300">Verified</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink-950 dark:text-white">{listStats.verifiedCount}</p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">Accounts verified on this page</p>
            </div>
            <div className="rounded-2xl bg-ink-50 px-4 py-4 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400 dark:text-ink-300">Premium</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink-950 dark:text-white">{listStats.premiumCount}</p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">{listStats.adminCount} admins in results</p>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <Panel
              title="Total results"
              copy={
                <>
                  <p className="text-3xl font-bold text-accent-500">{pagination.total || users.length}</p>
                  <p className="mt-2 text-sm text-ink-500">Matching users</p>
                </>
              }
            />
            <Panel
              title="Admins"
              copy={
                <>
                  <p className="text-3xl font-bold text-accent-500">{listStats.adminCount}</p>
                  <p className="mt-2 text-sm text-ink-500">Admins on this page</p>
                </>
              }
            />
            <Panel
              title="Verified"
              copy={
                <>
                  <p className="text-3xl font-bold text-accent-500">{listStats.verifiedCount}</p>
                  <p className="mt-2 text-sm text-ink-500">Verified accounts</p>
                </>
              }
            />
            <Panel
              title="Page status"
              copy={
                <>
                  <p className="text-3xl font-bold text-accent-500">{pagination.page}</p>
                  <p className="mt-2 text-sm text-ink-500">of {pagination.totalPages || 1}</p>
                </>
              }
            />
          </div>

          <Panel title="Search and filter" copy="Look up users by name or email, then narrow the list by role.">
            <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]" onSubmit={handleSearchSubmit}>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400 dark:text-ink-300">Search</span>
                <input
                  className="input-field"
                  name="search"
                  value={filterForm.search}
                  onChange={(event) => setFilterForm((current) => ({ ...current, search: event.target.value }))}
                  placeholder="Name or email"
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400 dark:text-ink-300">Role</span>
                <select
                  className="input-field"
                  name="role"
                  value={filterForm.role}
                  onChange={(event) => setFilterForm((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="">All roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </label>
              <div className="flex items-end gap-3">
                <Button type="submit">
                  <Icon name="search" className="h-4 w-4" />
                  Search
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setFilterForm({ search: '', role: '' })
                    setSearchParams({ page: '1' })
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>
          </Panel>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_380px]">
            <Panel title="User accounts" copy="Select any user to review their account details on the right.">
              {loading ? <div className="loading-shell text-sm text-ink-500">Loading users...</div> : null}
              {!loading && users.length === 0 ? <div className="empty-state">No users found for this filter.</div> : null}

              {!loading && users.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead className="border-b border-ink-200 text-ink-500 dark:border-ink-700 dark:text-ink-400">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold">User</th>
                        <th className="px-3 py-3 text-left font-semibold">Profile</th>
                        <th className="px-3 py-3 text-left font-semibold">Subscription</th>
                        <th className="px-3 py-3 text-left font-semibold">Joined</th>
                        <th className="px-3 py-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => {
                        const isActive = selectedUserId === user._id
                        const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Unnamed user'

                        return (
                          <tr
                            key={user._id}
                            className={`border-b border-ink-100 dark:border-ink-800 ${
                              isActive ? 'bg-coral-50/70 dark:bg-coral-500/10' : ''
                            }`}
                          >
                            <td className="px-3 py-4">
                              <div>
                                <p className="font-semibold text-ink-950 dark:text-white">{displayName}</p>
                                <p className="text-xs text-ink-500 dark:text-ink-300">{user.email}</p>
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex flex-wrap gap-2">
                                <span className="status-chip status-chip-neutral uppercase">{user.role || 'user'}</span>
                                <span className={`status-chip ${user.isVerified ? 'status-chip-success' : 'status-chip-danger'}`}>
                                  {user.isVerified ? 'Verified' : 'Pending'}
                                </span>
                              </div>
                              <p className="mt-2 text-xs text-ink-500 dark:text-ink-300">{user.targetRole || 'Target role not set'}</p>
                            </td>
                            <td className="px-3 py-4">
                              <span className={`status-chip ${user.subscriptionTier === 'premium' ? 'status-chip-danger' : 'status-chip-neutral'}`}>
                                {user.subscriptionTier || 'free'}
                              </span>
                              <p className="mt-2 text-xs text-ink-500 dark:text-ink-300">
                                Credits: {user.premiumInterviewsRemaining ?? 0}
                              </p>
                            </td>
                            <td className="px-3 py-4 text-ink-600 dark:text-ink-300">{formatDate(user.createdAt)}</td>
                            <td className="px-3 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant={isActive ? 'accent' : 'ghost'}
                                  className="px-3 py-2 text-xs"
                                  onClick={() => setSelectedUserId(user._id)}
                                >
                                  <Icon name="eye" className="h-4 w-4" />
                                  View
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="px-3 py-2 text-xs text-rose-600 dark:text-rose-200"
                                  onClick={() => handleDelete(user._id)}
                                >
                                  <Icon name="trash" className="h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {pagination.totalPages > 1 ? (
                <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-6 dark:border-white/10">
                  <Button variant="secondary" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
                    Previous
                  </Button>
                  <p className="text-sm font-medium text-ink-500">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </Panel>

            <Panel title="Selected user" copy="Inspect the account and update admin-level settings from here.">
              {detailsLoading ? (
                <div className="loading-shell text-sm text-ink-500">Loading user details...</div>
              ) : selectedUserDetails ? (
                <div className="space-y-5">
                  <div className="rounded-3xl bg-ink-50 p-5 dark:bg-white/5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-display text-2xl font-semibold text-ink-950 dark:text-white">
                          {[selectedUserDetails.firstName, selectedUserDetails.lastName].filter(Boolean).join(' ') || 'Unnamed user'}
                        </p>
                        <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">{selectedUserDetails.email}</p>
                        {selectedUserDetails.headline ? (
                          <p className="mt-3 text-sm leading-6 text-ink-600 dark:text-ink-300">{selectedUserDetails.headline}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap justify-end gap-2">
                        <span className="status-chip status-chip-neutral uppercase">{selectedUserDetails.role || 'user'}</span>
                        <span className={`status-chip ${selectedUserDetails.isVerified ? 'status-chip-success' : 'status-chip-danger'}`}>
                          {selectedUserDetails.isVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
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
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400 dark:text-ink-300">Latest interview activity</p>
                    {selectedUserStats?.latestInterview ? (
                      <div className="mt-3 space-y-2">
                        <p className="font-semibold text-ink-950 dark:text-white">{selectedUserStats.latestInterview.title}</p>
                        <p className="text-sm text-ink-500 dark:text-ink-300">
                          Status: {selectedUserStats.latestInterview.status} | Difficulty: {selectedUserStats.latestInterview.difficulty}
                        </p>
                        <p className="text-sm text-ink-500 dark:text-ink-300">
                          Score: {selectedUserStats.latestInterview.results?.score ?? 'Pending'} | Updated:{' '}
                          {formatDateTime(selectedUserStats.latestInterview.updatedAt)}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-ink-500 dark:text-ink-300">This user has not started any interviews yet.</p>
                    )}
                  </div>

                  <Panel title="Admin edit controls" copy="Update role, verification, subscription tier, or available premium interviews.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400 dark:text-ink-300">Role</span>
                        <select
                          className="input-field"
                          value={editForm.role}
                          onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400 dark:text-ink-300">Subscription</span>
                        <select
                          className="input-field"
                          value={editForm.subscriptionTier}
                          onChange={(event) => setEditForm((current) => ({ ...current, subscriptionTier: event.target.value }))}
                        >
                          <option value="free">Free</option>
                          <option value="premium">Premium</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400 dark:text-ink-300">Premium credits</span>
                        <input
                          className="input-field"
                          type="number"
                          min="0"
                          value={editForm.premiumInterviewsRemaining}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              premiumInterviewsRemaining: event.target.value,
                            }))
                          }
                        />
                      </label>

                      <label className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white/70 px-4 py-4 text-sm font-medium text-ink-950 dark:border-white/10 dark:bg-white/5 dark:text-white">
                        <input
                          type="checkbox"
                          checked={editForm.isVerified}
                          onChange={(event) => setEditForm((current) => ({ ...current, isVerified: event.target.checked }))}
                          className="h-4 w-4 rounded border-ink-300 text-indigo-600 focus:ring-indigo-600"
                        />
                        Mark this account as verified
                      </label>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button type="button" variant="accent" onClick={handleSaveUser} disabled={saving}>
                        <Icon name="save" className="h-4 w-4" />
                        {saving ? 'Saving...' : 'Save changes'}
                      </Button>
                      <Button type="button" variant="ghost" onClick={handleResetEdit} disabled={saving}>
                        Reset form
                      </Button>
                    </div>
                  </Panel>

                  <div className="rounded-2xl border border-ink-100 bg-white/90 px-4 py-4 dark:border-white/10 dark:bg-white/5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400 dark:text-ink-300">Profile notes</p>
                    <p className="mt-3 text-sm leading-6 text-ink-600 dark:text-ink-300">
                      {selectedUserDetails.bio || 'This user has not added a bio yet.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="empty-state">Select a user to view and edit their details.</div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminUsersPage
