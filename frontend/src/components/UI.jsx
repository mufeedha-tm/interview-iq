import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Icon } from './Icons'
import { useTheme } from '../context/useTheme'

const MotionLink = motion.create(Link)
const MotionButton = motion.button

export function Brand() {
  return (
    <MotionLink
      to="/"
      className="cursor-target flex items-center gap-3"
      whileHover={{ y: -1, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-950 text-white shadow-lg shadow-ink-900/20">
        <span className="font-display text-lg font-bold">IQ</span>
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-ink-950 dark:text-white">InterviewIQ</p>
        <p className="text-xs uppercase tracking-[0.24em] text-ink-400 dark:text-ink-300">Practice with signal</p>
      </div>
    </MotionLink>
  )
}

export function Button({ children, to, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-ink-950 text-white hover:bg-ink-800 dark:bg-white dark:text-ink-950 dark:hover:bg-ink-100',
    secondary: 'bg-white text-ink-950 ring-1 ring-ink-200 hover:bg-ink-100/70 dark:bg-ink-800 dark:text-white dark:ring-white/10 dark:hover:bg-ink-700',
    accent: 'bg-coral-500 text-white hover:bg-coral-400',
    ghost: 'bg-transparent text-ink-950 ring-1 ring-ink-200 hover:bg-ink-100/70 dark:text-white dark:ring-white/10 dark:hover:bg-white/6',
  }

  const base =
    'premium-btn cursor-target inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-60'

  if (to) {
    return (
      <MotionLink
        to={to}
        className={`${base} ${styles[variant]} ${className}`}
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ y: 0, scale: 0.985 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        {...props}
      >
        {children}
      </MotionLink>
    )
  }

  return (
    <MotionButton
      className={`${base} ${styles[variant]} ${className}`}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ y: 0, scale: 0.985 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </MotionButton>
  )
}

export function SectionIntro({ eyebrow, title, copy, action }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl space-y-3">
        {eyebrow ? <span className="pill">{eyebrow}</span> : null}
        <div className="space-y-2">
          <h1 className="section-title">{title}</h1>
          <p className="section-copy">{copy}</p>
        </div>
      </div>
      {action}
    </div>
  )
}

export function MetricCard({ label, value, change }) {
  return (
    <div className="metric-card">
      <p className="text-sm text-ink-500 dark:text-ink-300">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="font-display text-2xl font-semibold text-ink-950 dark:text-white">{value}</p>
        <p className="rounded-full bg-mint-300/20 px-3 py-1 text-xs font-semibold text-ink-700 dark:text-ink-100">{change}</p>
      </div>
    </div>
  )
}

export function Panel({ title, copy, children, action }) {
  return (
    <section className="soft-panel hover-lift p-5 md:p-6">
      {(title || action) && (
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            {title ? <h2 className="font-display text-xl font-semibold text-ink-950 dark:text-white">{title}</h2> : null}
            {copy ? <p className="text-sm leading-6 text-ink-500 dark:text-ink-300">{copy}</p> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function ProgressBar({ value, tone }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-ink-100">
      <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${value}%` }} />
    </div>
  )
}

export function ListItem({ title, copy }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-ink-50/80 p-4">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-xl bg-white p-2 text-coral-500 shadow-sm">
          <Icon name="check" className="h-4 w-4" />
        </div>
        <p className="font-semibold text-ink-950 dark:text-white">{title}</p>
      </div>
      <p className="text-sm leading-6 text-ink-500 dark:text-ink-300">{copy}</p>
    </div>
  )
}

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()

  return (
    <Button type="button" variant="ghost" onClick={toggleTheme}>
      <Icon name={isDark ? 'sun' : 'moon'} className="h-4 w-4" />
      {isDark ? 'Light mode' : 'Dark mode'}
    </Button>
  )
}
