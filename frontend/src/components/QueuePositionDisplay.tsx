// Renders learner-facing queue position and ETA status for a generation job.
import { AlertCircle, Clock3, Rows3 } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

export type QueuePositionDisplayProps = {
  jobsAhead: number | null
  queuePaused: boolean
  hasChecked: boolean
  className?: string
  variant?: 'classic' | 'glassy'
}

function formatEtaMinutes(minutes: number) {
  const rounded = Math.max(0, Math.round(minutes))

  if (rounded <= 60) {
    return `${rounded} min`
  }

  const hours = Math.floor(rounded / 60)
  const remainder = rounded % 60

  if (remainder === 0) {
    return `${hours}h`
  }

  return `${hours}h ${remainder}min`
}

export default function QueuePositionDisplay({
  jobsAhead,
  queuePaused,
  hasChecked,
  className,
  variant = 'classic',
}: QueuePositionDisplayProps) {
  const { t } = useTranslation()
  const etaDuration = jobsAhead !== null ? formatEtaMinutes(jobsAhead * 5) : null
  const isChecking = !hasChecked
  const isQueued = hasChecked && jobsAhead !== null && jobsAhead > 0
  const isGenerating = !isChecking && !isQueued
  const isGlassy = variant === 'glassy'

  return (
    <div
      className={cn(
        'w-full rounded-3xl border p-5 sm:p-6',
        isGlassy
          ? 'border-white/10 bg-white/5 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl'
          : 'border-border bg-card text-card-foreground shadow-sm',
        className
      )}
    >
      <div className="flex flex-col gap-4">
        {queuePaused && (
          <div
            className={cn(
              'flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm',
              isGlassy
                ? 'border-amber-400/25 bg-amber-500/10 text-amber-100'
                : 'border-amber-500/20 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100'
            )}
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('queue.paused')}</span>
          </div>
        )}

        <div className="flex flex-col gap-2 text-center sm:text-left">
          <h2 className={cn('text-2xl font-semibold', isGlassy ? 'font-display text-white' : 'text-foreground')}>
            {isChecking ? t('queue.checking') : isGenerating ? t('queue.generating') : t('deckview.queued')}
          </h2>
        </div>

        {isQueued && etaDuration && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className={cn(
                'rounded-2xl border px-4 py-4',
                isGlassy ? 'border-white/10 bg-black/20' : 'border-border/70 bg-muted/40'
              )}
            >
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <Rows3 className={cn('h-4 w-4', isGlassy ? 'text-[var(--pg-accent-teal)]' : 'text-primary')} />
                <span className={cn('text-xs uppercase tracking-[0.24em]', isGlassy ? 'text-white/45' : 'text-muted-foreground')}>
                  {t('queue.jobsAhead')}
                </span>
              </div>
              <div className={cn('mt-2 text-3xl font-semibold', isGlassy ? 'text-white' : 'text-foreground')}>
                {jobsAhead}
              </div>
            </div>

            <div
              className={cn(
                'rounded-2xl border px-4 py-4',
                isGlassy ? 'border-white/10 bg-black/20' : 'border-border/70 bg-muted/40'
              )}
            >
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                <Clock3 className={cn('h-4 w-4', isGlassy ? 'text-[var(--pg-accent-violet)]' : 'text-primary')} />
                <span className={cn('text-xs uppercase tracking-[0.24em]', isGlassy ? 'text-white/45' : 'text-muted-foreground')}>
                  {t('queue.estimated')}
                </span>
              </div>
              <div className={cn('mt-2 text-3xl font-semibold', isGlassy ? 'text-white' : 'text-foreground')}>
                ~{etaDuration}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
