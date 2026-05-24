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
      ? 'min-h-[104px] gap-2 rounded-2xl px-5 py-4'
      : 'min-h-[78px] gap-1.5 rounded-xl px-5 py-3.5'

  return (
    <button
      type="button"
      aria-disabled={isDisabled}
      className={[
        'stat-tile',
        ACCENT_CLASS[accent],
        sizing,
        'flex w-full flex-col items-start justify-between text-left',
        isDisabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
      ].join(' ')}
      disabled={isDisabled}
      onClick={handleClick}
    >
      <span
        className={
          tier === 'top'
            ? 'text-[11px] font-semibold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--text-primary)_70%,transparent)]'
            : 'text-[10px] font-semibold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--text-primary)_60%,transparent)]'
        }
      >
        {label}
      </span>
      <div
        className={
          tier === 'top'
            ? 'stat-count text-4xl font-semibold leading-none'
            : 'stat-count text-2xl font-semibold leading-none'
        }
      >
        {count}
      </div>
    </button>
  )
}
