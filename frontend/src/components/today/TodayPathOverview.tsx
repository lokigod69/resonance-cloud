import { CheckCircle2, Circle, Play, Route } from 'lucide-react'
import type { GuidedLesson, GuidedPathLessonCardStatus, GuidedPathOverview } from '@/data/guidedLessons'
import { guidedVibes, type ActiveGuidedVibeId } from '@/data/guidedVibes'
import { getTodayLessonStatus, type TodayProgressState } from '@/lib/todayProgress'
import { useTranslation } from '@/hooks/useTranslation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GuidedVibePicker } from '@/components/today/TodayHero'
import { cn } from '@/lib/utils'

type TodayPathOverviewProps = {
  overview: GuidedPathOverview
  progress: TodayProgressState
  selectedVibeId: ActiveGuidedVibeId
  onSelectVibe: (vibeId: ActiveGuidedVibeId) => void
  onOpenLesson: (lessonId: string) => void
}

export function TodayPathOverview({
  overview,
  progress,
  selectedVibeId,
  onSelectVibe,
  onOpenLesson,
}: TodayPathOverviewProps) {
  const { t } = useTranslation()
  const pathLesson = overview.recommendedLesson ?? overview.lessons[0]?.lesson

  return (
    <div className="grid gap-5">
      <section className="theme-panel rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              <Route className="h-4 w-4 text-[var(--accent)]" />
              {t('today.path.overviewLabel')}
            </p>
            <h1 className="mt-3 break-words text-3xl font-semibold leading-tight text-[var(--text-primary)] sm:text-4xl">
              {overview.pathMetadata?.title ?? 'English A1 Practical'}
            </h1>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {overview.pathMetadata && (
                <Badge variant="outline" className="border-[var(--border-subtle)] text-[var(--text-secondary)]">
                  {overview.pathMetadata.baseLanguage}{' -> '}{overview.pathMetadata.targetLanguage}
                </Badge>
              )}
              <Badge variant="outline" className="border-[var(--border-subtle)] text-[var(--text-secondary)]">
                {t('today.vibeIndicator', { vibe: guidedVibes[selectedVibeId].label })}
              </Badge>
              <Badge variant="outline" className="border-[var(--border-subtle)] text-[var(--text-secondary)]">
                {t('today.path.progress', {
                  completed: overview.completedCount,
                  total: overview.totalLessons,
                })}
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {pathLesson && (
        <GuidedVibePicker
          selectedVibeId={selectedVibeId}
          onSelectVibe={onSelectVibe}
          compact
        />
      )}

      {pathLesson && (
        <RecommendedLessonPanel
          lesson={pathLesson}
          progress={progress}
          isComplete={overview.isComplete}
          onOpenLesson={onOpenLesson}
        />
      )}

      <section className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {overview.totalLessons} lessons
            </p>
            <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
              English A1 Practical
            </h2>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {overview.lessons.map((entry) => (
            <LessonPathCard
              key={entry.lesson.id}
              lesson={entry.lesson}
              status={entry.status}
              isRecommended={entry.isRecommended}
              onOpenLesson={onOpenLesson}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function RecommendedLessonPanel({
  lesson,
  progress,
  isComplete,
  onOpenLesson,
}: {
  lesson: GuidedLesson
  progress: TodayProgressState
  isComplete: boolean
  onOpenLesson: (lessonId: string) => void
}) {
  const { t } = useTranslation()
  const visibleStatus = getTodayLessonStatus(progress, lesson)

  return (
    <section className="theme-panel rounded-lg border border-[color-mix(in_srgb,var(--accent)_42%,var(--border-subtle))] p-4 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
            {isComplete ? t('today.path.completeLabel') : t('today.path.recommendedLabel')}
          </p>
          <h2 className="mt-2 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)]">
            {isComplete
              ? t('today.path.completeTitle')
              : t('today.compactLessonTitle', {
                sequence: lesson.lessonNumber,
                title: lesson.title,
              })}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
            {isComplete ? t('today.path.completeBody') : lesson.situation.de}
          </p>
        </div>
        <Button size="lg" onClick={() => onOpenLesson(lesson.id)}>
          {getActionLabel(t, visibleStatus, isComplete)}
          {visibleStatus === 'completed' || isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>
    </section>
  )
}

function LessonPathCard({
  lesson,
  status,
  isRecommended,
  onOpenLesson,
}: {
  lesson: GuidedLesson
  status: GuidedPathLessonCardStatus
  isRecommended: boolean
  onOpenLesson: (lessonId: string) => void
}) {
  const { t } = useTranslation()

  return (
    <article
      className={cn(
        'min-w-0 rounded-lg border p-3 transition',
        isRecommended
          ? 'border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[var(--accent-soft)]'
          : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_50%,transparent)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {t('today.lessonLabel', { sequence: lesson.lessonNumber })}
          </p>
          <h3 className="mt-1 break-words text-base font-semibold leading-snug text-[var(--text-primary)]">
            {lesson.title}
          </h3>
        </div>
        <StatusIcon status={status} />
      </div>
      <p className="mt-3 line-clamp-2 break-words text-sm leading-5 text-[var(--text-secondary)]">
        {lesson.situation.de}
      </p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className={cn(
          'rounded-full border px-2.5 py-1 text-xs font-medium',
          status === 'complete'
            ? 'border-[color-mix(in_srgb,#34d399_44%,transparent)] text-[#34d399]'
            : isRecommended
              ? 'border-[color-mix(in_srgb,var(--accent)_46%,transparent)] text-[var(--accent)]'
              : 'border-[var(--border-subtle)] text-[var(--text-muted)]',
        )}>
          {getStatusLabel(t, status)}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onOpenLesson(lesson.id)}
          aria-label={t('today.path.openLesson', {
            sequence: lesson.lessonNumber,
            title: lesson.title,
          })}
        >
          {getCardActionLabel(t, status)}
        </Button>
      </div>
    </article>
  )
}

function StatusIcon({ status }: { status: GuidedPathLessonCardStatus }) {
  if (status === 'complete') {
    return <CheckCircle2 className="h-5 w-5 shrink-0 text-[#34d399]" />
  }

  if (status === 'current') {
    return <Play className="h-5 w-5 shrink-0 text-[var(--accent)]" />
  }

  return <Circle className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />
}

function getStatusLabel(t: ReturnType<typeof useTranslation>['t'], status: GuidedPathLessonCardStatus) {
  if (status === 'complete') return t('today.path.status.complete')
  if (status === 'current') return t('today.path.status.current')
  return t('today.path.status.notStarted')
}

function getActionLabel(
  t: ReturnType<typeof useTranslation>['t'],
  status: ReturnType<typeof getTodayLessonStatus>,
  isPathComplete: boolean,
) {
  if (status === 'completed' || isPathComplete) return t('today.path.replayLesson')
  if (status === 'skipped') return t('today.path.continueLesson')
  return t('today.path.startLesson')
}

function getCardActionLabel(t: ReturnType<typeof useTranslation>['t'], status: GuidedPathLessonCardStatus) {
  if (status === 'complete') return t('today.path.replayLesson')
  return t('today.path.openLessonAction')
}
