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
        {loading ? <p className="text-sm text-ink-500">Loading joined data...</p> : null}
        {!loading && reports.length === 0 ? (
          <p className="text-sm text-ink-500">No interview reports available.</p>
        ) : null}

        <div className="space-y-6">
          {reports.map((report) => (
            <div key={report._id} className="rounded-[28px] border border-ink-100 bg-white p-6 shadow-sm dark:border-white/8 dark:bg-white/4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between border-b border-ink-100 pb-4 dark:border-white/10">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-display text-xl font-semibold text-ink-950 dark:text-white">{report.title}</p>
                    <span className="rounded-full bg-ink-100 px-3 py-0.5 text-xs font-semibold text-ink-700 uppercase">
                      Score: {report.results?.score || 'N/A'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-300">
                    Candidate: <span className="font-medium text-ink-800 dark:text-ink-200">{report.user?.firstName} {report.user?.lastName} ({report.user?.email})</span>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm text-ink-500">
                  <span className="rounded-full bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-600">
                    {report.difficulty}
                  </span>
                  {new Date(report.createdAt).toLocaleDateString()}
                </div>
              </div>

              {((report.results?.feedback) || (report.results?.strengths?.length > 0)) && (
                <div className="mt-4 space-y-4">
                  {report.results?.feedback && (
                    <div className="rounded-2xl bg-ink-50 p-4 text-sm leading-6 text-ink-700 dark:bg-ink-800 dark:text-ink-200">
                      <strong>AI Summary Feedback:</strong> {report.results.feedback}
                    </div>
                  )}
                  {report.results?.strengths?.length > 0 && (
                    <div className="rounded-2xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                      <strong>Strengths:</strong>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        {report.results.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  {report.results?.improvements?.length > 0 && (
                    <div className="rounded-2xl bg-coral-50 p-4 text-sm leading-6 text-coral-800 dark:bg-coral-900/20 dark:text-coral-300">
                      <strong>Areas for Improvement:</strong>
                      <ul className="list-disc pl-5 mt-1 space-y-1">
                        {report.results.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                      </ul>
                    </div>
                  )}
                  {report.results?.coachingTips?.length > 0 && (
                    <div className="rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
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
