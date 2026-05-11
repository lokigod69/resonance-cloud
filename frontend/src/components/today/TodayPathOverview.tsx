import { CheckCircle2, Circle, Play } from 'lucide-react'
import type { GuidedLesson, GuidedPathLessonCardStatus, GuidedPathOverview } from '@/data/guidedLessons'
import { guidedVibes, type ActiveGuidedVibeId } from '@/data/guidedVibes'
import { getTodayLessonStatus, type TodayProgressState } from '@/lib/todayProgress'
import { useTranslation } from '@/hooks/useTranslation'
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
            <h1 className="break-words text-3xl font-semibold leading-tight text-[var(--text-primary)] sm:text-4xl">
              {overview.pathMetadata?.title ?? 'English A1 Practical'}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-secondary)]">
              {overview.pathMetadata && (
                <span>
                  {overview.pathMetadata.baseLanguage}{' -> '}{overview.pathMetadata.targetLanguage}
                </span>
              )}
              <span>
                {guidedVibes[selectedVibeId].label}
              </span>
              <span className="text-xs text-[var(--text-muted)]">
                {t('today.path.progress', {
                  completed: overview.completedCount,
                  total: overview.totalLessons,
                })}
              </span>
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
            <p className="sr-only">
              {t('today.path.yourPath')}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
            {isComplete ? t('today.path.completeLabel') : t('today.path.nextLessonLabel')}
          </p>
          <h2 className="mt-2 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)]">
            {isComplete
              ? t('today.path.completeTitle')
              : t('today.compactLessonTitle', {
                sequence: lesson.lessonNumber,
                title: lesson.title,
              })}
          </h2>
          {isComplete && (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
              {t('today.path.completeBody')}
            </p>
          )}
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
    <button
      type="button"
      onClick={() => onOpenLesson(lesson.id)}
      aria-label={t('today.path.openLesson', {
        sequence: lesson.lessonNumber,
        title: lesson.title,
      })}
      className={cn(
        'group min-w-0 rounded-lg border p-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        isRecommended
          ? 'border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[var(--accent-soft)]'
          : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_50%,transparent)]',
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base font-semibold',
          status === 'complete'
            ? 'border-[color-mix(in_srgb,#34d399_50%,transparent)] bg-[color-mix(in_srgb,#34d399_12%,transparent)] text-[#34d399]'
            : isRecommended
              ? 'border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]'
              : 'border-[var(--border-subtle)] text-[var(--text-muted)]',
        )}>
          {lesson.lessonNumber}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-h-5 items-center justify-end">
            <StatusIcon status={status} />
          </div>
          <h3 className="mt-1 break-words text-base font-semibold leading-snug text-[var(--text-primary)]">
            {lesson.title}
          </h3>
        </div>
      </div>
    </button>
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

function getActionLabel(
  t: ReturnType<typeof useTranslation>['t'],
  status: ReturnType<typeof getTodayLessonStatus>,
  isPathComplete: boolean,
) {
  if (status === 'completed' || isPathComplete) return t('today.path.replayLesson')
  if (status === 'skipped') return t('today.path.continueLesson')
  return t('today.path.startLesson')
}
