import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import { fetchInterview } from '../services/interviewService'
import { Button, Panel, SectionIntro } from '../components/UI'
import { Icon } from '../components/Icons'
import { Reveal, TiltCard } from '../components/PremiumEffects'
import { exportInterviewReportExcel, exportInterviewReportJson, exportInterviewReportPdf } from '../utils/reportExport'

function ResultsPage() {
  const [searchParams] = useSearchParams()
  const interviewId = searchParams.get('interviewId')
  const navigate = useNavigate()
  const [interview, setInterview] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadResults() {
      if (!interviewId) {
        navigate('/history')
        return
      }
      try {
        const { interview: data } = await fetchInterview(interviewId)
        setInterview(data)
      } catch {
        toast.error('Unable to load interview results.')
        navigate('/history')
      } finally {
        setLoading(false)
      }
    }
    loadResults()
  }, [interviewId, navigate])

  if (loading) {
    return <div className="loading-shell text-sm text-ink-500">Loading your comprehensive report...</div>
  }

  if (!interview || !interview.results) {
    return (
      <div className="empty-state flex flex-col items-center justify-center p-10 text-center">
        <Icon name="waves" className="h-12 w-12 text-ink-400 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Results Available</h2>
        <p className="text-ink-500 max-w-sm mb-6">This interview appears to be incomplete or missing an evaluation score.</p>
        <Link to="/history">
          <Button variant="secondary">Back to History</Button>
        </Link>
      </div>
    )
  }

  const { results, answers } = interview

  return (
    <div className="space-y-12">
      <SectionIntro
        eyebrow="Evaluation Report"
        title="Performance Breakdown"
        copy="Review your scores, detailed rubric analysis, and replay your live media recordings."
        action={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button variant="secondary" onClick={exportInterviewReportPdf}>
              <Icon name="spark" className="h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="secondary" onClick={() => exportInterviewReportExcel(interview)}>
              <Icon name="download" className="h-4 w-4" />
              Export Excel
            </Button>
            <Button variant="secondary" onClick={() => exportInterviewReportJson(interview)}>
              <Icon name="download" className="h-4 w-4" />
              Export JSON
            </Button>
            <div className="score-badge">
              {results.score ?? 0} / 100
            </div>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <TiltCard className="surface-tile h-full p-8">
            <h3 className="font-display text-2xl font-semibold mb-6">Strengths</h3>
            {results.strengths?.length > 0 ? (
              <ul className="space-y-4">
                {results.strengths.map((str, i) => (
                  <li key={i} className="flex gap-4">
                    <Icon name="check" className="mt-1 flex-shrink-0 h-5 w-5 text-emerald-500" />
                    <span className="text-ink-700 dark:text-ink-300 leading-relaxed">{str}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">No specific strengths highlighted.</p>
            )}
          </TiltCard>
        </Reveal>

        <Reveal delay={100}>
          <TiltCard className="surface-tile h-full p-8">
            <h3 className="font-display text-2xl font-semibold mb-6">Actionable Improvements</h3>
            {results.improvements?.length > 0 || results.coachingTips?.length > 0 ? (
              <ul className="space-y-4">
                {(results.improvements || []).concat(results.coachingTips || []).map((tip, i) => (
                  <li key={i} className="flex gap-4">
                    <Icon name="arrowRight" className="mt-1 flex-shrink-0 h-5 w-5 text-coral-500" />
                    <span className="text-ink-700 dark:text-ink-300 leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">No specific improvements highlighted.</p>
            )}
          </TiltCard>
        </Reveal>
      </div>

      <Reveal delay={200}>
        <Panel title="Detailed Competency Rubric" copy="AI evaluation markers strictly grading your methodology.">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(results.rubric || []).map((rb, idx) => (
              <div key={idx} className="feature-tile">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-ink-900 dark:text-white uppercase tracking-wider text-xs">{rb.name}</p>
                  <p className="font-display text-lg font-semibold text-coral-500">{rb.score}/100</p>
                </div>
                <p className="text-sm text-ink-600 dark:text-ink-300 leading-6">{rb.summary}</p>
              </div>
            ))}
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={300}>
        <Panel title="Transcripts & Playback" copy="Review your given responses. If you recorded media, you can play it back below.">
          <div className="space-y-8">
            {answers && answers.map((ans, idx) => (
              <TiltCard key={idx} className="surface-tile p-6 dark:bg-[#111]">
                <div className="mb-4">
                  <span className="status-chip status-chip-neutral mb-3 inline-flex">
                    Question {idx + 1}
                  </span>
                  <p className="font-display text-xl font-semibold text-ink-950 dark:text-white leading-relaxed">
                    {ans.question}
                  </p>
                </div>
                <div className="rounded-2xl bg-ink-50 p-5 dark:bg-white/5 mb-5">
                  <p className="text-sm leading-7 text-ink-700 dark:text-ink-300 whitespace-pre-wrap">
                    {ans.answer}
                  </p>
                </div>

                {ans.evaluation && (
                  <div className="mt-4 mb-5 rounded-2xl bg-ink-50/50 p-5 dark:bg-white/5 border border-ink-100 dark:border-white/10">
                    <div className="flex items-center justify-between mb-3 border-b border-ink-200/50 dark:border-white/10 pb-3">
                      <p className="font-semibold text-ink-900 dark:text-white">AI Analysis</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider text-ink-500">Score</span>
                        <span className="status-chip status-chip-success text-sm">
                          {ans.evaluation.score}/100
                        </span>
                      </div>
                    </div>
                    {ans.evaluation.feedback && (
                      <p className="text-sm text-ink-700 dark:text-ink-300 mb-4">{ans.evaluation.feedback}</p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {ans.evaluation.strengths?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                            <Icon name="check" className="h-3 w-3" /> Strengths
                          </p>
                          <ul className="space-y-1">
                            {ans.evaluation.strengths.map((str, i) => (
                              <li key={i} className="text-xs text-ink-600 dark:text-ink-300">• {str}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {ans.evaluation.improvements?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-coral-600 dark:text-coral-400 mb-2 flex items-center gap-1">
                            <Icon name="arrowRight" className="h-3 w-3" /> Improvements
                          </p>
                          <ul className="space-y-1">
                            {ans.evaluation.improvements.map((imp, i) => (
                              <li key={i} className="text-xs text-ink-600 dark:text-ink-300">• {imp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {ans.mediaUrl && (
                  <div className="mt-6 pt-6 border-t border-ink-100 dark:border-white/10 print:hidden">
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-500 dark:text-white/50 mb-4 flex items-center gap-2">
                       <Icon name="camera" className="h-4 w-4" /> Session Replay
                    </p>
                    <div className="overflow-hidden rounded-2xl bg-[#070b14] shadow-2xl ring-1 ring-white/10">
                      {ans.mediaType === 'video' ? (
                        <video controls className="w-full max-w-2xl mx-auto aspect-video object-cover" src={ans.mediaUrl}></video>
                      ) : (
                         <div className="p-4 flex items-center justify-center bg-gradient-to-r from-ink-900 to-ink-800">
                            <audio controls className="w-full max-w-md" src={ans.mediaUrl}></audio>
                         </div>
                      )}
                    </div>
                  </div>
                )}
              </TiltCard>
            ))}
          </div>
        </Panel>
      </Reveal>
      
      <div className="flex justify-center pt-6">
        <Link to="/history">
           <Button variant="secondary">Return to History Dashboard</Button>
        </Link>
      </div>
    </div>
  )
}

export default ResultsPage
