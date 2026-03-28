import { useEffect, useMemo, useState } from 'react'
import { fetchDashboardData, fetchLeaderboard } from '../services/dashboardService'
import { fetchInterviewHistory } from '../services/interviewService'
import { InterviewsPerMonthChart, ScoreTrendChart, SkillImprovementChart } from '../components/AnalyticsCharts'
import { Button, MetricCard, Panel, SectionIntro } from '../components/UI'
import { Icon } from '../components/Icons'
import { Reveal, TiltCard } from '../components/PremiumEffects'
import heroImage from '../assets/hero.png'

function DashboardPage() {
  const [analytics, setAnalytics] = useState(null)
  const [interviews, setInterviews] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [leaderboardFilter, setLeaderboardFilter] = useState('all-time')
  const [leaderboardSort, setLeaderboardSort] = useState('averageScore')
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [analyticsData, historyData] = await Promise.all([fetchDashboardData(), fetchInterviewHistory()])
        setAnalytics(analyticsData)
        setInterviews(historyData.interviews || [])
      } catch (fetchError) {
        setError(fetchError.response?.data?.message || 'Unable to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  useEffect(() => {
    async function loadLeaderboard() {
      setLeaderboardLoading(true)
      try {
        const leaderboardData = await fetchLeaderboard(leaderboardFilter, leaderboardSort)
        setLeaderboard(leaderboardData.leaderboard || [])
      } catch {
        setLeaderboard([])
      } finally {
        setLeaderboardLoading(false)
      }
    }
    loadLeaderboard()
  }, [leaderboardFilter, leaderboardSort])

  const scoreTrendData = useMemo(
    () =>
      interviews
        .filter((item) => typeof item.results?.score === 'number')
        .slice(0, 6)
        .reverse()
        .map((item) => ({
          label: new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          score: item.results.score,
        })),
    [interviews],
  )

  const interviewsPerMonthData = useMemo(
    () =>
      (analytics?.monthlyInterviewCount || []).slice().reverse().map((item) => ({
        month: item.month,
        interviews: item.count,
      })),
    [analytics],
  )

  const skillImprovementData = useMemo(() => {
    const skillMap = new Map()

    interviews.forEach((interview, index) => {
      const score = interview.results?.score

      if (typeof score !== 'number') {
        return
      }

      ;(interview.skills || []).forEach((skill) => {
        const current = skillMap.get(skill) || { earlier: [], recent: [] }

        if (index < Math.ceil(interviews.length / 2)) {
          current.earlier.push(score)
        } else {
          current.recent.push(score)
        }

        skillMap.set(skill, current)
      })
    })

    return [...skillMap.entries()].slice(0, 5).map(([skill, values]) => ({
      skill,
      previous: values.earlier.length
        ? Math.round(values.earlier.reduce((sum, value) => sum + value, 0) / values.earlier.length)
        : 0,
      current: values.recent.length
        ? Math.round(values.recent.reduce((sum, value) => sum + value, 0) / values.recent.length)
        : 0,
    }))
  }, [interviews])

  const latestCompletedInterview = interviews.find((item) => typeof item.results?.score === 'number')
  const readinessSummary = [
    {
      label: 'Saved interviews',
      value: String(analytics?.totalInterviews ?? 0),
      change: 'From your own practice history',
    },
    {
      label: 'Average score',
      value: `${analytics?.averageScore ?? 0}%`,
      change: latestCompletedInterview ? `Latest: ${latestCompletedInterview.results.score}%` : 'Finish a round to build this',
    },
    {
      label: 'Skills tracked',
      value: String(analytics?.topSkills?.length ?? 0),
      change: 'Based on interview topics you actually used',
    },
  ]

  return (
    <div className="space-y-6">
      <SectionIntro
        eyebrow="Dashboard"
        title="A premium analytics view built from your real interview data."
        copy="Charts, leaderboard, and recent activity are generated from your saved sessions and completed reports."
        action={
          <div className="flex flex-wrap gap-3">
            <Button to="/start-interview">Start interview</Button>
            <Button to="/history" variant="secondary">
              Open history
            </Button>
          </div>
        }
      />

      <Reveal>
        <div className="dashboard-band">
          <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_380px] xl:items-center">
            <div className="space-y-6">
              <span className="pill">Interview intelligence</span>
              <div className="space-y-3">
                <h2 className="font-display text-3xl font-semibold tracking-tight text-ink-950 md:text-5xl dark:text-white">
                  Track how your preparation evolves across sessions, skills, and real outcomes.
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-ink-500 md:text-base dark:text-ink-300">
                  Use this view to understand consistency, identify weak spots, compare recent performance, and see where you stand on the leaderboard.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {readinessSummary.map((item) => (
                  <MetricCard key={item.label} {...item} />
                ))}
              </div>
            </div>

            <TiltCard className="dark-card p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/55">Analytics preview</p>
                  <p className="mt-2 font-display text-2xl font-semibold text-white">Candidate readiness</p>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
                  Live data
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-[130px_minmax(0,1fr)] md:items-center">
                <img src={heroImage} alt="InterviewIQ dashboard analytics preview" className="mx-auto w-full max-w-[130px] rounded-lg shadow-2xl" />
                <div className="space-y-3">
                  <div className="rounded-2xl bg-white/6 px-4 py-3 text-sm text-white/82">
                    {latestCompletedInterview ? `Latest completed round: ${latestCompletedInterview.title}` : 'Complete a round to unlock richer insights'}
                  </div>
                  <div className="rounded-2xl bg-white/6 px-4 py-3 text-sm text-white/82">
                    {(analytics?.topSkills || []).slice(0, 3).map((item) => item.skill).join(', ') || 'Skills will appear here once sessions are saved'}
                  </div>
                </div>
              </div>
            </TiltCard>
          </div>
        </div>
      </Reveal>

      {loading ? <p className="text-sm text-ink-500">Loading dashboard...</p> : null}
      {error ? <p className="text-sm text-coral-500">{error}</p> : null}

      {!loading && !error ? (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <Reveal delay={60}>
              <ScoreTrendChart data={scoreTrendData.length ? scoreTrendData : [{ label: 'No data', score: 0 }]} />
            </Reveal>
            <Reveal delay={120}>
              <InterviewsPerMonthChart
                data={interviewsPerMonthData.length ? interviewsPerMonthData : [{ month: 'No data', interviews: 0 }]}
              />
            </Reveal>
          </div>

          {skillImprovementData.length ? (
            <Reveal delay={160}>
              <SkillImprovementChart data={skillImprovementData} />
            </Reveal>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
            <Reveal delay={200}>
              <Panel title="Recent interview activity" copy="Your newest saved sessions and report outcomes.">
                <div className="space-y-4">
                  {interviews.slice(0, 5).map((interview) => (
                    <TiltCard
                      key={interview._id}
                      className="rounded-[28px] border border-ink-100 bg-ink-50 p-4 dark:border-white/8 dark:bg-white/4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <p className="font-semibold text-ink-950 dark:text-white">{interview.title}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-700 dark:bg-white/10 dark:text-white/80">
                          {interview.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink-500 dark:text-ink-300">
                        Score: {interview.results?.score ?? 'Pending'} | Skills: {(interview.skills || []).join(', ') || 'None'}
                      </p>
                    </TiltCard>
                  ))}
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={240}>
              <Panel
                title="Global leaderboard"
                copy="Candidates are ranked by their completed interview performance."
                action={
                  <div className="flex flex-wrap items-center gap-3">
                    <select
                      className="rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700 outline-none dark:bg-white/10 dark:text-white"
                      value={leaderboardFilter}
                      onChange={(e) => setLeaderboardFilter(e.target.value)}
                    >
                      <option value="all-time">All Time</option>
                      <option value="monthly">This Month</option>
                      <option value="weekly">This Week</option>
                    </select>
                    <select
                      className="rounded-full bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-700 outline-none dark:bg-white/10 dark:text-white"
                      value={leaderboardSort}
                      onChange={(e) => setLeaderboardSort(e.target.value)}
                    >
                      <option value="averageScore">Highest Score</option>
                      <option value="totalInterviews">Most Interviews</option>
                    </select>
                    <div className="rounded-full bg-coral-500/10 px-3 py-1.5 text-xs font-semibold text-coral-600 dark:text-coral-400">
                      <Icon name="trophy" className="mr-1 inline h-3.5 w-3.5" />
                      Live ranking
                    </div>
                  </div>
                }
              >
                <div className="space-y-4 relative min-h-[200px]">
                  {leaderboardLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-[#111]/50 backdrop-blur-sm z-10 rounded-[28px]">
                      <span className="text-sm font-semibold text-ink-500">Refreshing Leaderboard...</span>
                    </div>
                  ) : null}
                  {leaderboard.length ? (
                    leaderboard.map((entry, index) => (
                      <TiltCard
                        key={entry.userId || entry.email}
                        className="rounded-[28px] border border-ink-100 bg-ink-50 p-4 dark:border-white/8 dark:bg-white/4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink-950 dark:text-white">
                              #{index + 1} {entry.name || entry.email}
                            </p>
                            <p className="mt-1 text-xs text-ink-500 dark:text-ink-300">
                              Best {entry.bestScore} | {entry.interviewsCompleted} interviews
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink-700 dark:bg-white/10 dark:text-white/80">
                            Avg {entry.averageScore}
                          </span>
                        </div>
                      </TiltCard>
                    ))
                  ) : (
                    <div className="rounded-3xl bg-ink-50 p-4 text-sm text-ink-600 dark:bg-white/4 dark:text-ink-200">
                      Complete more interviews to start populating the leaderboard.
                    </div>
                  )}
                </div>
              </Panel>
            </Reveal>
          </div>
        </>
      ) : null}
    </div>
  )
}

export default DashboardPage
