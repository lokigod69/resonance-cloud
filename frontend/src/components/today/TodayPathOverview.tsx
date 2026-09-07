import { Check, ChevronRight, ClipboardCheck, Play, Settings } from 'lucide-react'
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
import type { ActiveGuidedVibeId } from '@/data/guidedVibes'
import { readGuidedSegmentReviewRecord, type GuidedSegmentReviewNumber } from '@/lib/guidedCheckpoint'
import { splitGuidedPathLabel } from '@/lib/guidedPathLabels'
import { readGuidedTrophyClozeRecord } from '@/lib/guidedTrophy'
import { getTodayLessonVibeStatus, readTodayLessonDraft, type TodayProgressState } from '@/lib/todayProgress'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { CheckpointCard } from '@/components/today/CheckpointCard'
import { GuidedPathDirectory } from '@/components/today/GuidedPathDirectory'
import './TodayJourney.css'

const GUIDED_SEGMENT_REVIEWS = [
  { segment: 1, start: 1, end: 5, labelKey: 'today.path.reviewOne', rangeKey: 'today.path.reviewOneRange' },
  { segment: 2, start: 6, end: 10, labelKey: 'today.path.reviewTwo', rangeKey: 'today.path.reviewTwoRange' },
] as const

const JOURNEY_GEMS = [
  '/guided/brand/gem-amber-v3.webp',
  '/guided/brand/gem-pink-v3.webp',
  '/guided/brand/gem-violet-v3.webp',
] as const

type TodayPathOverviewProps = {
  overview: GuidedPathOverview
  pathOptions: GuidedPathMetadata[]
  selectedPathId: string
  progress: TodayProgressState
  selectedVibeId: ActiveGuidedVibeId
  selectedLanguage: GuidedTargetLanguage
  availableLanguages: GuidedTargetLanguage[]
  checkpointCard?: { href: string; completedPathCount: number }
  pathCheckHref: string
  onSelectPath: (pathId: string) => void
  onSelectVibe: (vibeId: ActiveGuidedVibeId) => void
  onSelectLanguage: (language: GuidedTargetLanguage) => void
  onSelectLesson: (lessonId: string) => void
  onStartLesson: (lessonId?: string) => void
}

type SegmentRenderState = (typeof GUIDED_SEGMENT_REVIEWS)[number] & {
  lessons: GuidedPathOverview['lessons']
  completedCount: number
  isReviewComplete: boolean
  reviewHref: string
}

export function TodayPathOverview({
  overview, pathOptions, selectedPathId, progress, selectedVibeId, selectedLanguage,
  availableLanguages, checkpointCard, pathCheckHref, onSelectPath, onSelectVibe,
  onSelectLanguage, onSelectLesson, onStartLesson,
}: TodayPathOverviewProps) {
  const { t } = useTranslation()
  const { profile, user } = useAuth()
  const preferredBaseLanguage = profile?.base_language
  const [directoryOpen, setDirectoryOpen] = useState(false)
  const pathLesson = overview.selectedLesson ?? overview.recommendedLesson ?? overview.lessons[0]?.lesson
  const isSelectedRecommendation = Boolean(pathLesson && overview.recommendedLesson && pathLesson.id === overview.recommendedLesson.id)
  const hasExplicitLessonSelection = Boolean(pathLesson && overview.recommendedLesson && pathLesson.id !== overview.recommendedLesson.id)
  const segmentStates: SegmentRenderState[] = GUIDED_SEGMENT_REVIEWS.map((segment) => {
    const lessons = overview.lessons.filter((entry) => (
      entry.lesson.lessonNumber >= segment.start && entry.lesson.lessonNumber <= segment.end
    ))
    const completedCount = lessons.filter((entry) => (
      getTodayLessonVibeStatus(progress, entry.lesson, selectedVibeId) === 'completed'
    )).length
    const reviewRecord = readGuidedSegmentReviewRecord({
      userId: user?.id ?? '', pathId: selectedPathId, segment: segment.segment, vibe: selectedVibeId,
    })
    return {
      ...segment,
      lessons,
      completedCount,
      isReviewComplete: Boolean(reviewRecord),
      reviewHref: `/today/checkpoint?mode=segment-review&path=${selectedPathId}&segment=${segment.segment}&vibe=${selectedVibeId}`,
    }
  })
  const titleParts = splitGuidedPathLabel(overview.pathMetadata, t)

  return (
    <div className="today-journey-overview">
      <header className="today-journey-masthead">
        <img
          src="/guided/brand/corner-flow-v3.webp"
          alt=""
          width="240"
          height="214"
          className="today-journey-cornerFlow"
          aria-hidden="true"
          onError={(event) => { event.currentTarget.hidden = true }}
        />
        <div className="today-journey-mastheadTop">
          <p className="today-journey-eyebrow">{t('today.path.heroKicker')}</p>
          <Button
            type="button"
            variant="ghost"
            className="today-journey-options"
            aria-label={t('today.path.changePath')}
            title={t('today.path.changePath')}
            onClick={() => setDirectoryOpen(true)}
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            <span>{t('today.path.options')}</span>
          </Button>
        </div>
        <h1 className="today-journey-title">
          <span>{titleParts.language}</span>
          <span className="today-journey-titleLevel">{titleParts.level}</span>
        </h1>
        <div className="today-journey-progress">
          <progress
            value={overview.completedCount}
            max={Math.max(overview.totalLessons, 1)}
            aria-label={t('today.practice.completedCount', { current: overview.completedCount, total: overview.totalLessons })}
          />
          <span>
            {overview.isComplete
              ? t('today.path.completeLabel')
              : t('today.practice.completedCount', { current: overview.completedCount, total: overview.totalLessons })}
          </span>
        </div>
      </header>

      <GuidedPathDirectory
        open={directoryOpen}
        pathOptions={pathOptions}
        selectedPathId={selectedPathId}
        progress={progress}
        selectedLanguage={selectedLanguage}
        availableLanguages={availableLanguages}
        selectedVibeId={selectedVibeId}
        onSelectPath={onSelectPath}
        onSelectLanguage={onSelectLanguage}
        onSelectVibe={onSelectVibe}
        onClose={() => setDirectoryOpen(false)}
      />

      {pathLesson && (
        <RecommendedLessonPanel
          lesson={pathLesson}
          preferredBaseLanguage={preferredBaseLanguage}
          isSelectedRecommendation={isSelectedRecommendation}
          onStartLesson={onStartLesson}
        />
      )}

      <section className="today-journey-route" aria-labelledby="today-journey-route-title">
        <div className="today-journey-routeHeading">
          <p className="today-journey-eyebrow">{t('today.path.overviewLabel')}</p>
          <h2 id="today-journey-route-title">{t('today.path.yourPath')}</h2>
        </div>

        <div className="today-journey-chapters">
          {segmentStates.map((segment) => (
            <section className="today-journey-chapter" key={segment.segment}>
              <header className="today-journey-chapterHeading">
                <h3>{t(segment.rangeKey)}</h3>
              </header>

              <ol className="today-journey-lessonRail">
                {segment.lessons.map((entry) => (
                  <li key={entry.lesson.id}>
                    <LessonPathCard
                      lesson={entry.lesson}
                      preferredBaseLanguage={preferredBaseLanguage}
                      status={entry.status}
                      isRecommended={entry.isRecommended}
                      isSelected={entry.isSelected}
                      isRecommendationQuiet={hasExplicitLessonSelection && entry.isRecommended && !entry.isSelected}
                      completedVibeIds={entry.completedVibeIds}
                      selectedVibeId={selectedVibeId}
                      onSelectLesson={onSelectLesson}
                    />
                  </li>
                ))}
              </ol>

              <div className="today-journey-rewards">
                <SegmentReviewTile
                  href={segment.reviewHref}
                  segment={segment.segment}
                  label={t(segment.labelKey)}
                  rangeLabel={t(segment.rangeKey)}
                  completedCount={segment.completedCount}
                  isReviewComplete={segment.isReviewComplete}
                />
                <SegmentTrophyTile pathId={selectedPathId} segment={segment.segment} vibeId={selectedVibeId} />
              </div>
            </section>
          ))}
        </div>

        <div className="today-journey-utilities">
          <PathCheckTile href={pathCheckHref} />
          {checkpointCard && (
            <div className="today-journey-checkpoint">
              <CheckpointCard href={checkpointCard.href} completedPathCount={checkpointCard.completedPathCount} />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function RecommendedLessonPanel({ lesson, preferredBaseLanguage, isSelectedRecommendation, onStartLesson }: {
  lesson: GuidedLesson
  preferredBaseLanguage?: string | null
  isSelectedRecommendation: boolean
  onStartLesson: (lessonId?: string) => void
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const resolvedTitle = resolveGuidedBaseContent(lesson.title, {
    preferredBaseLanguage, authoredBaseLanguage: lesson.baseLanguage,
  })
  const isResumable = Boolean(readTodayLessonDraft(user?.id, lesson))
  const actionLabel = isResumable ? t('today.practice.resume') : t('today.startLesson')

  return (
    <section className="today-journey-next" aria-labelledby="today-journey-next-title">
      <div className="today-journey-nextCopy">
        <p className="today-journey-nextKicker">
          <span>{isSelectedRecommendation ? t('today.path.nextLessonLabel') : t('today.path.selectedLessonLabel')}</span>
          <span aria-hidden="true">·</span>
          <span>{t('today.lessonLabel', { sequence: lesson.lessonNumber })}</span>
        </p>
        <h2 id="today-journey-next-title">{resolvedTitle.text}</h2>
        <p>{t('today.practice.lessonPreview')}</p>
        {resolvedTitle.isFallback && (
          <p>{t('today.practice.explanationsIn', { language: t(`today.language.${resolvedTitle.language}`) })}</p>
        )}
      </div>
      <Button size="lg" className="today-journey-nextAction" onClick={() => onStartLesson(lesson.id)}>
        <span>{actionLabel}</span>
        <Play className="h-5 w-5" aria-hidden="true" />
      </Button>
    </section>
  )
}

function LessonPathCard({
  lesson, preferredBaseLanguage, status, isRecommended, isSelected, isRecommendationQuiet,
  completedVibeIds, selectedVibeId, onSelectLesson,
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
}) {
  const { t } = useTranslation()
  const completedSelectedVibe = completedVibeIds.includes(selectedVibeId)
  const title = resolveGuidedBaseContent(lesson.title, {
    preferredBaseLanguage, authoredBaseLanguage: lesson.baseLanguage,
  }).text
  const visualState = status === 'complete'
    ? 'complete'
    : (isSelected || (isRecommended && !isRecommendationQuiet)) ? 'current' : 'upcoming'
  const statusLabel = visualState === 'complete'
    ? t('today.path.status.complete')
    : isSelected && !isRecommended
      ? t('today.path.selectedLessonLabel')
      : visualState === 'current' ? t('today.path.status.current') : t('today.path.status.notStarted')
  const gemSrc = JOURNEY_GEMS[(lesson.lessonNumber - 1) % JOURNEY_GEMS.length]

  return (
    <button
      type="button"
      onClick={() => onSelectLesson(lesson.id)}
      aria-label={`${t('today.path.openLesson', { sequence: lesson.lessonNumber, title })}. ${statusLabel}`}
      aria-current={visualState === 'current' ? 'step' : undefined}
      className="today-journey-lesson"
      data-journey-state={visualState}
      data-lesson-status={status}
      data-recommended={isRecommended}
      data-recommended-quiet={isRecommendationQuiet}
      data-selected={isSelected}
      data-start-target={isSelected}
      data-completed-selected-vibe={completedSelectedVibe}
    >
      <span className="today-journey-gem" aria-hidden="true">
        <span className="today-journey-gemFallback" />
        <img src={gemSrc} alt="" width="64" height="64" draggable={false} onError={(event) => { event.currentTarget.hidden = true }} />
        <span className="today-journey-lessonNumber">{lesson.lessonNumber}</span>
        {visualState === 'complete' && <Check className="today-journey-completeCheck" />}
      </span>
      <span className="today-journey-lessonCopy">
        <strong>{title}</strong>
        {visualState !== 'upcoming' && <span>{statusLabel}</span>}
      </span>
    </button>
  )
}

function SegmentReviewTile({ href, segment, label, rangeLabel, completedCount, isReviewComplete }: {
  href: string
  segment: GuidedSegmentReviewNumber
  label: string
  rangeLabel: string
  completedCount: number
  isReviewComplete: boolean
}) {
  const { t } = useTranslation()
  const accessibleLabel = `${label}: ${rangeLabel}`
  return (
    <Link
      to={href}
      aria-label={accessibleLabel}
      className="today-journey-reward"
      data-journey-state={isReviewComplete ? 'complete' : 'upcoming'}
      data-node-kind="review"
      data-review-segment={segment}
      data-review-completed-count={completedCount}
      data-review-complete={isReviewComplete}
    >
      <span className="today-journey-rewardIcon" aria-hidden="true">
        {isReviewComplete ? <Check /> : <ClipboardCheck />}
      </span>
      <span><strong>{label}</strong><small>{isReviewComplete ? t('today.path.status.complete') : rangeLabel}</small></span>
      <ChevronRight aria-hidden="true" />
    </Link>
  )
}

function SegmentTrophyTile({ pathId, segment, vibeId }: {
  pathId: string
  segment: GuidedSegmentReviewNumber
  vibeId: ActiveGuidedVibeId
}) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const completionRecord = readGuidedTrophyClozeRecord({ userId: user?.id ?? '', pathId, vibe: vibeId, segment })
  const isComplete = Boolean(completionRecord)
  const accessibleLabel = t('today.trophy.tileAria', { segment })
  return (
    <Link
      to={`/today/checkpoint?mode=trophy-cloze&path=${pathId}&segment=${segment}&vibe=${vibeId}`}
      aria-label={accessibleLabel}
      className="today-journey-reward today-journey-trophy"
      data-journey-state={isComplete ? 'complete' : 'upcoming'}
      data-node-kind="trophy"
      data-trophy-segment={segment}
      data-trophy-completed={isComplete}
    >
      <span className="today-journey-trophyArt" aria-hidden="true">
        <img src={`/guided/trophies/${vibeId}-trophy.webp`} alt="" width="72" height="72" draggable={false} />
      </span>
      <span><strong>{t('today.trophy.tileTitle')}</strong><small>{isComplete ? t('today.path.status.complete') : accessibleLabel}</small></span>
      <ChevronRight aria-hidden="true" />
    </Link>
  )
}

function PathCheckTile({ href }: { href: string }) {
  const { t } = useTranslation()
  return (
    <Link to={href} className="today-journey-pathCheck">
      <span className="today-journey-pathCheckIcon" aria-hidden="true"><ClipboardCheck /></span>
      <span><strong>{t('today.path.pathCheck')}</strong><small>{t('today.checkpoint.pathCheckDiagnostic')}</small></span>
      <ChevronRight aria-hidden="true" />
    </Link>
  )
}
