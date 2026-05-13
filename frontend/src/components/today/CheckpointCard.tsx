import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

type CheckpointCardProps = {
  href: string
  completedPathCount: number
  className?: string
}

export function CheckpointCard({ href, completedPathCount, className }: CheckpointCardProps) {
  const { t } = useTranslation()

  return (
    <Link
      to={href}
      className={cn(
        'today-checkpoint-card group relative flex min-h-32 min-w-0 flex-col overflow-hidden rounded-lg border p-3 pt-4 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--today-accent)]',
        className,
      )}
      aria-label={t('today.checkpoint.cardAria')}
    >
      <span className="today-checkpoint-cardAccent absolute inset-x-0 top-0 h-1" aria-hidden="true" />
      <div className="flex h-full items-start gap-3">
        <span className="today-checkpoint-cardIcon flex h-9 w-9 shrink-0 items-center justify-center rounded-full border">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-5 items-center justify-end">
            <span className="today-checkpoint-cardKicker rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase leading-5 tracking-[0.08em]">
              {t('today.checkpoint.cardKicker')}
            </span>
          </div>
          <h3 className="mt-1 break-words text-base font-semibold leading-snug text-[var(--text-primary)]">
            {t('today.checkpoint.title')}
          </h3>
          <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
            {t('today.checkpoint.cardBody', { count: completedPathCount })}
          </p>
        </div>
      </div>
    </Link>
  )
}
