import { Link, Outlet } from 'react-router-dom'
import { Brand } from './UI'
import { ParallaxLayer, RouteLoader } from './PremiumEffects'

function AuthLayout() {
  return (
    <div className="app-shell px-4 py-6 sm:px-6 lg:px-8">
      <RouteLoader />
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col rounded-[24px] border border-white/70 bg-white/60 p-4 shadow-[var(--shadow-panel)] backdrop-blur-lg lg:p-5">
        <header className="flex items-center justify-between pb-5">
          <Brand />
          <Link to="/" className="text-sm font-medium text-ink-500 transition hover:text-ink-950">
            Back to site
          </Link>
        </header>

        <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_420px]">
          <section className="premium-stage mesh-lines reveal-up p-6 md:p-8">
            <ParallaxLayer speed={4} className="absolute inset-0 pointer-events-none">
              <span className="ambient-orb left-10 top-10 h-40 w-40 bg-gold-300/30" />
            </ParallaxLayer>
            <ParallaxLayer speed={6} className="absolute inset-0 pointer-events-none">
              <span className="ambient-orb right-12 top-24 h-48 w-48 bg-sky-300/22" />
            </ParallaxLayer>
            <ParallaxLayer speed={8} className="absolute inset-0 pointer-events-none">
              <span className="ambient-orb bottom-10 left-1/3 h-36 w-36 bg-mint-300/22" />
            </ParallaxLayer>

            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="space-y-5">
                <span className="pill border-white/10 bg-white/10 text-white/80">Premium interview workspace</span>
                <div className="space-y-3">
                  <h1 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">
                    Build interview confidence with a product that feels job-ready.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-white/70 md:text-base">
                    Practice interviews, resume prep, saved reports, premium loops, and performance tracking in one polished workspace built for serious candidates.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="premium-video shine-card reveal-up reveal-delay-1">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/60">Live interview preview</p>
                      <p className="mt-2 font-display text-xl font-semibold">Frontend architecture round</p>
                    </div>
                    <div className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                      Recording
                    </div>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="rounded-3xl border border-white/10 bg-white/6 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/50">Current prompt</p>
                      <p className="mt-2 text-sm leading-6 text-white/85">
                        Explain how you would redesign a component library release workflow for multiple teams.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {['Live feedback', 'Saved transcript', 'Follow-up questions'].map((item) => (
                        <div key={item} className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-white/75">
                          {item}
                        </div>
                      ))}
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-coral-400 via-gold-300 to-sky-300" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 reveal-up reveal-delay-2">
                  {[
                    'OTP signup and secure login',
                    'Real interview CRUD and saved history',
                    'Resume upload and premium session flow',
                  ].map((item) => (
                    <div key={item} className="rounded-2xl border border-white/10 bg-white/6 p-4 text-sm leading-6 text-white/78">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="reveal-up reveal-delay-3">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
