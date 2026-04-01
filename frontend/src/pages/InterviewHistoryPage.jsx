import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Button, Panel, SectionIntro } from '../components/UI'
import { deleteInterview, fetchInterviewHistory, updateInterview } from '../services/interviewService'
import { Icon } from '../components/Icons'

function InterviewHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [interviews, setInterviews] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState('')
  const [editForm, setEditForm] = useState({ title: '', status: '', difficulty: '' })
  
  const query = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  const difficulty = searchParams.get('difficulty') || ''
  const category = searchParams.get('category') || ''
  const scoreRange = searchParams.get('scoreRange') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)

  useEffect(() => {
    async function loadInterviews() {
      setLoading(true)

      let minScore, maxScore
      if (scoreRange === '0-50') { minScore = 0; maxScore = 50 }
      else if (scoreRange === '50-80') { minScore = 50; maxScore = 80 }
      else if (scoreRange === '80-100') { minScore = 80; maxScore = 100 }

      try {
        const data = await fetchInterviewHistory({
          page,
          limit: 10,
          q: query || undefined,
          status: status || undefined,
          difficulty: difficulty || undefined,
          category: category || undefined,
          minScore,
          maxScore,
        })
        setInterviews(data.interviews || [])
        if (data.pagination) setPagination(data.pagination)
      } catch (error) {
        toast.error(error.response?.data?.message || 'Unable to load interview history.')
      } finally {
        setLoading(false)
      }
    }

    loadInterviews()
  }, [query, status, difficulty, category, scoreRange, page])

  function handleSearchSubmit(event) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const nextQuery = String(formData.get('q') || '').trim()
    const nextStatus = String(formData.get('status') || '')
    const nextDifficulty = String(formData.get('difficulty') || '')
    const nextCategory = String(formData.get('category') || '').trim()
    const nextScoreRange = String(formData.get('scoreRange') || '')

    const nextParams = {}
    if (nextQuery) nextParams.q = nextQuery
    if (nextStatus) nextParams.status = nextStatus
    if (nextDifficulty) nextParams.difficulty = nextDifficulty
    if (nextCategory) nextParams.category = nextCategory
    if (nextScoreRange) nextParams.scoreRange = nextScoreRange
    nextParams.page = "1"
    
    setSearchParams(nextParams)
  }

  function handlePageChange(newPage) {
    const nextParams = Object.fromEntries(searchParams.entries())
    nextParams.page = newPage.toString()
    setSearchParams(nextParams)
  }

  function beginEdit(interview) {
    setEditingId(interview._id)
    setEditForm({
      title: interview.title,
      status: interview.status,
      difficulty: interview.difficulty,
    })
  }

  async function handleSaveEdit(interviewId) {
    try {
      const { interview } = await updateInterview(interviewId, editForm)
      setInterviews((current) => current.map((item) => (item._id === interviewId ? interview : item)))
      setEditingId('')
      toast.success('Interview updated.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update this interview.')
    }
  }

  async function handleDelete(interviewId) {
    try {
      await deleteInterview(interviewId)
      setInterviews((current) => current.filter((item) => item._id !== interviewId))
      toast.success('Interview deleted.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete this interview.')
    }
  }

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Interview history"
        title="Review, edit, and manage every interview you have created."
        copy="Search past interviews, continue unfinished sessions, edit interview details, and delete rounds you no longer need."
        action={<Button to="/start-interview">New interview</Button>}
      />

      <Panel title="Search interviews" copy="Search by title, role, or status.">
        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-6" onSubmit={handleSearchSubmit}>
          <input className="input-field lg:col-span-2" name="q" defaultValue={query} placeholder="Search by title or role" />
          <input className="input-field" name="category" defaultValue={category} placeholder="Skill category" />
          <select className="input-field" name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select className="input-field" name="difficulty" defaultValue={difficulty}>
            <option value="">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
          <select className="input-field" name="scoreRange" defaultValue={scoreRange}>
            <option value="">All scores</option>
            <option value="0-50">0 - 50</option>
            <option value="50-80">50 - 80</option>
            <option value="80-100">80 - 100</option>
          </select>
          <div className="lg:col-span-6 flex justify-end">
            <Button type="submit">Search & Filter</Button>
          </div>
        </form>
      </Panel>

      <Panel title="Saved interviews" copy="Your interview performance is here .">
        {loading ? <div className="loading-shell text-sm text-ink-500">Loading interviews...</div> : null}
        {!loading && interviews.length === 0 ? (
          <div className="empty-state">No interviews found yet.</div>
        ) : null}

        <div className="space-y-4">
          {interviews.map((interview) => (
            <div key={interview._id} className="surface-tile p-5">
              {editingId === interview._id ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <input
                      className="input-field md:col-span-2"
                      value={editForm.title}
                      onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))}
                    />
                    <select
                      className="input-field"
                      value={editForm.status}
                      onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}
                    >
                      <option value="draft">Draft</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="accent" onClick={() => handleSaveEdit(interview._id)}>
                      <Icon name="save" className="h-4 w-4" />
                      Save
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setEditingId('')}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-display text-2xl font-semibold text-ink-950 dark:text-white">{interview.title}</p>
                      <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">{interview.description || 'Interview practice session'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="status-chip status-chip-neutral">{interview.status}</span>
                      <span className="status-chip status-chip-danger">{interview.difficulty}</span>
                      <span className="status-chip status-chip-success">
                        Score: {interview.results?.score ?? 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(interview.skills || []).map((skill) => (
                      <span key={skill} className="status-chip status-chip-info">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button to={`/interview-session?interviewId=${interview._id}`} variant="secondary">
                      Continue
                    </Button>
                    <Button to={`/results?interviewId=${interview._id}`} variant="ghost">
                      View results
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => beginEdit(interview)}>
                      Edit
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => handleDelete(interview._id)}>
                      <Icon name="trash" className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-6 dark:border-white/10">
            <Button 
              variant="secondary" 
              onClick={() => handlePageChange(pagination.page - 1)} 
              disabled={pagination.page <= 1}
            >
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
        )}
      </Panel>
    </div>
  )
}

export default InterviewHistoryPage
