import { CalendarDays, Check, CheckCircle2, Circle, Clock3, Play, RotateCcw, SkipForward, Sparkles } from 'lucide-react'
import type { GuidedLesson, GuidedLessonMedia } from '@/data/guidedLessons'
import { ACTIVE_GUIDED_VIBE_IDS, guidedVibes, type ActiveGuidedVibeId } from '@/data/guidedVibes'
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
  selectedVibeId: ActiveGuidedVibeId
  onSelectVibe: (vibeId: ActiveGuidedVibeId) => void
}

type LessonMediaFrameProps = {
  media: GuidedLessonMedia
  className?: string
  mode?: 'preview' | 'playback'
  showCaption?: boolean
}

const vibeSwatches: Record<ActiveGuidedVibeId, string[]> = {
  bright: ['#facc15', '#22c55e', '#38bdf8'],
  wistful: ['#94a3b8', '#60a5fa', '#c084fc'],
  sharp: ['#f8fafc', '#ef4444', '#111827'],
}

export function LessonMediaFrame({
  media,
  className,
  mode = 'playback',
  showCaption = false,
}: LessonMediaFrameProps) {
  const { t } = useTranslation()
  const mediaUrl = media.url.trim()
  const posterUrl = media.posterUrl?.trim()
  const canRenderVideo = (media.type === 'video' || media.type === 'music_video') && mediaUrl.length > 0
  const canRenderImage = media.type === 'image' && mediaUrl.length > 0
  const isPlaceholder = !canRenderVideo && !canRenderImage
  const shouldRenderPreview = mode === 'preview'

  return (
    <figure className={cn('min-w-0', className)}>
      <div className="theme-panel relative aspect-video min-h-[220px] overflow-hidden rounded-lg border border-[var(--border-subtle)]">
        {shouldRenderPreview ? (
          <div className="relative h-full min-h-[220px] overflow-hidden">
            {canRenderVideo ? (
              <video
                className="h-full w-full object-cover opacity-80 saturate-[0.92]"
                src={mediaUrl}
                poster={posterUrl || undefined}
                muted
                playsInline
                preload="metadata"
                tabIndex={-1}
                aria-hidden="true"
              />
            ) : canRenderImage ? (
              <img className="h-full w-full object-cover opacity-80 saturate-[0.92]" src={mediaUrl} alt="" aria-hidden="true" />
            ) : (
              <div
                className="h-full min-h-[220px]"
                style={{
                  background:
                    'radial-gradient(ellipse at 18% 16%, var(--accent-glow), transparent 34%), radial-gradient(ellipse at 82% 18%, var(--accent-2-soft), transparent 34%), linear-gradient(135deg, color-mix(in srgb, var(--surface-2) 82%, transparent), color-mix(in srgb, var(--app-bg) 94%, transparent))',
                }}
              />
            )}
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, color-mix(in srgb, var(--app-bg) 24%, transparent), color-mix(in srgb, var(--app-bg) 78%, transparent)), radial-gradient(ellipse at 18% 16%, var(--accent-glow), transparent 44%)',
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-muted)]">
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                {t('today.media.previewLabel')}
              </div>
              <div className="max-w-xl">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_72%,transparent)] text-[var(--text-primary)]">
                  <Play className="h-4 w-4" />
                </div>
                <p className="text-lg font-semibold leading-snug text-[var(--text-primary)] sm:text-xl">
                  {t('today.media.previewHint')}
                </p>
              </div>
            </div>
          </div>
        ) : canRenderVideo ? (
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
      {showCaption && !isPlaceholder && (
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
  selectedVibeId,
  onSelectVibe,
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
              <Badge variant="outline" className="border-[var(--border-subtle)] text-[var(--text-secondary)]">
                {t('today.vibeIndicator', { vibe: guidedVibes[lesson.vibeId].label })}
              </Badge>
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

              <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--app-bg)_14%,transparent)]">
                <div className="hidden grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_2.25rem] gap-3 border-b border-[var(--border-subtle)] px-3 py-2 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)] sm:grid">
                  <span>{t('today.itemsPreview.english')}</span>
                  <span>{t('today.itemsPreview.german')}</span>
                  <span className="sr-only">{t('today.itemsPreview.toggle')}</span>
                </div>
                {lesson.lessonItems.map((item) => {
                  const isKnown = knownItemIds.has(item.id)
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 border-b border-[var(--border-subtle)] px-3 py-2 last:border-b-0 sm:grid-cols-[minmax(8rem,1fr)_minmax(8rem,1fr)_2.25rem] sm:items-center',
                        isKnown && 'bg-[color-mix(in_srgb,var(--accent-soft)_54%,transparent)] opacity-70',
                      )}
                    >
                      <span
                        className={cn(
                          'min-w-0 text-sm font-semibold leading-6 text-[var(--text-primary)]',
                          isKnown && 'line-through decoration-[var(--text-muted)] decoration-1',
                        )}
                      >
                        {item.targetText}
                      </span>
                      <span
                        className={cn(
                          'min-w-0 text-sm leading-6 text-[var(--text-secondary)]',
                          isKnown && 'line-through decoration-[var(--text-muted)] decoration-1',
                        )}
                      >
                        {item.baseText}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleKnownItem(item.id)}
                        className={cn(
                          'col-start-2 row-span-2 row-start-1 flex h-8 w-8 items-center justify-center rounded-full border transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:col-start-3 sm:row-span-1 sm:row-start-auto',
                          isKnown
                            ? 'border-[color-mix(in_srgb,var(--accent)_52%,transparent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                            : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                        )}
                        aria-pressed={isKnown}
                        aria-label={t(isKnown ? 'today.itemsPreview.unmarkKnown' : 'today.itemsPreview.markKnown', {
                          item: item.targetText,
                        })}
                      >
                        {isKnown ? <Check className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            <GuidedVibePicker
              lesson={lesson}
              selectedVibeId={selectedVibeId}
              onSelectVibe={onSelectVibe}
            />
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

        <LessonMediaFrame media={lesson.lessonMedia} mode="preview" className="lg:self-center" />
      </div>
    </section>
  )
}

export function GuidedVibePicker({
  lesson,
  selectedVibeId,
  onSelectVibe,
  compact = false,
}: {
  lesson: GuidedLesson
  selectedVibeId: ActiveGuidedVibeId
  onSelectVibe: (vibeId: ActiveGuidedVibeId) => void
  compact?: boolean
}) {
  const { t } = useTranslation()

  return (
    <section
      className={cn(
        'mt-5 rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_42%,transparent)] p-4',
        compact && 'bg-[color-mix(in_srgb,var(--surface-1)_32%,transparent)]',
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {t('today.vibePicker.title')}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {t('today.vibePicker.subtitle')}
          </p>
        </div>
        <span className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-muted)]">
          {t('today.vibeIndicator', { vibe: guidedVibes[selectedVibeId].label })}
        </span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {ACTIVE_GUIDED_VIBE_IDS.map((vibeId) => {
          const vibe = guidedVibes[vibeId]
          const variant = lesson.vibeVariants[vibeId]
          const isSelected = selectedVibeId === vibeId

          return (
            <button
              key={vibeId}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectVibe(vibeId)}
              className={cn(
                'min-w-0 rounded-lg border p-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                isSelected
                  ? 'border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[var(--accent-soft)]'
                  : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--app-bg)_16%,transparent)]',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{vibe.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
              </div>
              <div className="mt-2 flex gap-1.5" aria-hidden="true">
                {vibeSwatches[vibeId].map((color) => (
                  <span
                    key={color}
                    className="h-2.5 w-7 rounded-full border border-[color-mix(in_srgb,var(--text-primary)_18%,transparent)]"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <p className="mt-3 text-sm leading-5 text-[var(--text-secondary)]">
                {vibe.shortDescription}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {t('today.vibePicker.exampleLabel')}
              </p>
              <p className="mt-1 break-words text-sm font-semibold leading-5 text-[var(--text-primary)]">
                {variant?.corePhrase.targetText}
              </p>
            </button>
          )
        })}
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
            <span className="text-xs font-medium text-[var(--text-muted)]">
              {t('today.vibeIndicator', { vibe: guidedVibes[lesson.vibeId].label })}
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
