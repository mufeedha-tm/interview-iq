import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import api from '../lib/api'
import { Panel, SectionIntro } from '../components/UI'

function AdminReportsPage() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReports() {
      try {
        const { data } = await api.get('/analytics/joined-report')
        setReports(data.report || [])
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load joined reports.')
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [])

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Admin Reports"
        title="Joined Data: Users + Interviews + Feedback"
        copy="This view uses a MongoDB aggregation pipeline to $lookup users and join them with interview and feedback datasets."
      />

      <Panel title="Global Interview Feedback" copy="Comprehensive view of all candidate sessions with their AI feedback.">
        {loading ? <div className="loading-shell text-sm text-ink-500">Loading joined data...</div> : null}
        {!loading && reports.length === 0 ? (
          <div className="empty-state">No interview reports available.</div>
        ) : null}

        <div className="space-y-6">
          {reports.map((report) => (
            <div key={report._id} className="surface-tile p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-ink-100 pb-4 dark:border-white/10">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-display text-xl font-semibold text-ink-950 dark:text-white">{report.title}</p>
                    <span className="status-chip status-chip-neutral uppercase">
                      Score: {report.results?.score || 'N/A'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
                    Candidate: <span className="font-medium text-ink-800 dark:text-ink-200">{report.user?.firstName} {report.user?.lastName} ({report.user?.email})</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm text-ink-500">
                  <span className="status-chip status-chip-danger">
                    {report.difficulty}
                  </span>
                  {new Date(report.createdAt).toLocaleDateString()}
                </div>
              </div>

              {((report.results?.feedback) || (report.results?.strengths?.length > 0)) && (
                <div className="mt-4 space-y-4">
                  {report.results?.feedback && (
                    <div className="feature-tile text-sm leading-6 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                      <strong>AI Summary Feedback:</strong> {report.results.feedback}
                    </div>
                  )}
                  {report.results?.strengths?.length > 0 && (
                    <div className="status-banner status-banner-success">
                      <strong>Strengths:</strong>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        {report.results.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {report.results?.improvements?.length > 0 && (
                    <div className="status-banner status-banner-warning">
                      <strong>Areas for Improvement:</strong>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        {report.results.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                      </ul>
                    </div>
                  )}
                  {report.results?.coachingTips?.length > 0 && (
                    <div className="status-banner border-sky-200 bg-sky-50/90 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                      <strong>Coaching Tips:</strong>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        {report.results.coachingTips.map((tip, i) => <li key={i}>{tip}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

export default AdminReportsPage
