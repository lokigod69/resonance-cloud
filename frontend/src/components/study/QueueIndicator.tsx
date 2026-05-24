import { useTranslation } from '@/hooks/useTranslation'

type QueueIndicatorProps = {
  queue: 'review' | 'learn' | 'strengthen' | 'mastered'
  count: number
  language: string
}

export function QueueIndicator({ queue, count, language }: QueueIndicatorProps) {
  const { t } = useTranslation()
  const label = t(`study.queue.${queue}`)
  const text = t('study.queue.header', { label, count })
  const languageLabel = language ? t(`langName.${language}`) : ''

  return (
    <div
      aria-label={languageLabel ? `${text} (${languageLabel})` : text}
      className="mx-auto mb-4 flex w-fit max-w-full items-center justify-center rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur"
    >
      {text}
    </div>
  )
}
