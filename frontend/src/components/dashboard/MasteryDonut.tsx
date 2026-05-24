type MasteryDonutProps = {
  mastered: number
  total: number
  loading?: boolean
  caption?: string
}

export function MasteryDonut({ mastered, total, loading = false, caption = 'mastered' }: MasteryDonutProps) {
  const size = 132
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const safeTotal = Math.max(total, 0)
  const safeMastered = Math.min(Math.max(mastered, 0), safeTotal)
  const progress = safeTotal > 0 ? safeMastered / safeTotal : 0
  const dashOffset = circumference * (1 - progress)
  const gradientId = 'mastery-ring-gradient'

  if (loading) {
    return (
      <div className="mastery-ring-shell flex h-[132px] w-[132px] items-center justify-center">
        <div className="h-20 w-20 animate-pulse rounded-full bg-[color-mix(in_srgb,var(--text-primary)_8%,transparent)]" />
      </div>
    )
  }

  if (safeTotal === 0) {
    return (
      <div className="mastery-ring-shell flex h-[132px] w-[132px] items-center justify-center p-4 text-center">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--text-primary)_64%,transparent)]">
          Start studying to track mastery
        </p>
      </div>
    )
  }

  return (
    <div
      className="mastery-ring-shell relative h-[132px] w-[132px]"
      aria-label={`${safeMastered} of ${safeTotal} ${caption}`}
    >
      <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`} role="img">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent, #f24f13)" />
            <stop offset="100%" stopColor="var(--accent-2, #f7c843)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="color-mix(in srgb, var(--text-primary) 10%, transparent)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-semibold leading-none text-[var(--text-primary)]">{safeMastered}</div>
        <div className="mt-0.5 text-xs text-[color-mix(in_srgb,var(--text-primary)_64%,transparent)]">/ {safeTotal}</div>
        <div className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.22em] text-[color-mix(in_srgb,var(--text-primary)_58%,transparent)]">
          {caption}
        </div>
      </div>
    </div>
  )
}
