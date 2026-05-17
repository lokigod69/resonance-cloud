import { ChevronLeft, ChevronRight, CheckCircle2, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getGuidedTodayPathOptions, guidedAnswerMatches, type GuidedPathMetadata } from '@/data/guidedLessons'
import { guidedVibes, isActiveGuidedVibeId, type ActiveGuidedVibeId } from '@/data/guidedVibes'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import {
  buildGuidedCheckpointPlan,
  buildGuidedPathCheckPlan,
  buildGuidedSegmentReviewPlan,
  completeGuidedCheckpoint,
  completeGuidedSegmentReview,
  type GuidedSegmentReviewNumber,
  type GuidedCheckpointPlan,
  type GuidedCheckpointPlanItem,
  type GuidedCheckpointRecord,
  type GuidedCheckpointReviewedItem,
} from '@/lib/guidedCheckpoint'
import {
  getGuidedSegmentSceneForLesson,
  getGuidedSegmentStory,
  type GuidedSegmentStory,
} from '@/lib/guidedSegmentStories'
import { readTodayProgressState } from '@/lib/todayProgress'
import { getSelectedGuidedVibe } from '@/lib/todayVibe'
import { fetchTrophySongCanonical, type TrophySongRow } from '@/lib/trophySongsClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { TrophySongPanel } from '@/components/today/trophy/TrophySongPanel'
import { TrophyWordFallbackPanel } from '@/components/today/trophy/TrophyWordFallbackPanel'
import {
  GuidedSpeechPrompt,
  type GuidedSpeechPromptCheckState,
} from '@/components/today/GuidedSpeechPrompt'
import { canUseGuidedSpeechRecognition } from '@/hooks/useGuidedSpeechRecognition'

type CheckpointPhase = 'type' | 'speak' | 'summary'

export default function GuidedCheckpoint() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pathOptions = useMemo(() => getGuidedTodayPathOptions(), [])
  const defaultPathId = pathOptions[0]?.id ?? 'english-a1-practical-1'
  const selectedPathId = resolveCheckpointPath(searchParams.get('path'), defaultPathId, pathOptions)
  const selectedVibeId = resolveCheckpointVibe(searchParams.get('vibe'), selectedPathId)
  const checkpointMode = searchParams.get('mode')
  const isPathCheckMode = checkpointMode === 'path-check'
  const isSegmentReviewMode = checkpointMode === 'segment-review'
  const isTrophyClozeMode = checkpointMode === 'trophy-cloze'
  const selectedSegment = resolveSegmentReviewNumber(searchParams.get('segment'))
  const backToTodayHref = buildTodayPathHref(selectedPathId, selectedVibeId)
  const progress = useMemo(() => readTodayProgressState(user?.id), [user?.id])
  const plan = useMemo(
    () => (
      isTrophyClozeMode
        ? undefined
        : isPathCheckMode
        ? buildGuidedPathCheckPlan(selectedPathId, selectedVibeId)
        : isSegmentReviewMode && selectedSegment
          ? buildGuidedSegmentReviewPlan(progress, selectedPathId, selectedSegment, selectedVibeId)
        : buildGuidedCheckpointPlan(progress, selectedVibeId)
    ),
    [isPathCheckMode, isSegmentReviewMode, isTrophyClozeMode, progress, selectedPathId, selectedSegment, selectedVibeId],
  )
  const [phase, setPhase] = useState<CheckpointPhase>('type')
  const [itemIndex, setItemIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [typeResult, setTypeResult] = useState<'correct' | 'wrong' | undefined>(undefined)
  const [summary, setSummary] = useState<GuidedCheckpointRecord | undefined>(undefined)
  const reviewedItemsRef = useRef<GuidedCheckpointReviewedItem[]>([])
  const currentItem = plan?.items[itemIndex]
  const progressValue = plan ? Math.round(((itemIndex + 1) / plan.items.length) * 100) : 0

  const handleTypeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!currentItem || typeResult) return

    const firstTryCorrect = guidedAnswerMatches(answer, currentItem.lesson.typeRecall.acceptedAnswers)
    setTypeResult(firstTryCorrect ? 'correct' : 'wrong')
    reviewedItemsRef.current[itemIndex] = {
      lessonId: currentItem.lessonId,
      pathId: currentItem.pathId,
      vibe: currentItem.vibe,
      firstTryCorrect,
      needsReview: !firstTryCorrect,
    }
  }

  const handleAdvanceToSpeak = () => {
    if (!typeResult) return
    setPhase('speak')
  }

  const handleNextItem = () => {
    if (!plan) return

    if (itemIndex >= plan.items.length - 1) {
      const record = isSegmentReviewMode && selectedSegment
        ? completeGuidedSegmentReview(selectedPathId, selectedSegment, selectedVibeId, reviewedItemsRef.current)
        : isPathCheckMode
          ? createLocalCheckpointRecord(reviewedItemsRef.current)
          : completeGuidedCheckpoint(selectedVibeId, reviewedItemsRef.current)
      setSummary(record)
      setPhase('summary')
      return
    }

    setItemIndex((current) => current + 1)
    setAnswer('')
    setTypeResult(undefined)
    setPhase('type')
  }

  const handleContinueAnywayFromSpeak = () => {
    if (currentItem) {
      const currentReview = reviewedItemsRef.current[itemIndex]
      reviewedItemsRef.current[itemIndex] = {
        ...currentReview,
        lessonId: currentReview?.lessonId ?? currentItem.lessonId,
        pathId: currentReview?.pathId ?? currentItem.pathId,
        vibe: currentReview?.vibe ?? currentItem.vibe,
        firstTryCorrect: false,
        needsReview: true,
      }
    }
    handleNextItem()
  }

  if (isTrophyClozeMode) {
    return (
      <TrophyCheckpoint
        pathId={selectedPathId}
        segment={selectedSegment}
        vibe={selectedVibeId}
        backToTodayHref={backToTodayHref}
        onBackToToday={() => navigate(backToTodayHref)}
      />
    )
  }

  if (!plan || !currentItem) {
    return <CheckpointUnavailable selectedVibeId={selectedVibeId} backToTodayHref={backToTodayHref} />
  }

  const segmentStory = isSegmentReviewMode && plan.segment
    ? getGuidedSegmentStory(selectedPathId, plan.segment)
    : undefined
  const segmentScene = isSegmentReviewMode && plan.segment
    ? getGuidedSegmentSceneForLesson(selectedPathId, plan.segment, currentItem.lesson.lessonNumber)
    : undefined

  if (phase === 'summary' && summary) {
    return (
      <CheckpointSummary
        record={summary}
        planItems={plan.items}
        selectedVibeId={selectedVibeId}
        isPathCheckMode={isPathCheckMode}
        isSegmentReviewMode={isSegmentReviewMode}
        segmentStory={segmentStory}
        backToTodayHref={backToTodayHref}
      />
    )
  }

  return (
    <main
      className="today-shell today-checkpoint-shell relative isolate mx-auto grid min-h-dvh w-full max-w-4xl content-start gap-5 px-4 py-4 sm:px-6 lg:py-8"
      data-guided-vibe={selectedVibeId}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] opacity-70"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, #38bdf8 24%, transparent), transparent 56%), linear-gradient(180deg, color-mix(in srgb, var(--surface-glass) 42%, transparent), transparent)',
        }}
        aria-hidden="true"
      />

      <CheckpointHeader
        plan={plan}
        itemIndex={itemIndex}
        progressValue={progressValue}
        isPathCheckMode={isPathCheckMode}
        isSegmentReviewMode={isSegmentReviewMode}
        segmentStory={segmentStory}
        backToTodayHref={backToTodayHref}
      />

      {phase === 'type' && (
        <CheckpointTypeStep
          item={currentItem}
          answer={answer}
          result={typeResult}
          onAnswerChange={setAnswer}
          onSubmit={handleTypeSubmit}
          onAdvance={handleAdvanceToSpeak}
          isSegmentReviewMode={isSegmentReviewMode}
          isPathCheckMode={isPathCheckMode}
          segmentScene={segmentScene}
        />
      )}

      {phase === 'speak' && (
        <CheckpointSpeakStep
          item={currentItem}
          isLastItem={Boolean(plan && itemIndex >= plan.items.length - 1)}
          onDone={handleNextItem}
          onContinueAnyway={handleContinueAnywayFromSpeak}
        />
      )}
    </main>
  )
}

function TrophyCheckpoint({
  pathId,
  segment,
  vibe,
  backToTodayHref,
  onBackToToday,
}: {
  pathId: string
  segment: GuidedSegmentReviewNumber | undefined
  vibe: ActiveGuidedVibeId
  backToTodayHref: string
  onBackToToday: () => void
}) {
  const { t } = useTranslation()
  const [row, setRow] = useState<TrophySongRow | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    let active = true

    async function loadTrophySong() {
      if (!segment) {
        setLoading(false)
        setUnavailable(true)
        return
      }

      setLoading(true)
      setUnavailable(false)

      try {
        const nextRow = await fetchTrophySongCanonical(pathId, segment, vibe)
        if (!active) return
        setRow(nextRow)
      } catch {
        if (!active) return
        setRow(undefined)
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadTrophySong()

    return () => {
      active = false
    }
  }, [pathId, segment, vibe])

  if (loading) {
    return (
      <main className="today-shell today-checkpoint-shell mx-auto grid min-h-dvh w-full max-w-3xl place-items-center px-4 py-8 sm:px-6" data-guided-vibe={vibe}>
        <section className="theme-panel w-full rounded-lg border border-[var(--border-subtle)] p-6 text-center sm:p-8">
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
            {t('today.trophy.loadingTitle')}
          </h1>
        </section>
      </main>
    )
  }

  if (unavailable || !segment) {
    return (
      <main className="today-shell today-checkpoint-shell mx-auto grid min-h-dvh w-full max-w-3xl place-items-center px-4 py-8 sm:px-6" data-guided-vibe={vibe}>
        <section className="theme-panel w-full rounded-lg border border-[var(--border-subtle)] p-6 text-center sm:p-8">
          <RotateCcw className="mx-auto h-10 w-10 text-[var(--accent)]" aria-hidden="true" />
          <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
            {t('today.trophy.unavailableTitle')}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
            {t('today.trophy.unavailableBody')}
          </p>
          <Button asChild type="button" className="mt-6">
            <Link to={backToTodayHref}>{t('today.checkpoint.backToToday')}</Link>
          </Button>
        </section>
      </main>
    )
  }

  if (!row) {
    return (
      <TrophyWordFallbackPanel
        pathId={pathId}
        segment={segment}
        vibe={vibe}
        backToTodayHref={backToTodayHref}
      />
    )
  }

  return <TrophySongPanel row={row} backToTodayHref={backToTodayHref} onComplete={onBackToToday} />
}

function CheckpointHeader({
  plan,
  itemIndex,
  progressValue,
  isPathCheckMode,
  isSegmentReviewMode,
  segmentStory,
  backToTodayHref,
}: {
  plan: GuidedCheckpointPlan
  itemIndex: number
  progressValue: number
  isPathCheckMode: boolean
  isSegmentReviewMode: boolean
  segmentStory?: GuidedSegmentStory
  backToTodayHref: string
}) {
  const { t } = useTranslation()
  const title = isSegmentReviewMode
    ? undefined
    : isPathCheckMode
      ? t('today.path.pathCheck')
      : t('today.checkpoint.title')
  const baseSegmentHeading = t('today.checkpoint.segmentHeading', { segment: plan.segment ?? 1 })
  const heading = isPathCheckMode
    ? t('today.checkpoint.pathCheckHeading')
    : isSegmentReviewMode
      ? (segmentStory ? `${baseSegmentHeading} — ${segmentStory.title}` : baseSegmentHeading)
      : t('today.checkpoint.heading')

  return (
    <section className="theme-panel today-checkpoint-header rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild type="button" variant="ghost" size="sm" className="-ml-2 mb-3">
            <Link to={backToTodayHref}>
              <ChevronLeft className="h-4 w-4" />
              {t('today.checkpoint.backToToday')}
            </Link>
          </Button>
          {title && (
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {title}
            </p>
          )}
          <h1 className="mt-1 text-2xl font-semibold leading-tight text-[var(--text-primary)]">
            {heading}
          </h1>
          {isPathCheckMode && (
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {t('today.checkpoint.pathCheckDiagnostic')}
            </p>
          )}
          {isSegmentReviewMode && segmentStory && (
            <p
              className="today-checkpoint-storyIntro mt-2 text-sm leading-6 text-[var(--text-secondary)]"
              data-segment-story-intro=""
            >
              {segmentStory.intro}
            </p>
          )}
        </div>
        <span className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
          {itemIndex + 1}/{plan.items.length}
        </span>
      </div>
      <Progress value={progressValue} className="h-1.5 bg-[color-mix(in_srgb,var(--text-primary)_12%,transparent)]" />
    </section>
  )
}

function CheckpointTypeStep({
  item,
  answer,
  result,
  onAnswerChange,
  onSubmit,
  onAdvance,
  isSegmentReviewMode,
  isPathCheckMode,
  segmentScene,
}: {
  item: GuidedCheckpointPlanItem
  answer: string
  result: 'correct' | 'wrong' | undefined
  onAnswerChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onAdvance: () => void
  isSegmentReviewMode: boolean
  isPathCheckMode: boolean
  segmentScene?: string
}) {
  const submitted = result !== undefined
  const { t } = useTranslation()
  const continueButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (submitted) continueButtonRef.current?.focus()
  }, [submitted])

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter' || !submitted) return
    event.preventDefault()
    onAdvance()
  }

  return (
    <section className="theme-panel today-checkpoint-step rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6 lg:p-7">
      <form className="grid justify-items-center gap-5 text-center" onSubmit={onSubmit} onKeyDown={handleKeyDown}>
        {isSegmentReviewMode && segmentScene && (
          <p
            className="today-checkpoint-storyScene max-w-2xl text-base leading-7 text-[var(--text-primary)]"
            data-segment-story-scene=""
          >
            {segmentScene}
          </p>
        )}

        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {isSegmentReviewMode
            ? t('today.checkpoint.segmentTypePrompt')
            : isPathCheckMode
              ? t('today.checkpoint.pathCheckTypePrompt')
              : t('today.checkpoint.typePrompt')}
        </p>

        {isSegmentReviewMode && (
          <div className="today-checkpoint-promptCard w-full max-w-2xl rounded-lg border p-4" data-result={result ?? 'pending'}>
            <TypeRecallPhrase
              before={item.lesson.typeRecall.before}
              after={item.lesson.typeRecall.after}
              answer={answer}
              submitted={submitted}
              onAnswerChange={onAnswerChange}
              placeholderKey="today.checkpoint.segmentInputPlaceholder"
            />
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {t('today.checkpoint.germanCue')}
            </p>
            <p className="mt-1 break-words text-sm leading-6 text-[var(--text-secondary)]">
              {item.lesson.corePhrase.baseText}
            </p>
          </div>
        )}

        {!isSegmentReviewMode && (
          <div className="today-checkpoint-promptCard w-full max-w-2xl rounded-lg border p-4" data-result={result ?? 'pending'}>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {t('today.checkpoint.germanPrompt')}
            </p>
            <p className="mt-3 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-3xl">
              {item.lesson.corePhrase.baseText}
            </p>
          </div>
        )}

        <div className="grid w-full max-w-xl justify-items-center gap-4">
          {!isSegmentReviewMode && (
            <Input
              value={answer}
              onChange={(event) => onAnswerChange(event.target.value)}
              disabled={submitted}
              placeholder={t('today.checkpoint.typePlaceholder')}
              aria-label={t('today.checkpoint.answerLabel')}
              className="today-checkpoint-input h-12 text-center text-xl font-semibold sm:text-2xl"
            />
          )}
          {!submitted && (
            <Button type="submit" disabled={!answer.trim()}>
              {t('today.checkpoint.check')}
            </Button>
          )}
        </div>

        {submitted && (
          <div className="today-checkpoint-resultRow flex flex-wrap items-center justify-center gap-2">
            {result === 'correct' ? (
              <CheckCircle2 className="h-5 w-5 text-[#34d399]" aria-hidden="true" />
            ) : (
              <p className="today-checkpoint-resultPill inline-flex items-center rounded-full border px-3 py-1 text-sm text-[var(--text-secondary)]" aria-live="polite">
                {t('today.checkpoint.correctAnswer', { answer: item.lesson.typeRecall.answer })}
              </p>
            )}
            <Button ref={continueButtonRef} type="button" size="sm" onClick={onAdvance}>
              {t('today.checkpoint.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </form>
    </section>
  )
}

function TypeRecallPhrase({
  before,
  after,
  answer,
  submitted,
  onAnswerChange,
  placeholderKey = 'today.checkpoint.typePlaceholder',
}: {
  before: string
  after: string
  answer: string
  submitted: boolean
  onAnswerChange: (value: string) => void
  placeholderKey?: string
}) {
  const { t } = useTranslation()
  const hasBefore = before.trim().length > 0
  const hasAfter = after.trim().length > 0

  return (
    <div
      className="flex flex-col justify-center gap-3 text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:flex-row sm:flex-wrap sm:items-center sm:text-3xl"
      data-empty-before={!hasBefore}
      data-empty-after={!hasAfter}
    >
      {hasBefore && <span>{before}</span>}
      <Input
        value={answer}
        onChange={(event) => onAnswerChange(event.target.value)}
        disabled={submitted}
        placeholder={t(placeholderKey)}
        aria-label={t('today.checkpoint.answerLabel')}
        className="today-checkpoint-input h-12 w-full text-center text-xl font-semibold sm:w-64 sm:text-2xl md:w-72"
      />
      {hasAfter && <span>{after}</span>}
    </div>
  )
}

function CheckpointSpeakStep({
  item,
  isLastItem,
  onDone,
  onContinueAnyway,
}: {
  item: GuidedCheckpointPlanItem
  isLastItem: boolean
  onDone: () => void
  onContinueAnyway: () => void
}) {
  const { t } = useTranslation()
  const [speechState, setSpeechState] = useState<GuidedSpeechPromptCheckState>(() => ({
    status: canUseGuidedSpeechRecognition() ? 'idle' : 'unsupported',
    attempts: 0,
    transcriptMatch: 0,
    passed: false,
  }))
  const canAdvance = speechState.status === 'passed'

  return (
    <section className="theme-panel today-checkpoint-step rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6 lg:p-7">
      <div className="grid justify-items-center gap-5">
        <GuidedSpeechPrompt
          prompt={t('today.checkpoint.speakPrompt')}
          cueText={item.lesson.speak.germanPrompt ?? item.lesson.speak.baseCue}
          targetAnswer={item.lesson.speak.targetAnswer ?? item.lesson.speak.targetPhrase}
          displayAnswer={item.lesson.speak.displayAnswer ?? item.lesson.speak.targetAnswer ?? item.lesson.speak.targetPhrase}
          acceptedAnswers={item.lesson.speak.acceptedAnswers}
          requiredTokens={item.lesson.speak.requiredTokens}
          optionalTokens={item.lesson.speak.optionalTokens}
          language={item.lesson.speak.language}
          maxRecordingSeconds={item.lesson.speak.maxRecordingSeconds}
          showHintButton={false}
          cueCardClassName="today-checkpoint-promptCard"
          onCheckStateChange={setSpeechState}
          onContinueAnyway={onContinueAnyway}
          allowContinueWhenUnsupported
        />

        <Button type="button" onClick={onDone} disabled={!canAdvance}>
          {isLastItem ? t('today.checkpoint.done') : t('today.checkpoint.next')}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  )
}

function CheckpointSummary({
  record,
  planItems,
  selectedVibeId,
  isPathCheckMode,
  isSegmentReviewMode,
  segmentStory,
  backToTodayHref,
}: {
  record: GuidedCheckpointRecord
  planItems: GuidedCheckpointPlanItem[]
  selectedVibeId: ActiveGuidedVibeId
  isPathCheckMode: boolean
  isSegmentReviewMode: boolean
  segmentStory?: GuidedSegmentStory
  backToTodayHref: string
}) {
  const { t } = useTranslation()
  const vibe = guidedVibes[selectedVibeId]
  const missedItems = getMissedSummaryItems(record, planItems)

  return (
    <main className="today-shell today-checkpoint-shell mx-auto grid min-h-dvh w-full max-w-3xl place-items-center px-4 py-8 sm:px-6" data-guided-vibe={selectedVibeId}>
      <section className="theme-panel today-checkpoint-summary w-full rounded-lg border border-[var(--border-subtle)] p-6 text-center sm:p-8">
        <span className="today-completion-vibeBadge mx-auto" aria-hidden="true">
          {vibe.emblem?.url && (
            <img
              src={vibe.emblem.url}
              alt=""
              className="today-completion-vibeBadgeImage"
              draggable={false}
            />
          )}
          <CheckCircle2 className="today-completion-vibeBadgeCheck" />
        </span>
        <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
          {isPathCheckMode
            ? t('today.checkpoint.pathCheckCompleteTitle')
            : isSegmentReviewMode
              ? (segmentStory ? `${t('today.checkpoint.segmentCompleteTitle')} — ${segmentStory.title}` : t('today.checkpoint.segmentCompleteTitle'))
              : t('today.checkpoint.completeTitle')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
          {t('today.checkpoint.completeBody', {
            correct: record.itemsCorrectFirstTry,
            total: record.itemsReviewed,
          })}
        </p>
        {missedItems.length > 0 ? (
          <div className="mx-auto mt-5 grid max-w-xl gap-3 text-left">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {t('today.checkpoint.practiceAgainTitle')}
            </h2>
            <ul className="grid gap-2">
              {missedItems.map((item) => (
                <li
                  key={`${item.pathId}:${item.lessonId}:${item.vibe}`}
                  className="rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_54%,transparent)] px-3 py-2"
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {item.lessonTitle}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {t('today.checkpoint.correctAnswer', { answer: item.answer })}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
            {t('today.checkpoint.allCorrectBody')}
          </p>
        )}
        <Button asChild type="button" className="mt-6">
          <Link to={backToTodayHref}>{t('today.checkpoint.backToToday')}</Link>
        </Button>
      </section>
    </main>
  )
}

function getMissedSummaryItems(record: GuidedCheckpointRecord, planItems: GuidedCheckpointPlanItem[]) {
  return record.items
    .filter((item) => item.needsReview)
    .map((item) => {
      const planItem = planItems.find((candidate) => (
        candidate.lessonId === item.lessonId
        && candidate.pathId === item.pathId
        && candidate.vibe === item.vibe
      ))

      return {
        ...item,
        lessonTitle: planItem?.lesson.title ?? item.lessonId,
        answer: planItem?.lesson.typeRecall.answer ?? '',
      }
    })
}

function CheckpointUnavailable({
  selectedVibeId,
  backToTodayHref,
}: {
  selectedVibeId: ActiveGuidedVibeId
  backToTodayHref: string
}) {
  const { t } = useTranslation()

  return (
    <main className="today-shell today-checkpoint-shell mx-auto grid min-h-dvh w-full max-w-3xl place-items-center px-4 py-8 sm:px-6" data-guided-vibe={selectedVibeId}>
      <section className="theme-panel w-full rounded-lg border border-[var(--border-subtle)] p-6 text-center sm:p-8">
        <RotateCcw className="mx-auto h-10 w-10 text-[var(--accent)]" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
          {t('today.checkpoint.unavailableTitle')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
          {t('today.checkpoint.unavailableBody')}
        </p>
        <Button asChild type="button" className="mt-6">
          <Link to={backToTodayHref}>{t('today.checkpoint.backToToday')}</Link>
        </Button>
      </section>
    </main>
  )
}

function buildTodayPathHref(pathId: string, vibe: ActiveGuidedVibeId) {
  return `/today?path=${pathId}&vibe=${vibe}`
}

function resolveCheckpointVibe(value: string | null, defaultPathId: string): ActiveGuidedVibeId {
  return isActiveGuidedVibeId(value) ? value : getSelectedGuidedVibe(defaultPathId)
}

function resolveCheckpointPath(
  value: string | null,
  defaultPathId: string,
  pathOptions: GuidedPathMetadata[],
) {
  return pathOptions.some((path) => path.id === value) ? value! : defaultPathId
}

function resolveSegmentReviewNumber(value: string | null): GuidedSegmentReviewNumber | undefined {
  if (value === '1') return 1
  if (value === '2') return 2
  return undefined
}

function createLocalCheckpointRecord(
  items: GuidedCheckpointReviewedItem[],
  completedAt: Date = new Date(),
): GuidedCheckpointRecord {
  return {
    completedAt: completedAt.toISOString(),
    itemsReviewed: items.length,
    itemsCorrectFirstTry: items.filter((item) => item.firstTryCorrect).length,
    items: items.map((item) => ({
      lessonId: item.lessonId,
      pathId: item.pathId,
      vibe: item.vibe,
      firstTryCorrect: item.firstTryCorrect,
      needsReview: item.needsReview,
    })),
  }
}
