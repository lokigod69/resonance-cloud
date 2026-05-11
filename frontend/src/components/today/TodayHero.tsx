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
  isSessionActive: boolean
  onStart: () => void
  onSkip: () => void
  onRestart: () => void
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
      <figcaption className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
        {media.caption}
      </figcaption>
    </figure>
  )
}

export function TodayHero({
  lesson,
  status,
  isSessionActive,
  onStart,
  onSkip,
  onRestart,
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
              {lesson.situation.en}
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
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {terminalStatus ? (
              <Button size="lg" onClick={onRestart}>
                <RotateCcw className="h-4 w-4" />
                {t('today.restartLesson')}
              </Button>
            ) : (
              <Button size="lg" onClick={onStart} disabled={isSessionActive}>
                <Play className="h-4 w-4" />
                {isSessionActive ? t('today.lessonInProgress') : t('today.startLesson')}
              </Button>
            )}
            {status === 'new' && !isSessionActive && (
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
