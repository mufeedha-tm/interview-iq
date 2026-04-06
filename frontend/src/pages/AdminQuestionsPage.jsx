import { useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import { Button, Panel, SectionIntro } from '../components/UI'
import { Icon } from '../components/Icons'
import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  getQuestions,
  updateQuestion,
} from '../services/questionService'

const emptyForm = {
  roleLabel: '',
  roleKey: '',
  interviewType: 'technical',
  defaultSkills: '',
  question: '',
  order: '',
  isActive: true,
}

function parseSkills(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function AdminQuestionsPage() {
  const [questions, setQuestions] = useState([])
  const [roleOptions, setRoleOptions] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 12, totalPages: 1, total: 0 })
  const [filters, setFilters] = useState({
    search: '',
    roleKey: '',
    interviewType: '',
    isActive: 'true',
  })
  const [loading, setLoading] = useState(true)
  const [selectedQuestionId, setSelectedQuestionId] = useState('')
  const [selectedQuestion, setSelectedQuestion] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    let active = true

    async function loadQuestions() {
      setLoading(true)
      try {
        const data = await getQuestions({
          page: pagination.page,
          limit: pagination.limit,
          search: filters.search || undefined,
          roleKey: filters.roleKey || undefined,
          interviewType: filters.interviewType || undefined,
          isActive: filters.isActive || undefined,
        })

        if (!active) return

        const nextQuestions = data.questions || []
        setQuestions(nextQuestions)
        setRoleOptions(data.filters?.roles || [])
        setPagination((current) => ({
          ...current,
          ...(data.pagination || {}),
        }))
        setSelectedQuestionId((current) => {
          if (isCreating) return current
          if (nextQuestions.some((item) => item._id === current)) return current
          return nextQuestions[0]?._id || ''
        })
      } catch (error) {
        if (!active) return
        toast.error(error.response?.data?.message || 'Failed to load question bank.')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadQuestions()

    return () => {
      active = false
    }
  }, [filters.interviewType, filters.isActive, filters.roleKey, filters.search, isCreating, pagination.limit, pagination.page])

  useEffect(() => {
    if (isCreating) {
      setSelectedQuestion(null)
      setForm(emptyForm)
      return
    }

    if (!selectedQuestionId) {
      setSelectedQuestion(null)
      setForm(emptyForm)
      return
    }

    let active = true

    async function loadSelectedQuestion() {
      setDetailsLoading(true)
      try {
        const data = await getQuestionById(selectedQuestionId)
        if (!active) return

        const question = data.question || null
        setSelectedQuestion(question)
        setForm({
          roleLabel: question?.roleLabel || '',
          roleKey: question?.roleKey || '',
          interviewType: question?.interviewType || 'technical',
          defaultSkills: (question?.defaultSkills || []).join(', '),
          question: question?.question || '',
          order: question?.order ?? '',
          isActive: Boolean(question?.isActive),
        })
      } catch (error) {
        if (!active) return
        setSelectedQuestion(null)
        toast.error(error.response?.data?.message || 'Failed to load question details.')
      } finally {
        if (active) {
          setDetailsLoading(false)
        }
      }
    }

    loadSelectedQuestion()

    return () => {
      active = false
    }
  }, [isCreating, selectedQuestionId])

  const questionStats = useMemo(() => {
    const activeCount = questions.filter((item) => item.isActive).length
    const customCount = questions.filter((item) => item.source === 'custom').length
    const technicalCount = questions.filter((item) => item.interviewType === 'technical').length

    return {
      activeCount,
      customCount,
      technicalCount,
    }
  }, [questions])

  function handleFilterChange(event) {
    const { name, value } = event.target
    setPagination((current) => ({ ...current, page: 1 }))
    setFilters((current) => ({ ...current, [name]: value }))
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function resetFormToCurrent() {
    if (isCreating) {
      setForm(emptyForm)
      return
    }

    setForm({
      roleLabel: selectedQuestion?.roleLabel || '',
      roleKey: selectedQuestion?.roleKey || '',
      interviewType: selectedQuestion?.interviewType || 'technical',
      defaultSkills: (selectedQuestion?.defaultSkills || []).join(', '),
      question: selectedQuestion?.question || '',
      order: selectedQuestion?.order ?? '',
      isActive: Boolean(selectedQuestion?.isActive),
    })
  }

  async function handleSaveQuestion() {
    if (!form.roleLabel.trim()) {
      toast.error('Role label is required.')
      return
    }

    if (!form.question.trim()) {
      toast.error('Question text is required.')
      return
    }

    const payload = {
      roleLabel: form.roleLabel.trim(),
      roleKey: form.roleKey.trim(),
      interviewType: form.interviewType,
      defaultSkills: parseSkills(form.defaultSkills),
      question: form.question.trim(),
      order: form.order === '' ? undefined : Number(form.order),
      isActive: form.isActive,
    }

    setSaving(true)
    try {
      if (isCreating) {
        const { question } = await createQuestion(payload)
        toast.success('Question created successfully.')
        setIsCreating(false)
        setSelectedQuestionId(question._id)
        setPagination((current) => ({ ...current, page: 1 }))
      } else if (selectedQuestionId) {
        const { question } = await updateQuestion(selectedQuestionId, payload)
        setSelectedQuestion(question)
        setQuestions((current) => current.map((item) => (item._id === question._id ? question : item)))
        toast.success('Question updated successfully.')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save question.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteQuestion() {
    const targetId = isCreating ? '' : selectedQuestionId
    if (!targetId) return

    const confirmed = window.confirm('Delete this question? This cannot be undone.')
    if (!confirmed) return

    try {
      await deleteQuestion(targetId)
      const remainingQuestions = questions.filter((item) => item._id !== targetId)
      setQuestions(remainingQuestions)
      setSelectedQuestionId(remainingQuestions[0]?._id || '')
      setSelectedQuestion(null)
      toast.success('Question deleted successfully.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete question.')
    }
  }

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Admin Questions"
        title="Question bank CRUD"
        copy="Manage the interview question bank from the admin area instead of editing JSON by hand. Create, update, disable, and delete questions role by role."
        action={
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="accent"
              onClick={() => {
                setIsCreating(true)
                setSelectedQuestionId('')
                setForm(emptyForm)
              }}
            >
              <Icon name="save" className="h-4 w-4" />
              New question
            </Button>
            <Button to="/admin-dashboard" variant="secondary">
              <Icon name="chart" className="h-4 w-4" />
              Admin dashboard
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="soft-panel p-5 md:p-6">
          <div className="space-y-2 border-b border-ink-100 pb-5 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-400 dark:text-ink-300">
              Question bank
            </p>
            <h2 className="font-display text-2xl font-semibold text-ink-950 dark:text-white">
              CRUD console
            </h2>
            <p className="text-sm leading-6 text-ink-500 dark:text-ink-300">
              Questions are now stored in MongoDB and seeded from the original bank automatically when the collection is empty.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <Button to="/admin-dashboard" variant="ghost" className="w-full justify-start rounded-2xl px-4 py-4">
              <Icon name="chart" className="h-4 w-4" />
              Dashboard overview
            </Button>
            <Button to="/admin-users" variant="ghost" className="w-full justify-start rounded-2xl px-4 py-4">
              <Icon name="user" className="h-4 w-4" />
              Manage users
            </Button>
            <Button to="/admin-reports" variant="ghost" className="w-full justify-start rounded-2xl px-4 py-4">
              <Icon name="doc" className="h-4 w-4" />
              Joined reports
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-2xl bg-ink-50 px-4 py-4 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400 dark:text-ink-300">Results</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink-950 dark:text-white">{pagination.total || questions.length}</p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">Questions in current filter</p>
            </div>
            <div className="rounded-2xl bg-ink-50 px-4 py-4 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400 dark:text-ink-300">Active</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink-950 dark:text-white">{questionStats.activeCount}</p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">Active questions on this page</p>
            </div>
            <div className="rounded-2xl bg-ink-50 px-4 py-4 dark:bg-white/5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400 dark:text-ink-300">Custom</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink-950 dark:text-white">{questionStats.customCount}</p>
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">{questionStats.technicalCount} technical questions</p>
            </div>
          </div>
        </aside>

        <div className="space-y-6">
          <Panel title="Search and filter" copy="Filter by keyword, role, interview type, or active state.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input
                className="input-field"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Search role, skill, or question text"
              />
              <select className="input-field" name="roleKey" value={filters.roleKey} onChange={handleFilterChange}>
                <option value="">All roles</option>
                {roleOptions.map((role) => (
                  <option key={role.key} value={role.key}>
                    {role.label}
                  </option>
                ))}
              </select>
              <select className="input-field" name="interviewType" value={filters.interviewType} onChange={handleFilterChange}>
                <option value="">All interview types</option>
                <option value="behavioral">Behavioral</option>
                <option value="technical">Technical</option>
                <option value="system-design">System design</option>
              </select>
              <select className="input-field" name="isActive" value={filters.isActive} onChange={handleFilterChange}>
                <option value="">All states</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </Panel>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_420px]">
            <Panel title="Question records" copy="Select a question to edit it, or create a new one from the right panel.">
              {loading ? <div className="loading-shell text-sm text-ink-500">Loading questions...</div> : null}
              {!loading && questions.length === 0 ? <div className="empty-state">No questions found for this filter.</div> : null}

              {!loading && questions.length > 0 ? (
                <div className="space-y-4">
                  {questions.map((item) => {
                    const isSelected = !isCreating && selectedQuestionId === item._id
                    return (
                      <div
                        key={item._id}
                        className={`surface-tile p-5 transition ${
                          isSelected ? 'ring-2 ring-coral-300 dark:ring-coral-400/40' : ''
                        }`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <span className="status-chip status-chip-neutral uppercase">{item.roleLabel}</span>
                              <span className="status-chip status-chip-neutral">{item.interviewType}</span>
                              <span className={`status-chip ${item.isActive ? 'status-chip-success' : 'status-chip-danger'}`}>
                                {item.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm leading-6 text-ink-900 dark:text-white">{item.question}</p>
                            <p className="text-xs text-ink-500 dark:text-ink-300">
                              Skills: {(item.defaultSkills || []).join(', ') || 'None set'} | Order: {item.order}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={isSelected ? 'accent' : 'ghost'}
                              className="px-3 py-2 text-xs"
                              onClick={() => {
                                setIsCreating(false)
                                setSelectedQuestionId(item._id)
                              }}
                            >
                              <Icon name="eye" className="h-4 w-4" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {pagination.totalPages > 1 ? (
                <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-6 dark:border-white/10">
                  <Button
                    variant="secondary"
                    onClick={() => setPagination((current) => ({ ...current, page: Math.max(current.page - 1, 1) }))}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <p className="text-sm font-medium text-ink-500">
                    Page {pagination.page} of {pagination.totalPages}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setPagination((current) => ({
                        ...current,
                        page: Math.min(current.page + 1, current.totalPages || 1),
                      }))
                    }
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </Panel>

            <Panel
              title={isCreating ? 'Create question' : 'Edit question'}
              copy="Role label is required. Role key is optional and can be used for custom role grouping."
            >
              {detailsLoading ? <div className="loading-shell text-sm text-ink-500">Loading question details...</div> : null}

              {!detailsLoading ? (
                <div className="space-y-4">
                  <input
                    className="input-field"
                    name="roleLabel"
                    value={form.roleLabel}
                    onChange={handleFormChange}
                    placeholder="Role label, for example Frontend Engineer"
                  />
                  <input
                    className="input-field"
                    name="roleKey"
                    value={form.roleKey}
                    onChange={handleFormChange}
                    placeholder="Optional role key, for example frontend"
                  />
                  <select className="input-field" name="interviewType" value={form.interviewType} onChange={handleFormChange}>
                    <option value="behavioral">Behavioral</option>
                    <option value="technical">Technical</option>
                    <option value="system-design">System design</option>
                  </select>
                  <input
                    className="input-field"
                    name="defaultSkills"
                    value={form.defaultSkills}
                    onChange={handleFormChange}
                    placeholder="Comma separated default skills"
                  />
                  <input
                    className="input-field"
                    name="order"
                    type="number"
                    min="0"
                    value={form.order}
                    onChange={handleFormChange}
                    placeholder="Display order"
                  />
                  <textarea
                    className="input-field min-h-40 resize-none"
                    name="question"
                    value={form.question}
                    onChange={handleFormChange}
                    placeholder="Write the interview question here..."
                  />
                  <label className="flex items-center gap-3 rounded-2xl border border-ink-100 bg-white/70 px-4 py-4 text-sm font-medium text-ink-950 dark:border-white/10 dark:bg-white/5 dark:text-white">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={form.isActive}
                      onChange={handleFormChange}
                      className="h-4 w-4 rounded border-ink-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    Keep this question active in interview generation
                  </label>

                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="accent" onClick={handleSaveQuestion} disabled={saving}>
                      <Icon name="save" className="h-4 w-4" />
                      {saving ? 'Saving...' : isCreating ? 'Create question' : 'Save changes'}
                    </Button>
                    <Button type="button" variant="ghost" onClick={resetFormToCurrent} disabled={saving}>
                      Reset form
                    </Button>
                    {!isCreating ? (
                      <Button type="button" variant="ghost" onClick={handleDeleteQuestion} disabled={saving} className="text-rose-600 dark:text-rose-200">
                        <Icon name="trash" className="h-4 w-4" />
                        Delete
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setIsCreating(false)
                          setForm(emptyForm)
                          setSelectedQuestionId(questions[0]?._id || '')
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminQuestionsPage
