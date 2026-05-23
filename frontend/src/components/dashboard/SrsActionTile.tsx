import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export type SrsQueue = 'review' | 'learn' | 'strengthen' | 'mastered'

type SrsActionTileProps = {
  label: string
  count: number
  queue: SrsQueue
  language: string
  variant?: 'primary' | 'muted'
  icon?: ReactNode
  disabled?: boolean
  caption?: string
}

export function SrsActionTile({
  label,
  count,
  queue,
  language,
  variant = 'primary',
  icon,
  disabled = false,
  caption,
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

  return (
    <button
      type="button"
      aria-disabled={isDisabled}
      className={[
        'theme-card flex min-h-[132px] w-full flex-col items-start justify-between rounded-xl border p-5 text-left transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isDisabled ? 'cursor-not-allowed opacity-55' : 'hover:-translate-y-0.5 hover:border-primary/40',
        variant === 'muted' ? 'bg-muted/20' : 'bg-card',
      ].join(' ')}
      disabled={isDisabled}
      onClick={handleClick}
    >
      <div className="flex w-full items-start justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <div>
        <div className="text-4xl font-semibold leading-none text-foreground">{count}</div>
        {caption ? <p className="mt-2 text-xs font-medium text-muted-foreground">{caption}</p> : null}
      </div>
    </button>
  )
}
