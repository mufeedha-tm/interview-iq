export function Spinner({ className = '', label = 'Loading' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status" aria-live="polite">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-ink-200 border-t-coral-500 dark:border-white/15 dark:border-t-coral-400"
        aria-hidden
      />
      {label ? <p className="text-sm font-medium text-ink-500 dark:text-ink-300">{label}</p> : null}
    </div>
  )
}
