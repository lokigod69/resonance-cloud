import { ChevronRight, ClipboardCheck, Play, Settings } from 'lucide-react'
import { Fragment, type ReactNode, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  resolveGuidedBaseContent,
  type GuidedLesson,
  type GuidedPathLessonCardStatus,
  type GuidedPathMetadata,
  type GuidedPathOverview,
  type GuidedTargetLanguage,
} from '@/data/guidedLessons'
import { ACTIVE_GUIDED_VIBE_IDS, guidedVibes, type ActiveGuidedVibeId } from '@/data/guidedVibes'
import { getTodayLessonVibeStatus, type TodayProgressState } from '@/lib/todayProgress'
import { readGuidedSegmentReviewRecord, type GuidedSegmentReviewNumber } from '@/lib/guidedCheckpoint'
import { splitGuidedPathLabel } from '@/lib/guidedPathLabels'
import { readGuidedTrophyClozeRecord } from '@/lib/guidedTrophy'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { CheckpointCard } from '@/components/today/CheckpointCard'
import { GuidedPathDirectory } from '@/components/today/GuidedPathDirectory'
import { cn } from '@/lib/utils'

const TODAY_PATH_HERO_ASSET = '/guided/today/today-orb-hero.png'
const TODAY_PATH_LESSON_ORB_ASSET = '/guided/today/today-lesson-orb.png'

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

type SegmentRenderState = (typeof GUIDED_SEGMENT_REVIEWS)[number] & {
  lessons: GuidedPathOverview['lessons']
  completedCount: number
  isReviewComplete: boolean
  reviewHref: string
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
  const segmentStates: SegmentRenderState[] = GUIDED_SEGMENT_REVIEWS.map((segment) => {
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

    return {
      ...segment,
      lessons: segmentLessons,
      completedCount,
      isReviewComplete: Boolean(reviewRecord),
      reviewHref: `/today/checkpoint?mode=segment-review&path=${selectedPathId}&segment=${segment.segment}&vibe=${selectedVibeId}`,
    }
  })

  const heroLessonNumber = Math.min(overview.completedCount + 1, overview.totalLessons)
  const heroProgressRatio = overview.totalLessons > 0
    ? overview.completedCount / overview.totalLessons
    : 0

  return (
    <div className="today-path-shell grid gap-4 sm:gap-5">
      <section className="today-path-hero theme-panel today-reveal rounded-lg border border-[var(--border-subtle)] p-4 sm:p-5">
        <img
          src={TODAY_PATH_HERO_ASSET}
          alt=""
          className="today-path-heroOrb"
          draggable={false}
          aria-hidden="true"
        />
        <div className="today-path-header">
          <div className="min-w-0">
            <p className="today-path-heroKicker">
              {t('today.path.heroKicker')}
            </p>
            <h1 className="today-path-heroTitle break-words font-semibold leading-tight text-[var(--text-primary)]">
              {(() => {
                const parts = splitGuidedPathLabel(overview.pathMetadata, t)
                return (
                  <>
                    <span className="today-path-heroTitleLanguage">{parts.language}</span>
                    <span className="today-path-heroTitleLevel">{parts.level}</span>
                  </>
                )
              })()}
            </h1>
            <div className="today-path-heroProgress">
              <span className="today-path-heroProgressRail" aria-hidden="true">
                <span
                  className="today-path-heroProgressFill"
                  style={{ width: `${Math.round(heroProgressRatio * 100)}%` }}
                />
              </span>
              <span className="today-path-heroProgressLabel">
                {overview.isComplete
                  ? t('today.path.completeLabel')
                  : t('today.path.lessonProgressHero', {
                      current: heroLessonNumber,
                      total: overview.totalLessons,
                    })}
              </span>
            </div>
          </div>
        </div>
        <div className="today-path-actions">
          <Button
            type="button"
            variant="outline"
            className="today-path-optionsButton"
            aria-label={t('today.path.changePath')}
            title={t('today.path.changePath')}
            onClick={() => setDirectoryOpen(true)}
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
            <span>{t('today.path.options')}</span>
          </Button>
        </div>
      </section>

      <TodayVibeStrip
        selectedVibeId={selectedVibeId}
        onSelectVibe={onSelectVibe}
      />

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

      <section className="today-path-journey today-reveal grid gap-4" aria-labelledby="today-path-journey-title">
        <h2 id="today-path-journey-title" className="sr-only">
          {t('today.path.yourPath')}
        </h2>

        <div className="today-path-mobileFlow">
          {segmentStates.map((segment) => (
            <div key={segment.segment} className="today-path-mobileSegment">
              {segment.lessons.map((entry, index) => (
                <Fragment key={entry.lesson.id}>
                  <LessonPathCard
                    lesson={entry.lesson}
                    preferredBaseLanguage={preferredBaseLanguage}
                    status={entry.status}
                    isRecommended={entry.isRecommended}
                    isSelected={entry.isSelected}
                    isRecommendationQuiet={hasExplicitLessonSelection && entry.isRecommended && !entry.isSelected}
                    completedVibeIds={entry.completedVibeIds}
                    selectedVibeId={selectedVibeId}
                    showRailLabel
                    onSelectLesson={onSelectLesson}
                  />
                  {index < segment.lessons.length - 1 && (
                    <span className="today-path-mobileConnectorSegment" aria-hidden="true">
                      <ConnectorWave vertical />
                    </span>
                  )}
                </Fragment>
              ))}
              <div className="today-path-mobileRewards">
                <SegmentReviewTile
                  href={segment.reviewHref}
                  segment={segment.segment}
                  label={t(segment.labelKey)}
                  rangeLabel={t(segment.rangeKey)}
                  completedCount={segment.completedCount}
                  selectedVibeId={selectedVibeId}
                  isReviewComplete={segment.isReviewComplete}
                />
                <SegmentTrophyTile
                  pathId={selectedPathId}
                  segment={segment.segment}
                  vibeId={selectedVibeId}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="today-path-desktopFlow">
          {segmentStates.map((segment) => (
            <div key={segment.segment} className="today-path-desktopSegment today-path-desktopRouteRow">
              <div className="today-path-desktopLessonRail">
                <div className="today-path-segmentGrid grid grid-cols-5">
                  {segment.lessons.map((entry, lessonIndex) => (
                    <Fragment key={entry.lesson.id}>
                      <div className="today-path-lessonSlot">
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
                        {lessonIndex < segment.lessons.length - 1 && (
                          <span className="today-path-connector" aria-hidden="true">
                            <ConnectorWave />
                          </span>
                        )}
                      </div>
                    </Fragment>
                  ))}
                </div>
              </div>
              <div className="today-path-desktopRewardSlot today-path-desktopReviewSlot">
                <SegmentReviewTile
                  href={segment.reviewHref}
                  segment={segment.segment}
                  label={t(segment.labelKey)}
                  rangeLabel={t(segment.rangeKey)}
                  completedCount={segment.completedCount}
                  selectedVibeId={selectedVibeId}
                  isReviewComplete={segment.isReviewComplete}
                />
              </div>
              <div className="today-path-desktopRewardSlot today-path-desktopTrophySlot">
                <SegmentTrophyTile
                  pathId={selectedPathId}
                  segment={segment.segment}
                  vibeId={selectedVibeId}
                />
              </div>
            </div>
          ))}
        </div>

        <PathCheckTile href={pathCheckHref} />

        {checkpointCard && (
          <CheckpointCard
            href={checkpointCard.href}
            completedPathCount={checkpointCard.completedPathCount}
          />
        )}
      </section>
    </div>
  )
}

function TodayVibeStrip({
  selectedVibeId,
  onSelectVibe,
}: {
  selectedVibeId: ActiveGuidedVibeId
  onSelectVibe: (vibeId: ActiveGuidedVibeId) => void
}) {
  const { t } = useTranslation()

  return (
    <section
      className="today-vibeStrip today-reveal"
      aria-label={t('today.vibePicker.title')}
    >
      <div className="today-vibeStrip-head">
        <span className="today-vibeStrip-label">{t('today.vibe.rowLabel')}</span>
        <p className="today-vibeStrip-description" key={selectedVibeId}>
          {t(`today.vibe.${selectedVibeId}.description`)}
        </p>
      </div>
      <div className="today-vibeStrip-options" role="group" aria-label={t('today.vibePicker.title')}>
        {ACTIVE_GUIDED_VIBE_IDS.map((vibeId) => {
          const vibe = guidedVibes[vibeId]
          const isSelected = vibeId === selectedVibeId

          return (
            <button
              key={vibeId}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelectVibe(vibeId)}
              className="today-vibeStrip-option"
              data-vibe-option={vibeId}
              data-selected={isSelected}
            >
              <span className="today-vibeStrip-emblem" aria-hidden="true">
                {vibe.emblem?.url && (
                  <img src={vibe.emblem.url} alt="" draggable={false} />
                )}
              </span>
              <span className="today-vibeStrip-name">
                {t(`today.vibe.${vibeId}.label`)}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ConnectorWave({ vertical = false }: { vertical?: boolean }) {
  if (vertical) {
    return (
      <svg
        className="today-path-connectorWave today-path-connectorWave--vertical"
        viewBox="0 0 12 30"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M 6 2 C 1.5 8, 10.5 11, 6 17 S 1.5 26, 6 28"
          fill="none"
          stroke="currentColor"
          strokeDasharray="0.5 5"
          strokeLinecap="round"
          strokeWidth="2.2"
        />
      </svg>
    )
  }

  return (
    <svg
      className="today-path-connectorWave"
      viewBox="0 0 44 12"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M 2 6 C 9 1.5, 14 1.5, 22 6 S 35 10.5, 42 6"
        fill="none"
        stroke="currentColor"
        strokeDasharray="0.5 5.5"
        strokeLinecap="round"
        strokeWidth="2.2"
      />
    </svg>
  )
}

function PathCheckTile({ href }: { href: string }) {
  const { t } = useTranslation()

  return (
    <Link
      to={href}
      className="today-path-checkAction theme-panel group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-[var(--border-subtle)] p-3 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:p-4"
    >
      <span className="today-path-checkIcon flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_44%,transparent)] text-[var(--accent)]" aria-hidden="true">
        <ClipboardCheck className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--text-primary)]">
          {t('today.path.pathCheck')}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--text-secondary)]">
          {t('today.checkpoint.pathCheckDiagnostic')}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 text-[var(--accent)] transition group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
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
    <TodaySegmentNode
      href={href}
      segment={segment}
      kind="review"
      accessibleLabel={accessibleLabel}
      completedCount={completedCount}
      isComplete={isReviewComplete}
      className="today-segment-reviewTile"
    >
      <img
        src={`/guided/reviews/${assetName}`}
        alt=""
        className="today-segment-reviewImage today-path-reviewImage"
        draggable={false}
      />
    </TodaySegmentNode>
  )
}

function SegmentTrophyTile({
  pathId,
  segment,
  vibeId,
}: {
  pathId: string
  segment: GuidedSegmentReviewNumber
  vibeId: ActiveGuidedVibeId
}) {
  const { t } = useTranslation()
  const completionRecord = readGuidedTrophyClozeRecord(pathId, vibeId, segment)
  const isComplete = Boolean(completionRecord)
  const assetName = `${vibeId}-trophy.webp`
  const accessibleLabel = t('today.trophy.tileAria', { segment })

  return (
    <TodaySegmentNode
      href={`/today/checkpoint?mode=trophy-cloze&path=${pathId}&segment=${segment}&vibe=${vibeId}`}
      segment={segment}
      kind="trophy"
      accessibleLabel={accessibleLabel}
      isComplete={isComplete}
      className="today-segment-trophyTile"
    >
      <img
        src={`/guided/trophies/${assetName}`}
        alt=""
        className="today-segment-trophyImage"
        draggable={false}
      />
    </TodaySegmentNode>
  )
}

function TodaySegmentNode({
  href,
  segment,
  kind,
  accessibleLabel,
  completedCount = 0,
  isComplete,
  className,
  children,
}: {
  href: string
  segment: GuidedSegmentReviewNumber
  kind: 'review' | 'trophy'
  accessibleLabel: string
  completedCount?: number
  isComplete: boolean
  className?: string
  children: ReactNode
}) {
  const strength = isComplete ? 'complete' : completedCount > 0 ? 'partial' : 'fresh'

  if (kind === 'review') {
    return (
      <Link
        to={href}
        aria-label={accessibleLabel}
        title={accessibleLabel}
        className={cn('today-path-nodeButton today-path-segmentNode border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]', className)}
        data-node-kind="review"
        data-review-segment={segment}
        data-review-completed-count={completedCount}
        data-review-complete={isComplete}
        data-review-strength={strength}
      >
        <span className="today-path-nodeMedia today-segment-reviewMedia" aria-hidden="true">
          {children}
        </span>
      </Link>
    )
  }

  if (kind === 'trophy') {
    return (
      <Link
        to={href}
        aria-label={accessibleLabel}
        title={accessibleLabel}
        className={cn('today-path-nodeButton today-path-segmentNode border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]', className)}
        data-node-kind="trophy"
        data-trophy-segment={segment}
        data-trophy-completed={isComplete}
      >
        <span className="today-path-nodeMedia today-segment-trophyMedia" aria-hidden="true">
          {children}
        </span>
      </Link>
    )
  }

  return null
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
  const actionLabel = isSelectedRecommendation ? t('today.nextLesson') : t('today.startLesson')

  return (
    <section className="today-featuredLesson today-recommended-panel theme-panel today-reveal rounded-lg border border-[color-mix(in_srgb,var(--accent)_42%,var(--border-subtle))] p-4 sm:p-5">
      <img
        src={TODAY_PATH_LESSON_ORB_ASSET}
        alt=""
        className="today-featuredLessonOrb"
        draggable={false}
        aria-hidden="true"
      />
      <div className="today-featuredLessonContent grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <p className="today-featuredLessonKicker">
            <span className="today-featuredLessonKickerNumber">
              {t('today.lessonLabel', { sequence: lesson.lessonNumber })}
            </span>
            <span className="today-featuredLessonKickerDivider" aria-hidden="true" />
            <span className="today-featuredLessonKickerStatus">
              {isSelectedRecommendation ? t('today.path.nextLessonLabel') : t('today.path.selectedLessonLabel')}
            </span>
          </p>
          <h2 className="today-featuredLessonTitle mt-2 break-words font-semibold leading-tight text-[var(--text-primary)]">
            {title}
          </h2>
        </div>
        <Button size="lg" className="today-featuredLessonAction" onClick={() => onStartLesson(lesson.id)}>
          {actionLabel}
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
  showRailLabel = false,
  onSelectLesson,
}: {
  lesson: GuidedLesson
  preferredBaseLanguage?: string | null
  status: GuidedPathLessonCardStatus
  isRecommended: boolean
  isSelected: boolean
  isRecommendationQuiet: boolean
  completedVibeIds: ActiveGuidedVibeId[]
  selectedVibeId: ActiveGuidedVibeId
  showRailLabel?: boolean
  onSelectLesson: (lessonId: string) => void
}) {
  const { t } = useTranslation()
  const completedSelectedVibe = completedVibeIds.includes(selectedVibeId)
  const title = resolveGuidedBaseContent(lesson.title, {
    preferredBaseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text

  const handleLessonTap = () => {
    onSelectLesson(lesson.id)
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
        'today-path-card today-path-nodeButton group flex min-w-0 border text-center transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        showRailLabel ? 'today-path-railLesson' : 'today-path-gridLesson items-center justify-center p-1',
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
      <span className="today-path-cardMarker today-path-nodeMarker" aria-hidden="true">
        <LessonCellMarker
          lessonNumber={lesson.lessonNumber}
          selectedVibeId={selectedVibeId}
          completedSelectedVibe={completedSelectedVibe}
        />
      </span>
      {showRailLabel && (
        <span className="today-path-railCopy" aria-hidden="true">
          <span className="today-path-railTitle">{title}</span>
        </span>
      )}
      {showRailLabel && isSelected && (
        <ChevronRight className="today-path-railChevron h-4 w-4" aria-hidden="true" />
      )}
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
