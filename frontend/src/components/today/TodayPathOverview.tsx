import { CheckCircle2, Circle, Play } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  type GuidedLesson,
  type GuidedPathLessonCardStatus,
  type GuidedPathMetadata,
  type GuidedPathOverview,
} from '@/data/guidedLessons'
import { guidedVibes, type ActiveGuidedVibeId } from '@/data/guidedVibes'
import { getTodayLessonVibeStatus, type TodayProgressState } from '@/lib/todayProgress'
import { readGuidedSegmentReviewRecord, type GuidedSegmentReviewNumber } from '@/lib/guidedCheckpoint'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { CheckpointCard } from '@/components/today/CheckpointCard'
import { GuidedPathDirectory } from '@/components/today/GuidedPathDirectory'
import { GuidedVibePicker } from '@/components/today/TodayHero'
import { cn } from '@/lib/utils'

const GUIDED_SEGMENT_REVIEWS = [
  {
    segment: 1,
    start: 1,
    end: 5,
    labelKey: 'today.path.reviewOne',
    rangeKey: 'today.path.reviewOneRange',
  },
  {
    segment: 2,
    start: 6,
    end: 10,
    labelKey: 'today.path.reviewTwo',
    rangeKey: 'today.path.reviewTwoRange',
  },
] as const

type TodayPathOverviewProps = {
  overview: GuidedPathOverview
  pathOptions: GuidedPathMetadata[]
  selectedPathId: string
  progress: TodayProgressState
  selectedVibeId: ActiveGuidedVibeId
  checkpointCard?: {
    href: string
    completedPathCount: number
  }
  pathCheckHref: string
  onSelectPath: (pathId: string) => void
  onSelectVibe: (vibeId: ActiveGuidedVibeId) => void
  onSelectLesson: (lessonId: string) => void
  onStartLesson: () => void
}

export function TodayPathOverview({
  overview,
  pathOptions,
  selectedPathId,
  progress,
  selectedVibeId,
  checkpointCard,
  pathCheckHref,
  onSelectPath,
  onSelectVibe,
  onSelectLesson,
  onStartLesson,
}: TodayPathOverviewProps) {
  const { t } = useTranslation()
  const [directoryOpen, setDirectoryOpen] = useState(false)
  const pathLesson = overview.selectedLesson ?? overview.recommendedLesson ?? overview.lessons[0]?.lesson
  const isSelectedRecommendation = Boolean(
    pathLesson
      && overview.recommendedLesson
      && pathLesson.id === overview.recommendedLesson.id,
  )
  const hasExplicitLessonSelection = Boolean(
    pathLesson
      && overview.recommendedLesson
      && pathLesson.id !== overview.recommendedLesson.id,
  )

  return (
    <div className="grid gap-5">
      <section className="theme-panel rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6">
        <div className="today-path-header flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
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
          <div className="today-path-actions flex flex-wrap gap-2 xl:justify-end">
            <Button type="button" variant="outline" size="sm" onClick={() => setDirectoryOpen(true)}>
              {t('today.path.changePath')}
            </Button>
          </div>
          <GuidedPathDirectory
            open={directoryOpen}
            pathOptions={pathOptions}
            selectedPathId={selectedPathId}
            progress={progress}
            pathCheckHref={pathCheckHref}
            onSelectPath={onSelectPath}
            onClose={() => setDirectoryOpen(false)}
          />
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
          selectedVibeId={selectedVibeId}
          isSelectedRecommendation={isSelectedRecommendation}
          onStartLesson={onStartLesson}
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

        <div className="today-path-segments grid gap-3">
          {GUIDED_SEGMENT_REVIEWS.map((segment) => {
            const segmentLessons = overview.lessons.filter((entry) => (
              entry.lesson.lessonNumber >= segment.start && entry.lesson.lessonNumber <= segment.end
            ))
            const completedCount = segmentLessons.filter((entry) => (
              getTodayLessonVibeStatus(progress, entry.lesson, selectedVibeId) === 'completed'
            )).length
            const reviewRecord = readGuidedSegmentReviewRecord(
              selectedPathId,
              segment.segment,
              selectedVibeId,
            )

            return (
              <div key={segment.segment} className="grid gap-2">
                <div className="today-path-segmentGrid grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  {segmentLessons.map((entry) => (
                    <LessonPathCard
                      key={entry.lesson.id}
                      lesson={entry.lesson}
                      status={entry.status}
                      isRecommended={entry.isRecommended}
                      isSelected={entry.isSelected}
                      isRecommendationQuiet={hasExplicitLessonSelection && entry.isRecommended && !entry.isSelected}
                      completedVibeIds={entry.completedVibeIds}
                      selectedVibeId={selectedVibeId}
                      onSelectLesson={onSelectLesson}
                    />
                  ))}
                </div>
                <SegmentReviewTile
                  href={`/today/checkpoint?mode=segment-review&path=${selectedPathId}&segment=${segment.segment}&vibe=${selectedVibeId}`}
                  segment={segment.segment}
                  label={t(segment.labelKey)}
                  rangeLabel={t(segment.rangeKey)}
                  completedCount={completedCount}
                  selectedVibeId={selectedVibeId}
                  isReviewComplete={Boolean(reviewRecord)}
                />
              </div>
            )
          })}
          {checkpointCard && (
            <CheckpointCard
              href={checkpointCard.href}
              completedPathCount={checkpointCard.completedPathCount}
            />
          )}
        </div>
      </section>
    </div>
  )
}

function SegmentReviewTile({
  href,
  segment,
  label,
  rangeLabel,
  completedCount,
  selectedVibeId,
  isReviewComplete,
}: {
  href: string
  segment: GuidedSegmentReviewNumber
  label: string
  rangeLabel: string
  completedCount: number
  selectedVibeId: ActiveGuidedVibeId
  isReviewComplete: boolean
}) {
  const accessibleLabel = `${label}: ${rangeLabel}`
  const assetName = isReviewComplete ? `${selectedVibeId}-review-complete.webp` : `${selectedVibeId}-review.webp`

  return (
    <Link
      to={href}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className="today-segment-reviewTile flex min-w-0 items-center justify-center rounded-lg border px-3 py-4 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:px-5 sm:py-5"
      data-review-segment={segment}
      data-review-completed-count={completedCount}
      data-review-complete={isReviewComplete}
      data-review-strength={isReviewComplete ? 'complete' : completedCount > 0 ? 'partial' : 'fresh'}
    >
      <span className="sr-only">{accessibleLabel}</span>
      <img
        src={`/guided/reviews/${assetName}`}
        alt=""
        className="today-segment-reviewImage"
        draggable={false}
      />
    </Link>
  )
}

function RecommendedLessonPanel({
  lesson,
  progress,
  selectedVibeId,
  isSelectedRecommendation,
  onStartLesson,
}: {
  lesson: GuidedLesson
  progress: TodayProgressState
  selectedVibeId: ActiveGuidedVibeId
  isSelectedRecommendation: boolean
  onStartLesson: () => void
}) {
  const { t } = useTranslation()
  const visibleStatus = getTodayLessonVibeStatus(progress, lesson, selectedVibeId)

  return (
    <section className="today-recommended-panel theme-panel rounded-lg border border-[color-mix(in_srgb,var(--accent)_42%,var(--border-subtle))] p-4 sm:p-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <p className="sr-only">
            {isSelectedRecommendation ? t('today.path.nextLessonLabel') : t('today.path.selectedLessonLabel')}
          </p>
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            {t('today.lessonLabel', { sequence: lesson.lessonNumber })}
          </p>
          <h2 className="mt-2 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)]">
            {lesson.title}
          </h2>
        </div>
        <Button size="lg" onClick={onStartLesson}>
          {getActionLabel(t, visibleStatus)}
          {visibleStatus === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>
    </section>
  )
}

function LessonPathCard({
  lesson,
  status,
  isRecommended,
  isSelected,
  isRecommendationQuiet,
  completedVibeIds,
  selectedVibeId,
  onSelectLesson,
}: {
  lesson: GuidedLesson
  status: GuidedPathLessonCardStatus
  isRecommended: boolean
  isSelected: boolean
  isRecommendationQuiet: boolean
  completedVibeIds: ActiveGuidedVibeId[]
  selectedVibeId: ActiveGuidedVibeId
  onSelectLesson: (lessonId: string) => void
}) {
  const { t } = useTranslation()

  return (
    <button
      type="button"
      onClick={() => onSelectLesson(lesson.id)}
      aria-label={t('today.path.openLesson', {
        sequence: lesson.lessonNumber,
        title: lesson.title,
      })}
      className={cn(
        'today-path-card group flex min-h-32 min-w-0 flex-col rounded-lg border p-3 text-left transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        isSelected
          ? 'border-[color-mix(in_srgb,var(--accent)_64%,transparent)] bg-[var(--accent-soft)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_18%,transparent)]'
          : isRecommended && !isRecommendationQuiet
          ? 'border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[var(--accent-soft)]'
          : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_50%,transparent)]',
      )}
      data-recommended={isRecommended}
      data-recommended-quiet={isRecommendationQuiet}
      data-selected={isSelected}
      data-start-target={isSelected}
    >
      <div className="flex h-full items-start gap-3">
        <span className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-base font-semibold',
          status === 'complete' && completedVibeIds.length === 0
            ? 'border-[color-mix(in_srgb,#34d399_50%,transparent)] bg-[color-mix(in_srgb,#34d399_12%,transparent)] text-[#34d399]'
            : isSelected
              ? 'border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]'
              : isRecommended && !isRecommendationQuiet
                ? 'border-[color-mix(in_srgb,var(--today-accent)_34%,transparent)] bg-[color-mix(in_srgb,var(--today-accent-soft)_42%,transparent)] text-[var(--today-text-soft)]'
              : 'border-[var(--border-subtle)] text-[var(--text-muted)]',
        )}>
          <LessonNumberMarker lessonNumber={lesson.lessonNumber} selectedVibeId={selectedVibeId} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-5 items-center justify-end">
            <StatusIcon
              isStartTarget={isSelected}
              showCompletionFallback={status === 'complete' && completedVibeIds.length === 0}
            />
          </div>
          <h3 className="mt-1 break-words text-base font-semibold leading-snug text-[var(--text-primary)]">
            {lesson.title}
          </h3>
          <CompletedVibeBadges completedVibeIds={completedVibeIds} />
        </div>
      </div>
    </button>
  )
}

function LessonNumberMarker({
  lessonNumber,
  selectedVibeId,
}: {
  lessonNumber: number
  selectedVibeId: ActiveGuidedVibeId
}) {
  if (selectedVibeId === 'bright') {
    const paddedLessonNumber = String(lessonNumber).padStart(2, '0')

    return (
      <img
        src={`/guided/lesson-numbers/bright/${paddedLessonNumber}.webp`}
        alt=""
        className="today-path-cardNumberImage"
        draggable={false}
        data-lesson-number-asset="bright"
      />
    )
  }

  if (selectedVibeId === 'wistful' && lessonNumber >= 1 && lessonNumber <= 5) {
    const paddedLessonNumber = String(lessonNumber).padStart(2, '0')

    return (
      <img
        src={`/guided/lesson-numbers/wistful/${paddedLessonNumber}.webp`}
        alt=""
        className="today-path-cardNumberImage"
        draggable={false}
        data-lesson-number-asset="wistful"
      />
    )
  }

  if (selectedVibeId === 'sharp' && lessonNumber >= 1 && lessonNumber <= 5) {
    const paddedLessonNumber = String(lessonNumber).padStart(2, '0')

    return (
      <img
        src={`/guided/lesson-numbers/sharp/${paddedLessonNumber}.webp`}
        alt=""
        className="today-path-cardNumberImage"
        draggable={false}
        data-lesson-number-asset="sharp"
      />
    )
  }

  return <>{lessonNumber}</>
}

function CompletedVibeBadges({ completedVibeIds }: { completedVibeIds: ActiveGuidedVibeId[] }) {
  if (completedVibeIds.length === 0) return <span className="mt-auto block min-h-7" aria-hidden="true" />

  return (
    <span className="today-vibe-completionBadges mt-auto flex min-h-7 flex-wrap items-end gap-1 pt-3" aria-hidden="true">
      {completedVibeIds.map((vibeId) => {
        const vibe = guidedVibes[vibeId]

        return (
          <span
            key={vibeId}
            className="today-vibe-completionBadge"
            data-completed-vibe={vibeId}
            title={vibe.label}
          >
            {guidedVibes[vibeId].emblem?.url && (
              <img
                src={guidedVibes[vibeId].emblem?.url}
                alt=""
                className="today-vibe-completionBadgeImage"
                draggable={false}
              />
            )}
          </span>
        )
      })}
    </span>
  )
}

function StatusIcon({
  isStartTarget,
  showCompletionFallback,
}: {
  isStartTarget: boolean
  showCompletionFallback: boolean
}) {
  if (showCompletionFallback) {
    return <CheckCircle2 className="h-5 w-5 shrink-0 text-[#34d399]" />
  }

  if (isStartTarget) {
    return <Play className="h-5 w-5 shrink-0 text-[var(--accent)]" />
  }

  return <Circle className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />
}

function getActionLabel(
  t: ReturnType<typeof useTranslation>['t'],
  status: ReturnType<typeof getTodayLessonVibeStatus>,
) {
  if (status === 'completed') return t('today.path.replayLesson')
  if (status === 'skipped') return t('today.path.continueLesson')
  return t('today.path.startLesson')
}
