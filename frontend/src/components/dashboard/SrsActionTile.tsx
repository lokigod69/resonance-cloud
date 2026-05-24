import { useNavigate } from 'react-router-dom'

export type SrsQueue = 'review' | 'learn' | 'strengthen' | 'mastered'

type SrsActionTileProps = {
  label: string
  count: number
  queue: SrsQueue
  language: string
  tier?: 'top' | 'bottom'
  accent?: 'cool' | 'warm' | 'neutral'
  disabled?: boolean
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
      ? 'min-h-[148px] gap-3 rounded-2xl p-6'
      : 'min-h-[112px] gap-2 rounded-xl p-5'

  const accentClass =
    accent === 'cool'
      ? 'stat-tile-accent-cool'
      : accent === 'warm'
        ? 'stat-tile-accent-warm'
        : 'stat-tile-accent-neutral'

  return (
    <button
      type="button"
      aria-disabled={isDisabled}
      className={[
        'stat-tile',
        accentClass,
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
            ? 'text-xs font-semibold uppercase tracking-[0.18em] text-[color-mix(in_srgb,var(--text-primary)_70%,transparent)]'
            : 'text-[11px] font-semibold uppercase tracking-[0.16em] text-[color-mix(in_srgb,var(--text-primary)_60%,transparent)]'
        }
      >
        {label}
      </span>
      <div
        className={
          tier === 'top'
            ? 'stat-count text-5xl font-semibold leading-none'
            : 'stat-count text-3xl font-semibold leading-none'
        }
      >
        {count}
      </div>
    </button>
  )
}
