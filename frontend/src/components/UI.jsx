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
      <div className="relative flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/20 bg-[linear-gradient(135deg,#07111f_0%,#223b59_45%,#ff6b57_100%)] text-white shadow-[0_16px_34px_rgba(7,17,31,0.22)]">
        <div className="absolute inset-[1px] rounded-[16px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.24),transparent_55%)]" />
        <span className="relative font-display text-lg font-bold">IQ</span>
      </div>
      <div>
        <p className="font-display text-lg font-semibold text-ink-950 dark:text-white">InterviewIQ</p>
        <p className="text-[11px] uppercase tracking-[0.28em] text-ink-400 dark:text-ink-300">Practice with signal</p>
      </div>
    </MotionLink>
  )
}

export function Button({ children, to, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary:
      'bg-[linear-gradient(135deg,#07111f_0%,#223b59_62%,#385574_100%)] text-white hover:brightness-110 dark:bg-[linear-gradient(135deg,#ffffff_0%,#dbeafe_100%)] dark:text-ink-950',
    secondary:
      'bg-white/92 text-ink-950 ring-1 ring-ink-200/90 hover:bg-white hover:shadow-[0_14px_34px_rgba(7,17,31,0.08)] dark:bg-ink-800/92 dark:text-white dark:ring-white/10 dark:hover:bg-ink-700',
    accent:
      'bg-[linear-gradient(135deg,#ff6b57_0%,#ff8d7d_38%,#ffd166_100%)] text-white hover:brightness-105',
    ghost:
      'bg-transparent text-ink-950 ring-1 ring-ink-200/90 hover:bg-ink-100/80 dark:text-white dark:ring-white/10 dark:hover:bg-white/6',
  }

  const base =
    'premium-btn cursor-target inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition duration-150 disabled:cursor-not-allowed disabled:opacity-60'

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
    <div className="metric-card surface-tile">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400 dark:text-ink-300">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="font-display text-3xl font-semibold text-ink-950 dark:text-white">{value}</p>
        <p className="status-chip status-chip-success max-w-[160px] justify-center text-center">{change}</p>
      </div>
    </div>
  )
}

export function Panel({ title, copy, children, action }) {
  return (
    <section className="soft-panel hover-lift p-5 md:p-6">
      {(title || action) && (
        <div className="relative mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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
    <div className="h-3 overflow-hidden rounded-full bg-ink-100 dark:bg-white/8">
      <div className={`h-full rounded-full bg-gradient-to-r ${tone}`} style={{ width: `${value}%` }} />
    </div>
  )
}

export function ListItem({ title, copy }) {
  return (
    <div className="feature-tile">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-xl bg-white p-2 text-coral-500 shadow-sm dark:bg-ink-800">
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
    <Button type="button" variant="ghost" onClick={toggleTheme} className="min-w-[144px]">
      <Icon name={isDark ? 'sun' : 'moon'} className="h-4 w-4" />
      {isDark ? 'Light mode' : 'Dark mode'}
    </Button>
  )
}
