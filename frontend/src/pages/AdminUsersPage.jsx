import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useSearchParams } from 'react-router-dom'
import { Button, Panel, SectionIntro } from '../components/UI'
import { Icon } from '../components/Icons'
import { getUsers, updateUser, deleteUser } from '../services/userService'

function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState('')
  const [editForm, setEditForm] = useState({ role: '', subscriptionTier: '', isVerified: false })

  const search = searchParams.get('search') || ''
  const role = searchParams.get('role') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  useEffect(() => {
    async function loadUsers() {
      setLoading(true)
      try {
        const data = await getUsers({ page, limit: 10, search: search || undefined, role: role || undefined })
        setUsers(data.users || [])
        if (data.pagination) setPagination(data.pagination)
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load users.')
      } finally {
        setLoading(false)
      }
    }
    loadUsers()
  }, [search, role, page])

  function handleSearchSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextSearch = String(formData.get('search') || '').trim()
    const nextRole = String(formData.get('role') || '')

    const nextParams = {}
    if (nextSearch) nextParams.search = nextSearch
    if (nextRole) nextParams.role = nextRole
    nextParams.page = '1'
    setSearchParams(nextParams)
  }

  function handlePageChange(newPage) {
    const nextParams = Object.fromEntries(searchParams.entries())
    nextParams.page = newPage.toString()
    setSearchParams(nextParams)
  }

  function beginEdit(usr) {
    setEditingId(usr._id)
    setEditForm({
      role: usr.role || 'user',
      subscriptionTier: usr.subscriptionTier || 'free',
      isVerified: usr.isVerified || false,
    })
  }

  async function handleSaveEdit(userId) {
    try {
      const { user: updatedUser } = await updateUser(userId, editForm)
      setUsers((current) => current.map((u) => (u._id === userId ? updatedUser : u)))
      setEditingId('')
      toast.success('User updated successfully.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update user.')
    }
  }

  async function handleDelete(userId) {
    const confirmed = window.confirm('Delete this user? This cannot be undone.')
    if (!confirmed) return
    try {
      await deleteUser(userId)
      setUsers((current) => current.filter((u) => u._id !== userId))
      toast.success('User deleted successfully.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user.')
    }
  }

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Admin Dashboard"
        title="Manage Users"
        copy="Search, filter, edit, and moderate user accounts across the platform."
      />

      <Panel title="Search & Filter" copy="Find users by name, email, or role.">
        <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]" onSubmit={handleSearchSubmit}>
          <input className="input-field" name="search" defaultValue={search} placeholder="Name or email..." />
          <select className="input-field" name="role" defaultValue={role}>
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <Button type="submit">Search</Button>
        </form>
      </Panel>

      <Panel title="User Accounts" copy="Click edit to modify user roles and subscriptions.">
        {loading ? <div className="loading-shell text-sm text-ink-500">Loading users...</div> : null}
        {!loading && users.length === 0 ? <div className="empty-state">No users found.</div> : null}

        <div className="space-y-4">
          {users.map((usr) => (
            <div key={usr._id} className="surface-tile p-5">
              {editingId === usr._id ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <select
                      className="input-field"
                      value={editForm.role}
                      onChange={(e) => setEditForm((curr) => ({ ...curr, role: e.target.value }))}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    <select
                      className="input-field"
                      value={editForm.subscriptionTier}
                      onChange={(e) => setEditForm((curr) => ({ ...curr, subscriptionTier: e.target.value }))}
                    >
                      <option value="free">Free</option>
                      <option value="premium">Premium</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-ink-950 dark:text-white">
                      <input
                        type="checkbox"
                        checked={editForm.isVerified}
                        onChange={(e) => setEditForm((curr) => ({ ...curr, isVerified: e.target.checked }))}
                        className="h-4 w-4 rounded border-ink-300 text-indigo-600 focus:ring-indigo-600"
                      />
                      Is Verified
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="accent" onClick={() => handleSaveEdit(usr._id)}>
                      <Icon name="save" className="h-4 w-4" /> Save
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingId('')}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold text-ink-950 dark:text-white">
                      {usr.firstName} {usr.lastName}
                    </p>
                    <p className="text-sm text-ink-500 dark:text-ink-300">{usr.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <span className="status-chip status-chip-neutral uppercase">
                      {usr.role || 'user'}
                    </span>
                    <span className={`status-chip ${usr.subscriptionTier === 'premium' ? 'status-chip-danger' : 'status-chip-neutral'}`}>
                      {usr.subscriptionTier || 'free'}
                    </span>
                    <span className={`status-chip ${usr.isVerified ? 'status-chip-success' : 'status-chip-danger'}`}>
                      {usr.isVerified ? 'Verified' : 'Unverified'}
                    </span>
                    <div className="ml-4 flex gap-2">
                      <Button type="button" variant="ghost" onClick={() => beginEdit(usr)}>Edit</Button>
                      <Button type="button" variant="ghost" onClick={() => handleDelete(usr._id)}>
                        <Icon name="trash" className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-6 dark:border-white/10">
            <Button variant="secondary" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1}>
              Previous
            </Button>
            <p className="text-sm font-medium text-ink-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <Button variant="secondary" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages}>
              Next
            </Button>
          </div>
        )}
      </Panel>
    </div>
  )
}

export default AdminUsersPage
