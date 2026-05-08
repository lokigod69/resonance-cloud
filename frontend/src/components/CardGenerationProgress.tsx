import { CheckCircle2, Clock3, Loader2, XCircle } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { CardGenerationProgressSummary } from '@/lib/cardGenerationProgress'
import { cn } from '@/lib/utils'

export type CardGenerationProgressProps = {
  summary: CardGenerationProgressSummary
  className?: string
  variant?: 'classic' | 'glassy'
}

const ITEMS = [
  { key: 'complete', labelKey: 'status.complete.short', icon: CheckCircle2, className: 'text-emerald-400' },
  { key: 'processing', labelKey: 'status.processing.short', icon: Loader2, className: 'text-[var(--pg-accent-teal,var(--primary))]' },
  { key: 'queued', labelKey: 'status.queued.short', icon: Clock3, className: 'text-muted-foreground' },
  { key: 'failed', labelKey: 'status.failed.short', icon: XCircle, className: 'text-destructive' },
] as const

export default function CardGenerationProgress({
  summary,
  className,
  variant = 'classic',
}: CardGenerationProgressProps) {
  const { t } = useTranslation()
  const isGlassy = variant === 'glassy'

  return (
    <div
      className={cn(
        'w-full rounded-2xl border border-border bg-card/80 p-4 text-card-foreground shadow-sm',
        isGlassy && 'bg-black/30 backdrop-blur-md',
        className,
      )}
      aria-label={t('cardGenerationProgress.ariaLabel')}
    >
      <div className="flex flex-col gap-3">
        <div className="text-center sm:text-left">
          <h2 className={cn('text-lg font-semibold text-foreground', isGlassy && 'font-display')}>
            {t('cardGenerationProgress.title')}
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ITEMS.map(({ key, labelKey, icon: Icon, className: iconClassName }) => (
            <div key={key} className="rounded-xl border border-border/70 bg-muted/35 px-3 py-3">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4 shrink-0', key === 'processing' && summary.processing > 0 && 'animate-spin', iconClassName)} />
                <span className="min-w-0 text-xs text-muted-foreground">{t(labelKey)}</span>
              </div>
              <div className="mt-1 text-xl font-semibold text-foreground">
                {summary[key]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
