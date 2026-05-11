import { CalendarDays, CheckCircle2, Clock3, Play, RotateCcw, SkipForward, Sparkles } from 'lucide-react'
import type { GuidedLesson, GuidedLessonMedia } from '@/data/guidedLessons'
import type { TodayVisibleStatus } from '@/lib/todayProgress'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type TodayHeroProps = {
  lesson: GuidedLesson
  status: TodayVisibleStatus
  knownItemIds: Set<string>
  onStart: () => void
  onSkip: () => void
  onRestart: () => void
  onToggleKnownItem: (itemId: string) => void
}

type LessonMediaFrameProps = {
  media: GuidedLessonMedia
  className?: string
}

export function LessonMediaFrame({ media, className }: LessonMediaFrameProps) {
  const { t } = useTranslation()
  const mediaUrl = media.url.trim()
  const posterUrl = media.posterUrl?.trim()
  const canRenderVideo = (media.type === 'video' || media.type === 'music_video') && mediaUrl.length > 0
  const canRenderImage = media.type === 'image' && mediaUrl.length > 0
  const isPlaceholder = !canRenderVideo && !canRenderImage

  return (
    <figure className={cn('min-w-0', className)}>
      <div className="theme-panel relative aspect-video min-h-[220px] overflow-hidden rounded-lg border border-[var(--border-subtle)]">
        {canRenderVideo ? (
          <video
            className="h-full w-full object-cover"
            src={mediaUrl}
            poster={posterUrl || undefined}
            controls
            playsInline
            preload="metadata"
          />
        ) : canRenderImage ? (
          <img className="h-full w-full object-cover" src={mediaUrl} alt={media.caption} />
        ) : (
          <div
            className="flex h-full min-h-[220px] flex-col justify-end p-5 sm:p-6"
            style={{
              background:
                'radial-gradient(ellipse at 20% 20%, var(--accent-glow), transparent 34%), radial-gradient(ellipse at 80% 14%, var(--accent-2-soft), transparent 34%), linear-gradient(135deg, color-mix(in srgb, var(--surface-2) 80%, transparent), color-mix(in srgb, var(--app-bg) 92%, transparent))',
            }}
          >
            <div className="mb-auto flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" />
              {t('today.media.placeholderLabel')}
            </div>
            <div className="max-w-xl">
              <p className="text-xl font-semibold leading-snug text-[var(--text-primary)] sm:text-2xl">
                {t('today.media.placeholderTitle')}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {media.caption}
              </p>
            </div>
          </div>
        )}
      </div>
      {!isPlaceholder && (
        <figcaption className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
          {media.caption}
        </figcaption>
      )}
    </figure>
  )
}

export function TodayHero({
  lesson,
  status,
  knownItemIds,
  onStart,
  onSkip,
  onRestart,
  onToggleKnownItem,
}: TodayHeroProps) {
  const { t } = useTranslation()
  const terminalStatus = status === 'completed' || status === 'skipped'

  return (
    <section className="theme-panel relative overflow-hidden rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6 lg:p-7">
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background:
            'radial-gradient(ellipse at 12% 0%, var(--accent-glow), transparent 38%), radial-gradient(ellipse at 92% 18%, var(--accent-2-soft), transparent 36%)',
        }}
        aria-hidden="true"
      />

      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.88fr)] lg:items-stretch">
        <div className="flex min-w-0 flex-col justify-between gap-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--text-primary)]">
                {lesson.pathMetadata.title}
              </Badge>
              <Badge variant="outline" className="border-[var(--border-subtle)] text-[var(--text-secondary)]">
                {lesson.pathMetadata.baseLanguage}{' -> '}{lesson.pathMetadata.targetLanguage}
              </Badge>
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Clock3 className="h-3.5 w-3.5" />
                {t('today.estimatedTime', { minutes: lesson.pathMetadata.estimatedMinutes })}
              </span>
            </div>

            <p className="mt-5 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <CalendarDays className="h-4 w-4 text-[var(--accent)]" />
              {t('today.lessonLabel', { sequence: lesson.lessonMetadata.sequence })}
            </p>
            <h1 className="mt-3 break-words text-3xl font-semibold leading-tight tracking-normal text-[var(--text-primary)] sm:text-4xl">
              {lesson.lessonMetadata.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
              {lesson.situation.de}
            </p>

            <div className="mt-6 grid gap-3 rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_58%,transparent)] p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {t('today.corePhrase')}
              </p>
              <p className="break-words text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-3xl">
                {lesson.corePhrase.targetText}
              </p>
              <p className="break-words text-sm leading-6 text-[var(--text-secondary)]">
                {lesson.corePhrase.baseText}
              </p>
            </div>

            <div className="mt-5 rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_42%,transparent)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                    {t('today.itemsPreview.title')}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                    {t('today.itemsPreview.subtitle')}
                  </p>
                </div>
                {knownItemIds.size > 0 && (
                  <span className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-muted)]">
                    {t('today.itemsPreview.knownCount', { count: knownItemIds.size })}
                  </span>
                )}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {lesson.lessonItems.map((item) => {
                  const isKnown = knownItemIds.has(item.id)
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2',
                        isKnown
                          ? 'border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[var(--accent-soft)]'
                          : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--app-bg)_16%,transparent)]',
                      )}
                    >
                      <div className="min-w-0 text-sm leading-6">
                        <span className="font-semibold text-[var(--text-primary)]">{item.targetText}</span>
                        <span className="px-2 text-[var(--text-muted)]">—</span>
                        <span className="text-[var(--text-secondary)]">{item.baseText}</span>
                      </div>
                      <Button
                        type="button"
                        variant={isKnown ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => onToggleKnownItem(item.id)}
                        className="h-8 rounded-full px-2.5 text-xs"
                        aria-pressed={isKnown}
                      >
                        {isKnown && <CheckCircle2 className="h-4 w-4" />}
                        {t('today.itemsPreview.knowThis')}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {terminalStatus ? (
              <Button size="lg" onClick={onRestart}>
                <RotateCcw className="h-4 w-4" />
                {t('today.restartLesson')}
              </Button>
            ) : (
              <Button size="lg" onClick={onStart}>
                <Play className="h-4 w-4" />
                {t('today.startLesson')}
              </Button>
            )}
            {status === 'new' && (
              <Button size="lg" variant="outline" onClick={onSkip}>
                <SkipForward className="h-4 w-4" />
                {t('today.skipLesson')}
              </Button>
            )}
            {status === 'completed' && (
              <span className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
                {t('today.completedBadge')}
              </span>
            )}
            {status === 'skipped' && (
              <span className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <SkipForward className="h-4 w-4 text-[var(--accent)]" />
                {t('today.skippedBadge')}
              </span>
            )}
          </div>
        </div>

        <LessonMediaFrame media={lesson.lessonMedia} className="lg:self-center" />
      </div>
    </section>
  )
}

export function TodayCompactHeader({ lesson }: { lesson: GuidedLesson }) {
  const { t } = useTranslation()

  return (
    <section className="theme-panel rounded-lg border border-[var(--border-subtle)] p-4 sm:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-[var(--border-strong)] bg-[var(--accent-soft)] text-[var(--text-primary)]">
              {lesson.pathMetadata.title}
            </Badge>
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {lesson.pathMetadata.baseLanguage}{' -> '}{lesson.pathMetadata.targetLanguage}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Clock3 className="h-3.5 w-3.5" />
              {t('today.estimatedTime', { minutes: lesson.pathMetadata.estimatedMinutes })}
            </span>
          </div>
          <h1 className="mt-3 break-words text-xl font-semibold text-[var(--text-primary)]">
            {t('today.compactLessonTitle', {
              sequence: lesson.lessonMetadata.sequence,
              title: lesson.lessonMetadata.title,
            })}
          </h1>
        </div>
        <p className="max-w-md break-words text-sm leading-6 text-[var(--text-secondary)] md:text-right">
          {lesson.corePhrase.targetText}
        </p>
      </div>
    </section>
  )
}
