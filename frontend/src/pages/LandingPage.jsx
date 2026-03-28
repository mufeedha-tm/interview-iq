import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { ParallaxLayer, Reveal, RouteLoader, TiltCard } from '../components/PremiumEffects'
import { Brand, Button, Panel } from '../components/UI'
import { getStoredToken } from '../lib/auth'
import heroImage from '../assets/hero.png'

const showcaseRows = [
  {
    title: 'Real-time mock rounds',
    copy: 'Generate role-based questions, answer them live, and move through a focused interview flow.',
    icon: 'spark',
  },
  {
    title: 'Audio and video capture',
    copy: 'Practice with your actual voice or camera so the session feels closer to a real interview loop.',
    icon: 'camera',
  },
  {
    title: 'AI report and coaching',
    copy: 'Finish a session and get structured feedback, rubric scores, follow-up prompts, and exportable results.',
    icon: 'chart',
  },
]

const workflow = [
  'Create an account and verify OTP once.',
  'Start a mock round for your target role.',
  'Record answers, save progress, and finish the interview.',
  'Review analytics, history, resume prep, and leaderboard position.',
]

function LandingPage() {
  const isLoggedIn = Boolean(getStoredToken())
  const protectedPath = (path) => (isLoggedIn ? path : '/login')

  return (
    <div className="app-shell px-4 py-5 sm:px-6 lg:px-8">
      <RouteLoader />
      <div className="mx-auto max-w-7xl space-y-6">
        <Reveal>
          <header className="glass-panel hero-mesh flex items-center justify-between rounded-[20px] px-5 py-4 md:px-6">
            <Brand />
            <div className="flex items-center gap-3">
              <Link to="/login" className="hidden text-sm font-medium text-ink-500 transition hover:text-ink-950 md:block">
                Log in
              </Link>
              <Button to="/signup" variant="primary">
                Create account
              </Button>
            </div>
          </header>
        </Reveal>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_390px]">
          <Reveal className="premium-stage hero-mesh px-6 py-7 md:px-8 md:py-9" delay={80}>
            <ParallaxLayer speed={5} className="absolute inset-0 pointer-events-none">
              <span className="ambient-orb left-6 top-6 h-36 w-36 bg-gold-300/30" />
            </ParallaxLayer>
            <ParallaxLayer speed={7} className="absolute inset-0 pointer-events-none">
              <span className="ambient-orb right-6 top-20 h-44 w-44 bg-sky-300/24" />
            </ParallaxLayer>
            <ParallaxLayer speed={9} className="absolute inset-0 pointer-events-none">
              <span className="ambient-orb bottom-8 left-1/3 h-32 w-32 bg-mint-300/24" />
            </ParallaxLayer>

            <div className="relative space-y-6">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_400px] xl:items-center">
                <div className="space-y-5">
                  <span className="premium-badge">
                    <Icon name="spark" className="h-3.5 w-3.5" />
                    AI interview platform
                  </span>
                  <div className="space-y-3">
                    <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-5xl">
                      Practice interviews in a workspace that feels ready for recruiters, not just marks.
                    </h1>
                    <p className="max-w-2xl text-sm leading-7 text-white/72 md:text-base">
                      InterviewIQ combines mock interviews, answer recording, AI-generated feedback, performance analytics,
                      resume prep, and leaderboard ranking in one polished platform built for serious job seekers.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button to={protectedPath('/start-interview')} variant="accent">
                      Start mock round
                    </Button>
                    <Button to={protectedPath('/resume-analyzer')} variant="secondary">
                      Analyze resume
                    </Button>
                    <Button to={protectedPath('/results')} variant="ghost">
                      View results
                    </Button>
                    <Button to={protectedPath('/dashboard')} variant="secondary">
                      Explore dashboard
                    </Button>
                  </div>

                  <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
                    {showcaseRows.map((item) => (
                      <TiltCard key={item.title} className="min-w-0 rounded-[18px] border border-white/10 bg-white/6 p-4">
                        <div className="w-fit rounded-xl bg-white/10 p-3 text-white">
                          <Icon name={item.icon} className="h-5 w-5" />
                        </div>
                        <p className="mt-3 break-words font-display text-lg font-semibold leading-tight text-white">{item.title}</p>
                        <p className="mt-2 break-words text-sm leading-6 text-white/66">{item.copy}</p>
                      </TiltCard>
                    ))}
                  </div>
                </div>

                <Reveal delay={180}>
                  <ParallaxLayer speed={4}>
                    <TiltCard className="video-shell p-4 md:p-5">
                    <div className="relative space-y-4">
                      <div className="flex items-center justify-between border-b border-white/10 pb-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-white/55">Live workspace preview</p>
                          <p className="mt-2 font-display text-xl font-semibold text-white">Product-style interview surface</p>
                        </div>
                        <div className="rounded-full bg-emerald-400/18 px-3 py-1 text-xs font-semibold text-emerald-200">
                          Ready
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-white/10 bg-white/6 p-4">
                        <div className="grid gap-4 md:grid-cols-[140px_minmax(0,1fr)] md:items-center">
                          <div className="rounded-[18px] bg-white/5 p-3">
                            <img src={heroImage} alt="InterviewIQ AI interview preview" className="mx-auto w-full max-w-[160px] rounded-lg shadow-2xl" />
                          </div>
                          <div className="space-y-3">
                            <div className="rounded-2xl bg-white/7 px-4 py-3 text-sm text-white/82">
                              Current role: <span className="font-semibold text-white">Senior Frontend Engineer</span>
                            </div>
                            <div className="rounded-2xl bg-white/7 px-4 py-3 text-sm text-white/82">
                              Session focus: architecture, APIs, debugging, communication
                            </div>
                            <div className="rounded-2xl bg-white/7 px-4 py-3 text-sm text-white/82">
                              Output: saved report, improvement cues, leaderboard-ready results
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="floating-line rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-white/78">
                          Record audio or video while answering
                        </div>
                        <div className="floating-line rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-white/78">
                          Export PDF report after each round
                        </div>
                      </div>
                    </div>
                    </TiltCard>
                  </ParallaxLayer>
                </Reveal>
              </div>
            </div>
          </Reveal>

          <div className="space-y-6">
            <Reveal delay={140}>
              <Panel
                title="How the product feels"
                copy="Designed for focused interview prep with realistic practice and measurable progress."
              >
                <div className="space-y-4 text-sm leading-6 text-ink-500 dark:text-ink-300">
                  <p>Generate role-specific questions, record answers, and review AI feedback with scoring rubrics and coaching tips.</p>
                  <p>Track interview history, monitor performance trends, and improve your readiness for actual hiring rounds.</p>
                </div>
              </Panel>
            </Reveal>

            <Reveal delay={220}>
              <Panel title="End-to-end workflow" copy="A realistic journey from signup to final interview report.">
                <div className="space-y-4">
                  {workflow.map((item, index) => (
                    <div key={item} className="rounded-3xl bg-ink-50 p-4 text-sm leading-6 text-ink-700 dark:bg-white/4 dark:text-ink-100">
                      <span className="mr-2 font-semibold text-ink-950 dark:text-white">0{index + 1}.</span>
                      {item}
                    </div>
                  ))}
                </div>
              </Panel>
            </Reveal>
          </div>
        </section>
      </div>
    </div>
  )
}

export default LandingPage
