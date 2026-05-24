import { useNavigate } from 'react-router-dom'

export type SrsQueue = 'review' | 'learn' | 'strengthen' | 'mastered'

type SrsActionTileProps = {
  label: string
  count: number
  queue: SrsQueue
  language: string
  tier?: 'top' | 'bottom'
  accent?: 'cool' | 'warm' | 'gold' | 'neutral'
  disabled?: boolean
}

const ACCENT_CLASS: Record<NonNullable<SrsActionTileProps['accent']>, string> = {
  cool: 'stat-tile-accent-cool',
  warm: 'stat-tile-accent-warm',
  gold: 'stat-tile-accent-gold',
  neutral: 'stat-tile-accent-neutral',
}

export function SrsActionTile({
  label,
  count,
  queue,
  language,
  tier = 'top',
  accent = 'neutral',
  disabled = false,
}: SrsActionTileProps) {
  const navigate = useNavigate()
  const isDisabled = disabled || count === 0 || !language

  const handleClick = () => {
    if (isDisabled) return

    const params = new URLSearchParams({
      queue,
      lang: language,
    })
    navigate(`/study?${params.toString()}`)
  }

  const sizing =
    tier === 'top'
      ? 'min-h-[112px] rounded-2xl px-8 py-5 gap-6'
      : 'min-h-[84px] rounded-xl px-7 py-4 gap-5'

  // Top tier: colored label (accent). Bottom tier: muted neutral label.
  const labelClass =
    tier === 'top'
      ? 'stat-label-accent text-lg font-semibold uppercase tracking-[0.16em]'
      : 'text-xs font-semibold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--text-primary)_64%,transparent)]'

  const countClass =
    tier === 'top'
      ? 'stat-count text-5xl font-semibold leading-none'
      : 'stat-count text-3xl font-semibold leading-none'

  return (
    <button
      type="button"
      aria-disabled={isDisabled}
      className={[
        'stat-tile',
        ACCENT_CLASS[accent],
        sizing,
        'flex w-full items-center justify-between text-left',
        isDisabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
      ].join(' ')}
      disabled={isDisabled}
      onClick={handleClick}
    >
      <span className={labelClass}>{label}</span>
      <span className="stat-tile-divider" aria-hidden="true" />
      <span className={countClass}>{count}</span>
    </button>
  )
}
