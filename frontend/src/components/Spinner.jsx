export function Spinner({ className = '', label = 'Loading' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status" aria-live="polite">
      <div className="relative h-11 w-11" aria-hidden>
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-ink-200 border-t-coral-500 dark:border-white/15 dark:border-t-coral-400" />
        <div className="absolute inset-[8px] rounded-full bg-gradient-to-br from-coral-500/12 via-gold-300/20 to-sky-300/20" />
      </div>
      {label ? <p className="text-sm font-medium text-ink-500 dark:text-ink-300">{label}</p> : null}
    </div>
  )
}
