import { Play, Settings } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  resolveGuidedBaseContent,
  type GuidedLesson,
  type GuidedPathLessonCardStatus,
  type GuidedPathMetadata,
  type GuidedPathOverview,
  type GuidedTargetLanguage,
} from '@/data/guidedLessons'
import { guidedVibes, type ActiveGuidedVibeId } from '@/data/guidedVibes'
import { getTodayLessonVibeStatus, type TodayProgressState } from '@/lib/todayProgress'
import { readGuidedSegmentReviewRecord, type GuidedSegmentReviewNumber } from '@/lib/guidedCheckpoint'
import { formatGuidedPathLabel } from '@/lib/guidedPathLabels'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { CheckpointCard } from '@/components/today/CheckpointCard'
import { GuidedPathDirectory } from '@/components/today/GuidedPathDirectory'
import { SegmentTrophyTile } from '@/components/today/SegmentTrophyTile'
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
  selectedLanguage: GuidedTargetLanguage
  availableLanguages: GuidedTargetLanguage[]
  checkpointCard?: {
    href: string
    completedPathCount: number
  }
  pathCheckHref: string
  onSelectPath: (pathId: string) => void
  onSelectVibe: (vibeId: ActiveGuidedVibeId) => void
  onSelectLanguage: (language: GuidedTargetLanguage) => void
  onSelectLesson: (lessonId: string) => void
  onStartLesson: (lessonId?: string) => void
}

export function TodayPathOverview({
  overview,
  pathOptions,
  selectedPathId,
  progress,
  selectedVibeId,
  selectedLanguage,
  availableLanguages,
  checkpointCard,
  pathCheckHref,
  onSelectPath,
  onSelectVibe,
  onSelectLanguage,
  onSelectLesson,
  onStartLesson,
}: TodayPathOverviewProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const preferredBaseLanguage = profile?.base_language
  const [directoryOpen, setDirectoryOpen] = useState(false)
  const pathLesson = overview.recommendedLesson ?? overview.selectedLesson ?? overview.lessons[0]?.lesson
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
      <section className="theme-panel rounded-lg border border-[var(--border-subtle)] p-3 sm:p-5">
        <div className="today-path-header flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-4xl">
              {formatGuidedPathLabel(overview.pathMetadata, t)}
            </h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {t('today.path.compactProgress', {
                completed: overview.completedCount,
                total: overview.totalLessons,
              })}
            </p>
          </div>
          <div className="today-path-actions flex shrink-0 flex-wrap gap-2 xl:justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t('today.path.changePath')}
              title={t('today.path.changePath')}
              onClick={() => setDirectoryOpen(true)}
            >
              <Settings className="h-5 w-5" aria-hidden="true" />
            </Button>
          </div>
          <GuidedPathDirectory
            open={directoryOpen}
            pathOptions={pathOptions}
            selectedPathId={selectedPathId}
            progress={progress}
            pathCheckHref={pathCheckHref}
            selectedLanguage={selectedLanguage}
            availableLanguages={availableLanguages}
            selectedVibeId={selectedVibeId}
            onSelectPath={onSelectPath}
            onSelectLanguage={onSelectLanguage}
            onSelectVibe={onSelectVibe}
            onClose={() => setDirectoryOpen(false)}
          />
        </div>
      </section>

      {pathLesson && (
        <RecommendedLessonPanel
          lesson={pathLesson}
          preferredBaseLanguage={preferredBaseLanguage}
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
                <div className="today-path-segmentGrid grid grid-cols-5 gap-2">
                  {segmentLessons.map((entry) => (
                    <LessonPathCard
                      key={entry.lesson.id}
                      lesson={entry.lesson}
                      preferredBaseLanguage={preferredBaseLanguage}
                      status={entry.status}
                      isRecommended={entry.isRecommended}
                      isSelected={entry.isSelected}
                      isRecommendationQuiet={hasExplicitLessonSelection && entry.isRecommended && !entry.isSelected}
                      completedVibeIds={entry.completedVibeIds}
                      selectedVibeId={selectedVibeId}
                      onSelectLesson={onSelectLesson}
                      onStartLesson={onStartLesson}
                    />
                  ))}
                </div>
                <div className="today-path-reviewPair grid grid-cols-2 gap-2">
                  <SegmentReviewTile
                    href={`/today/checkpoint?mode=segment-review&path=${selectedPathId}&segment=${segment.segment}&vibe=${selectedVibeId}`}
                    segment={segment.segment}
                    label={t(segment.labelKey)}
                    rangeLabel={t(segment.rangeKey)}
                    completedCount={completedCount}
                    selectedVibeId={selectedVibeId}
                    isReviewComplete={Boolean(reviewRecord)}
                  />
                  <SegmentTrophyTile
                    pathId={selectedPathId}
                    segment={segment.segment}
                    vibeId={selectedVibeId}
                  />
                </div>
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
      className="today-segment-reviewTile flex min-w-0 items-center justify-center rounded-lg border px-2 py-2 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:px-4 sm:py-3"
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
  preferredBaseLanguage,
  isSelectedRecommendation,
  onStartLesson,
}: {
  lesson: GuidedLesson
  preferredBaseLanguage?: string | null
  isSelectedRecommendation: boolean
  onStartLesson: (lessonId?: string) => void
}) {
  const { t } = useTranslation()
  const title = resolveGuidedBaseContent(lesson.title, {
    preferredBaseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text

  return (
    <section className="today-recommended-panel theme-panel rounded-lg border border-[color-mix(in_srgb,var(--accent)_42%,var(--border-subtle))] p-3 sm:p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="sr-only">
            {isSelectedRecommendation ? t('today.path.nextLessonLabel') : t('today.path.selectedLessonLabel')}
          </p>
          <p className="text-xs font-medium text-[var(--text-secondary)] sm:text-sm">
            {t('today.lessonLabel', { sequence: lesson.lessonNumber })}
          </p>
          <h2 className="mt-1 break-words text-lg font-semibold leading-tight text-[var(--text-primary)] sm:text-2xl">
            {title}
          </h2>
        </div>
        <Button size="lg" onClick={() => onStartLesson(lesson.id)}>
          {t('today.nextLesson')}
          <Play className="h-4 w-4" />
        </Button>
      </div>
    </section>
  )
}

function LessonPathCard({
  lesson,
  preferredBaseLanguage,
  status,
  isRecommended,
  isSelected,
  isRecommendationQuiet,
  completedVibeIds,
  selectedVibeId,
  onSelectLesson,
  onStartLesson,
}: {
  lesson: GuidedLesson
  preferredBaseLanguage?: string | null
  status: GuidedPathLessonCardStatus
  isRecommended: boolean
  isSelected: boolean
  isRecommendationQuiet: boolean
  completedVibeIds: ActiveGuidedVibeId[]
  selectedVibeId: ActiveGuidedVibeId
  onSelectLesson: (lessonId: string) => void
  onStartLesson: (lessonId?: string) => void
}) {
  const { t } = useTranslation()
  const completedSelectedVibe = completedVibeIds.includes(selectedVibeId)
  const title = resolveGuidedBaseContent(lesson.title, {
    preferredBaseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text

  const handleLessonTap = () => {
    onSelectLesson(lesson.id)
    onStartLesson(lesson.id)
  }

  return (
    <button
      type="button"
      onClick={handleLessonTap}
      aria-label={t('today.path.openLesson', {
        sequence: lesson.lessonNumber,
        title,
      })}
      className={cn(
        'today-path-card group flex min-w-0 items-center justify-center rounded-lg border p-1 text-center transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        isSelected
          ? 'border-[color-mix(in_srgb,var(--accent)_64%,transparent)] bg-[var(--accent-soft)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent)_18%,transparent)]'
          : isRecommended && !isRecommendationQuiet
          ? 'border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[var(--accent-soft)]'
          : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_50%,transparent)]',
      )}
      data-lesson-status={status}
      data-recommended={isRecommended}
      data-recommended-quiet={isRecommendationQuiet}
      data-selected={isSelected}
      data-start-target={isSelected}
      data-completed-selected-vibe={completedSelectedVibe}
    >
      <span className="today-path-cardMarker" aria-hidden="true">
        <LessonCellMarker
          lessonNumber={lesson.lessonNumber}
          selectedVibeId={selectedVibeId}
          completedSelectedVibe={completedSelectedVibe}
        />
      </span>
      <span className="sr-only">
        {t('today.compactLessonTitle', {
          sequence: lesson.lessonNumber,
          title,
        })}
      </span>
    </button>
  )
}

function LessonCellMarker({
  lessonNumber,
  selectedVibeId,
  completedSelectedVibe,
}: {
  lessonNumber: number
  selectedVibeId: ActiveGuidedVibeId
  completedSelectedVibe: boolean
}) {
  if (completedSelectedVibe) {
    return <CompletedLessonMarker lessonNumber={lessonNumber} selectedVibeId={selectedVibeId} />
  }

  return <LessonNumberMarker lessonNumber={lessonNumber} selectedVibeId={selectedVibeId} />
}

function CompletedLessonMarker({
  lessonNumber,
  selectedVibeId,
}: {
  lessonNumber: number
  selectedVibeId: ActiveGuidedVibeId
}) {
  const emblemUrl = guidedVibes[selectedVibeId].emblem?.url

  if (!emblemUrl) {
    return <LessonNumberMarker lessonNumber={lessonNumber} selectedVibeId={selectedVibeId} />
  }

  return (
    <img
      src={emblemUrl}
      alt=""
      className="today-path-cardCompletionImage"
      draggable={false}
      data-completed-vibe-marker={selectedVibeId}
    />
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

  if (selectedVibeId === 'wistful') {
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

  if (selectedVibeId === 'sharp') {
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
