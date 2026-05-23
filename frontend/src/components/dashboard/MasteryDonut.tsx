type MasteryDonutProps = {
  mastered: number
  total: number
  loading?: boolean
}

export function MasteryDonut({ mastered, total, loading = false }: MasteryDonutProps) {
  const size = 148
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const safeTotal = Math.max(total, 0)
  const safeMastered = Math.min(Math.max(mastered, 0), safeTotal)
  const progress = safeTotal > 0 ? safeMastered / safeTotal : 0
  const dashOffset = circumference * (1 - progress)

  if (loading) {
    return (
      <div className="flex h-[148px] w-[148px] items-center justify-center rounded-full border border-border/60 bg-muted/30">
        <div className="h-24 w-24 animate-pulse rounded-full bg-muted" />
      </div>
    )
  }

  if (safeTotal === 0) {
    return (
      <div className="flex h-[148px] w-[148px] items-center justify-center rounded-full border border-border/60 bg-muted/20 p-5 text-center">
        <p className="text-sm font-medium leading-snug text-muted-foreground">
          Start studying to track mastery
        </p>
      </div>
    )
  }

  return (
    <div className="relative h-[148px] w-[148px]" aria-label={`${safeMastered} of ${safeTotal} mastered`}>
      <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`} role="img">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-subtle, hsl(var(--border)))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--accent, hsl(var(--primary)))"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="text-3xl font-semibold leading-none text-foreground">{safeMastered}</div>
        <div className="mt-1 text-sm text-muted-foreground">/ {safeTotal}</div>
        <div className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          mastered
        </div>
      </div>
    </div>
  )
}
