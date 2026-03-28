import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { appNav } from '../data/mockData'
import { Icon } from './Icons'
import { Brand, Button, ThemeToggle } from './UI'
import { useAuth } from '../context/AuthContext'
import { RouteLoader } from './PremiumEffects'
import { toast } from 'react-toastify'
import { deleteInterview, fetchInterviewHistory, updateInterview } from '../services/interviewService'

function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { user, logoutContext } = useAuth()
  const headerRef = useRef(null)
  
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User'
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase() || 'IQ'

  useEffect(() => {
    function onAuthLogout() {
      logoutContext()
      navigate('/login')
    }
    
    window.addEventListener('auth:logout', onAuthLogout)
    return () => window.removeEventListener('auth:logout', onAuthLogout)
  }, [navigate, logoutContext])

  async function handleLogout() {
    await logoutContext()
    navigate('/login')
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    const query = search.trim()
    setSuggestionsOpen(false)
    navigate(query ? `/history?q=${encodeURIComponent(query)}` : '/history')
  }

  useEffect(() => {
    const query = search.trim()

    if (query.length < 2) {
      setSuggestions([])
      return
    }

    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      setSuggestionsLoading(true)
      try {
        const data = await fetchInterviewHistory({ q: query, page: 1, limit: 6 })
        if (!cancelled) {
          setSuggestions(data.interviews || [])
          setSuggestionsOpen(true)
        }
      } catch {
        if (!cancelled) {
          setSuggestions([])
        }
      } finally {
        if (!cancelled) {
          setSuggestionsLoading(false)
        }
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [search])

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!headerRef.current?.contains(event.target)) {
        setSuggestionsOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  async function handleQuickEdit(interviewId, currentTitle) {
    const nextTitle = window.prompt('Edit interview title', currentTitle || '')
    if (!nextTitle || !nextTitle.trim() || nextTitle.trim() === currentTitle) {
      return
    }

    try {
      const { interview: updated } = await updateInterview(interviewId, { title: nextTitle.trim() })
      setSuggestions((current) => current.map((item) => (item._id === interviewId ? updated : item)))
      toast.success('Interview title updated.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to update this interview.')
    }
  }

  async function handleQuickDelete(interviewId) {
    const confirmed = window.confirm('Delete this interview? This cannot be undone.')
    if (!confirmed) {
      return
    }

    try {
      await deleteInterview(interviewId)
      setSuggestions((current) => current.filter((item) => item._id !== interviewId))
      toast.success('Interview deleted.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to delete this interview.')
    }
  }

  return (
    <div className="app-shell px-4 py-4 sm:px-5 lg:px-6">
      <RouteLoader />
      <div className="mx-auto max-w-[1440px] space-y-4">
        <header ref={headerRef} className="glass-panel hero-mesh rounded-[20px] px-4 py-4 md:px-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-4">
                <Brand />
                <div className="hidden rounded-xl bg-ink-950 px-3 py-1.5 text-sm font-semibold text-white lg:block">
                  {user?.subscriptionTier === 'premium'
                    ? `${user.premiumInterviewsRemaining ?? 0} premium credits`
                    : 'Free plan'}
                </div>
              </div>

              <div className="hidden flex-col gap-3 md:flex lg:flex-row lg:items-center">
                <div className="relative w-full lg:w-auto">
                  <form
                    onSubmit={handleSearchSubmit}
                    className="flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-2.5 lg:w-[420px] dark:border-white/10 dark:bg-ink-800"
                  >
                    <Icon name="search" className="h-4 w-4 text-ink-400 dark:text-ink-300" />
                    <input
                      className="w-full min-w-0 bg-transparent text-sm text-ink-950 outline-none dark:text-white"
                      value={search}
                      onFocus={() => setSuggestionsOpen(Boolean(search.trim()))}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search interviews (title, role, skill)"
                    />
                    {search ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-ink-400 hover:text-ink-700 dark:text-ink-300 dark:hover:text-white"
                        onClick={() => {
                          setSearch('')
                          setSuggestions([])
                          setSuggestionsOpen(false)
                        }}
                      >
                        Clear
                      </button>
                    ) : null}
                  </form>

                  {suggestionsOpen ? (
                    <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl dark:border-white/10 dark:bg-ink-900">
                      {suggestionsLoading ? (
                        <p className="px-4 py-3 text-sm text-ink-500 dark:text-ink-300">Searching...</p>
                      ) : null}
                      {!suggestionsLoading && suggestions.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-ink-500 dark:text-ink-300">No matching interviews.</p>
                      ) : null}
                      {!suggestionsLoading && suggestions.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto">
                          {suggestions.map((item) => (
                            <div
                              key={item._id}
                              className="border-b border-ink-100 px-4 py-3 last:border-b-0 dark:border-white/10"
                            >
                              <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{item.title}</p>
                              <p className="mt-1 truncate text-xs text-ink-500 dark:text-ink-300">
                                {item.status} | {item.difficulty} | score: {item.results?.score ?? 'pending'}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="rounded-xl bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-200 dark:bg-white/10 dark:text-white"
                                  onClick={() => {
                                    navigate(`/interview-session?interviewId=${item._id}`)
                                    setSuggestionsOpen(false)
                                  }}
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  className="rounded-xl bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-200 dark:bg-white/10 dark:text-white"
                                  onClick={() => handleQuickEdit(item._id, item.title)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="rounded-xl bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-700 hover:bg-coral-100"
                                  onClick={() => handleQuickDelete(item._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <ThemeToggle />
                <Button type="button" variant="ghost" onClick={handleLogout}>
                  <Icon name="logout" className="h-4 w-4" />
                  Log out
                </Button>
                <div className="flex items-center gap-3 rounded-xl bg-ink-950 px-3 py-2.5 text-white dark:bg-ink-800">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 font-semibold">{initials}</div>
                  <div>
                    <p className="text-sm font-semibold">{displayName}</p>
                    <p className="text-xs text-white/65">
                      {user?.targetRole || (user?.subscriptionTier === 'premium' ? 'Premium member' : 'Interview prep user')}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="inline-flex items-center gap-2 self-end rounded-xl bg-white px-3 py-2 text-sm font-semibold text-ink-700 ring-1 ring-ink-200 transition hover:bg-ink-50 dark:bg-ink-800 dark:text-white dark:ring-white/10 dark:hover:bg-ink-700 md:hidden"
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-header-menu"
                onClick={() => setMobileNavOpen((current) => !current)}
              >
                <Icon name={mobileNavOpen ? 'close' : 'menu'} className="h-4 w-4" />
                {mobileNavOpen ? 'Close' : 'Menu'}
              </button>
            </div>

            <div className="border-t border-ink-100 pt-4 dark:border-white/10">
              <div
                id="mobile-header-menu"
                className={`${mobileNavOpen ? 'flex' : 'hidden'} flex-col gap-4 md:hidden`}
              >
                <div className="relative w-full">
                  <form
                    onSubmit={handleSearchSubmit}
                    className="flex w-full items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-2.5 dark:border-white/10 dark:bg-ink-800"
                  >
                    <Icon name="search" className="h-4 w-4 text-ink-400 dark:text-ink-300" />
                    <input
                      className="w-full min-w-0 bg-transparent text-sm text-ink-950 outline-none dark:text-white"
                      value={search}
                      onFocus={() => setSuggestionsOpen(Boolean(search.trim()))}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search interviews (title, role, skill)"
                    />
                    {search ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-ink-400 hover:text-ink-700 dark:text-ink-300 dark:hover:text-white"
                        onClick={() => {
                          setSearch('')
                          setSuggestions([])
                          setSuggestionsOpen(false)
                        }}
                      >
                        Clear
                      </button>
                    ) : null}
                  </form>

                  {suggestionsOpen ? (
                    <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl dark:border-white/10 dark:bg-ink-900">
                      {suggestionsLoading ? (
                        <p className="px-4 py-3 text-sm text-ink-500 dark:text-ink-300">Searching...</p>
                      ) : null}
                      {!suggestionsLoading && suggestions.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-ink-500 dark:text-ink-300">No matching interviews.</p>
                      ) : null}
                      {!suggestionsLoading && suggestions.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto">
                          {suggestions.map((item) => (
                            <div
                              key={item._id}
                              className="border-b border-ink-100 px-4 py-3 last:border-b-0 dark:border-white/10"
                            >
                              <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{item.title}</p>
                              <p className="mt-1 truncate text-xs text-ink-500 dark:text-ink-300">
                                {item.status} | {item.difficulty} | score: {item.results?.score ?? 'pending'}
                              </p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  className="rounded-xl bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-200 dark:bg-white/10 dark:text-white"
                                  onClick={() => {
                                    navigate(`/interview-session?interviewId=${item._id}`)
                                    setSuggestionsOpen(false)
                                  }}
                                >
                                  Open
                                </button>
                                <button
                                  type="button"
                                  className="rounded-xl bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-200 dark:bg-white/10 dark:text-white"
                                  onClick={() => handleQuickEdit(item._id, item.title)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="rounded-xl bg-coral-50 px-3 py-1 text-xs font-semibold text-coral-700 hover:bg-coral-100"
                                  onClick={() => handleQuickDelete(item._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ThemeToggle />
                  <Button type="button" variant="ghost" onClick={handleLogout}>
                    <Icon name="logout" className="h-4 w-4" />
                    Log out
                  </Button>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-ink-950 px-3 py-2.5 text-white dark:bg-ink-800">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 font-semibold">{initials}</div>
                  <div>
                    <p className="text-sm font-semibold">{displayName}</p>
                    <p className="text-xs text-white/65">
                      {user?.targetRole || (user?.subscriptionTier === 'premium' ? 'Premium member' : 'Interview prep user')}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-ink-950 px-3 py-2 text-sm font-semibold text-white lg:hidden">
                  {user?.subscriptionTier === 'premium'
                    ? `${user.premiumInterviewsRemaining ?? 0} premium credits`
                    : 'Free plan'}
                </div>

                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500 dark:text-ink-300">Navigation</p>
              </div>

              <nav
                id="primary-nav-links"
                className={`${mobileNavOpen ? 'mt-4 flex' : 'hidden'} flex-wrap gap-2 md:mt-0 md:flex`}
              >
                {[
                  ...appNav,
                  ...(user?.role === 'admin'
                    ? [
                        { label: 'Admin Users', path: '/admin-users', icon: 'user' },
                        { label: 'Admin Reports', path: '/admin-reports', icon: 'chart' },
                      ]
                    : []),
                ].map((item) => {
                  const isActive = location.pathname === item.path

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileNavOpen(false)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-ink-950 text-white dark:bg-white dark:text-ink-950'
                          : 'bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-ink-50 dark:bg-ink-800 dark:text-white dark:ring-white/10'
                      }`}
                    >
                      <Icon name={item.icon} className="h-4 w-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </nav>
            </div>
          </div>
        </header>

        <main className="glass-panel rounded-[20px] p-4 md:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
