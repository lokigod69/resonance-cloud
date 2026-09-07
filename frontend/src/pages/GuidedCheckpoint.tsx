import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  getGuidedTodayPathOptions,
  guidedAnswerMatches,
  loadGuidedLessonsForLanguage,
  resolveGuidedBaseContent,
  type GuidedPathMetadata,
} from '@/data/guidedLessons'
import { isActiveGuidedVibeId, type ActiveGuidedVibeId } from '@/data/guidedVibes'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import {
  buildGuidedCheckpointPlan,
  buildGuidedPathCheckPlan,
  buildGuidedSegmentReviewPlan,
  clearGuidedCheckpointDraft,
  completeGuidedCheckpoint,
  completeGuidedSegmentReview,
  guidedCheckpointDraftKey,
  readGuidedCheckpointDraft,
  restoreGuidedCheckpointPlan,
  writeGuidedCheckpointDraft,
  type GuidedCheckpointDraft,
  type GuidedCheckpointDraftMode,
  type GuidedCheckpointDraftScope,
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
import { trackLearningAction } from '@/lib/analytics'
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
import { GuidedBrand, GuidedFeedback } from '@/components/today/GuidedBrand'
import {
  GuidedNativeInputSupport,
} from '@/components/today/GuidedNativeInput'
import { getGuidedInputMetadata, useGuidedInputComposition } from '@/components/today/guidedInputComposition'
import '@/components/today/Today.css'
import '@/components/today/TodayPractice.css'
import './TodayCheckpoint.css'

type CheckpointPhase = 'type' | 'speak' | 'summary'

const CHECKPOINT_PROGRESS_GEMS = [
  'gem-amber-v3',
  'gem-pink-v3',
  'gem-violet-v3',
] as const

export default function GuidedCheckpoint() {
  const { user, profile } = useAuth()
  const { t } = useTranslation()
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
  const selectedTargetLanguage = pathOptions.find((path) => path.id === selectedPathId)?.targetLanguage ?? 'English'
  const checkpointScope = useMemo(() => ({
    userId: user?.id ?? '',
    targetLanguage: selectedTargetLanguage,
    vibe: selectedVibeId,
  }), [selectedTargetLanguage, selectedVibeId, user?.id])
  const draftMode: GuidedCheckpointDraftMode = isPathCheckMode
    ? 'path-check'
    : isSegmentReviewMode
      ? 'segment-review'
      : 'checkpoint'
  const draftScope = useMemo<GuidedCheckpointDraftScope>(() => ({
    ...checkpointScope,
    mode: draftMode,
    pathId: selectedPathId,
    segment: isSegmentReviewMode ? selectedSegment : undefined,
  }), [checkpointScope, draftMode, isSegmentReviewMode, selectedPathId, selectedSegment])
  const draftStorageKey = guidedCheckpointDraftKey(draftScope)
  const progress = useMemo(() => readTodayProgressState(user?.id), [user?.id])
  const requiredLanguages = useMemo(() => [selectedTargetLanguage], [selectedTargetLanguage])
  const lessonLoadKey = `${requiredLanguages.join('|')}|${profile?.base_language ?? ''}`
  const [lessonLoad, setLessonLoad] = useState<{ key: string; status: 'loading' | 'ready' | 'error' }>({
    key: lessonLoadKey,
    status: 'loading',
  })
  const lessonsState = lessonLoad.key === lessonLoadKey ? lessonLoad.status : 'loading'
  useEffect(() => {
    let active = true
    void Promise.all(requiredLanguages.map((language) => loadGuidedLessonsForLanguage(language, profile?.base_language)))
      .then(() => {
        if (active) setLessonLoad({ key: lessonLoadKey, status: 'ready' })
      })
      .catch(() => {
        if (active) setLessonLoad({ key: lessonLoadKey, status: 'error' })
      })

    return () => {
      active = false
    }
  }, [lessonLoadKey, requiredLanguages, profile?.base_language])
  const storedDraft = useMemo(() => (
    lessonsState === 'ready' && user?.id && !isTrophyClozeMode
      ? readGuidedCheckpointDraft(draftScope)
      : undefined
  ), [draftScope, isTrophyClozeMode, lessonsState, user?.id])
  const restoredPlan = useMemo(() => (
    storedDraft ? restoreGuidedCheckpointPlan(storedDraft) : undefined
  ), [storedDraft])
  const plan = useMemo(
    () => (
      lessonsState !== 'ready' || isTrophyClozeMode
        ? undefined
        : restoredPlan
          ? restoredPlan
        : isPathCheckMode
        ? buildGuidedPathCheckPlan(selectedPathId, selectedVibeId)
        : isSegmentReviewMode && selectedSegment
          ? buildGuidedSegmentReviewPlan(progress, selectedPathId, selectedSegment, selectedVibeId)
        : buildGuidedCheckpointPlan(progress, checkpointScope)
    ),
    [checkpointScope, isPathCheckMode, isSegmentReviewMode, isTrophyClozeMode, lessonsState, progress, restoredPlan, selectedPathId, selectedSegment, selectedVibeId],
  )
  const [phase, setPhase] = useState<CheckpointPhase>('type')
  const [itemIndex, setItemIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [typeResult, setTypeResult] = useState<'correct' | 'wrong' | undefined>(undefined)
  const [summary, setSummary] = useState<GuidedCheckpointRecord | undefined>(undefined)
  const [completionSaveFailed, setCompletionSaveFailed] = useState(false)
  const reviewedItemsRef = useRef<GuidedCheckpointReviewedItem[]>([])
  const currentItem = plan?.items[itemIndex]
  const progressValue = plan ? Math.round(((itemIndex + 1) / plan.items.length) * 100) : 0

  useEffect(() => {
    // Route identity and the asynchronously loaded local draft define a new
    // checkpoint run; reset all transient fields together before restoring it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSummary(undefined)
    setCompletionSaveFailed(false)
    setAnswer('')
    setTypeResult(undefined)

    if (!plan) {
      setItemIndex(0)
      setPhase('type')
      reviewedItemsRef.current = []
      return
    }

    if (storedDraft && restoredPlan) {
      setItemIndex(storedDraft.itemIndex)
      setPhase(storedDraft.phase)
      reviewedItemsRef.current = [...storedDraft.reviewedItems]
      return
    }

    setItemIndex(0)
    setPhase('type')
    reviewedItemsRef.current = []
    if (user?.id) writeGuidedCheckpointDraft(draftScope, createCheckpointDraft(draftScope, plan, 0, 'type', []))
  }, [draftScope, draftStorageKey, plan, restoredPlan, storedDraft, user?.id])

  const persistDraft = (nextItemIndex: number, nextPhase: 'type' | 'speak') => {
    if (!plan || !user?.id) return false
    return writeGuidedCheckpointDraft(
      draftScope,
      createCheckpointDraft(draftScope, plan, nextItemIndex, nextPhase, reviewedItemsRef.current),
    )
  }

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
    persistDraft(itemIndex, 'speak')
    setPhase('speak')
  }

  const handleNextItem = () => {
    if (!plan) return

    if (itemIndex >= plan.items.length - 1) {
      const completion = isSegmentReviewMode && selectedSegment
        ? completeGuidedSegmentReview({
            userId: user?.id ?? '',
            pathId: selectedPathId,
            segment: selectedSegment,
            vibe: selectedVibeId,
          }, reviewedItemsRef.current)
        : isPathCheckMode
          ? { record: createLocalCheckpointRecord(reviewedItemsRef.current), saved: true, alreadyCompleted: false }
          : completeGuidedCheckpoint(checkpointScope, plan.checkpointIndex, reviewedItemsRef.current)
      if (!completion.saved) {
        setCompletionSaveFailed(true)
        return
      }
      const { record } = completion
      clearGuidedCheckpointDraft(draftScope)
      trackLearningAction('guided_step', {
        step_type: isSegmentReviewMode ? 'segment_review' : isPathCheckMode ? 'path_check' : 'checkpoint',
        items_reviewed: record.itemsReviewed,
      })
      setSummary(record)
      setPhase('summary')
      return
    }

    persistDraft(itemIndex + 1, 'type')
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

  if (lessonsState === 'loading') {
    return (
      <main className="today-shell grid min-h-dvh place-items-center" role="status" aria-live="polite">
        <p className="text-sm text-[var(--text-secondary)]">{t('common.loading')}</p>
      </main>
    )
  }

  if (lessonsState === 'error') {
    return <CheckpointUnavailable selectedVibeId={selectedVibeId} backToTodayHref={backToTodayHref} />
  }

  if (isTrophyClozeMode) {
    return (
      <TrophyCheckpoint
        userId={user?.id}
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

  // This optional narrative was authored only in German. Other bases use the
  // selected lesson's translated situation instead of an undisclosed German story.
  const segmentStory = isSegmentReviewMode && plan.segment && profile?.base_language === 'German'
    ? getGuidedSegmentStory(selectedPathId, plan.segment)
    : undefined
  const segmentScene = isSegmentReviewMode && plan.segment
    ? (profile?.base_language === 'German' ? getGuidedSegmentSceneForLesson(selectedPathId, plan.segment, currentItem.lesson.lessonNumber) : resolveGuidedBaseContent(currentItem.lesson.situation, { preferredBaseLanguage: profile?.base_language, authoredBaseLanguage: currentItem.lesson.baseLanguage }).text)
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
      className="today-shell today-checkpoint-shell today-checkpoint-page relative isolate mx-auto grid min-h-dvh w-full content-start"
      data-guided-vibe={selectedVibeId}
    >
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
      {completionSaveFailed && (
        <div className="today-checkpoint-saveError" role="alert">
          <p className="text-sm text-[var(--text-secondary)]">{t('errors.route.title')}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => {
            setCompletionSaveFailed(false)
            handleNextItem()
          }}>
            {t('errors.route.retry')}
          </Button>
        </div>
      )}
    </main>
  )
}

function TrophyCheckpoint({
  userId,
  pathId,
  segment,
  vibe,
  backToTodayHref,
  onBackToToday,
}: {
  userId?: string
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
      <main className="today-shell today-checkpoint-shell today-checkpoint-page today-checkpoint-page--centered" data-guided-vibe={vibe}>
        <section className="today-checkpoint-emptyState">
          <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
            {t('today.trophy.loadingTitle')}
          </h1>
        </section>
      </main>
    )
  }

  if (unavailable || !segment) {
    return (
      <main className="today-shell today-checkpoint-shell today-checkpoint-page today-checkpoint-page--centered" data-guided-vibe={vibe}>
        <section className="today-checkpoint-emptyState">
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
        userId={userId}
        pathId={pathId}
        segment={segment}
        vibe={vibe}
        backToTodayHref={backToTodayHref}
        onComplete={onBackToToday}
      />
    )
  }

  return <TrophySongPanel row={row} userId={userId} backToTodayHref={backToTodayHref} onComplete={onBackToToday} />
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
  const showKicker = title
    ? title.trim().toLocaleLowerCase() !== heading.trim().toLocaleLowerCase()
    : false

  return (
    <header className="today-checkpoint-header">
      <div className="today-checkpoint-topbar">
        <Button asChild type="button" variant="ghost" size="sm" className="today-checkpoint-back">
          <Link to={backToTodayHref}>
            <ChevronLeft className="h-4 w-4" />
            {t('today.checkpoint.backToToday')}
          </Link>
        </Button>
        <span className="today-checkpoint-count">
          {itemIndex + 1}/{plan.items.length}
        </span>
      </div>
      <div className="today-checkpoint-headingBlock">
        <div>
          {showKicker && (
            <p className="today-checkpoint-kicker">
              {title}
            </p>
          )}
          <h1 id="today-checkpoint-title" className="today-checkpoint-title">
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
      </div>
      <Progress
        value={progressValue}
        aria-labelledby="today-checkpoint-title"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressValue}
        className="sr-only"
      />
      <div className="today-checkpoint-progressRail" aria-hidden="true">
        <span className="today-checkpoint-progressLine" />
        {Array.from({ length: plan.items.length }, (_, index) => (
          <span
            key={index}
            className="today-checkpoint-progressNode"
            data-node-state={index < itemIndex ? 'complete' : index === itemIndex ? 'current' : 'upcoming'}
            style={{ left: `${plan.items.length <= 1 ? 50 : (index / (plan.items.length - 1)) * 100}%` }}
          >
            <GuidedBrand
              kind={CHECKPOINT_PROGRESS_GEMS[index % CHECKPOINT_PROGRESS_GEMS.length]}
              className="today-checkpoint-progressGem"
            />
          </span>
        ))}
      </div>
    </header>
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
  const { profile } = useAuth()
  const resolvedBasePrompt = resolveGuidedBaseContent(item.lesson.corePhrase.baseText, {
    preferredBaseLanguage: profile?.base_language,
    authoredBaseLanguage: item.lesson.baseLanguage,
  }).text
  // B1 core phrases run 8–16 words; prompting with the whole translation while
  // checking a single blank is wrong there — always render before/blank/after
  // (design doc §4.5). A1/A2 path-check keeps the translation-prompt form.
  const useBlankPhrase = isSegmentReviewMode || item.lesson.level === 'B1'
  const continueButtonRef = useRef<HTMLButtonElement | null>(null)
  const inputComposition = useGuidedInputComposition()

  useEffect(() => {
    if (submitted) continueButtonRef.current?.focus()
  }, [submitted])

  const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === 'Enter' && inputComposition.isComposingKeyboardEvent(event)) {
      // Let an active IME consume Enter to confirm its candidate. WebKit can
      // then emit a second Enter after compositionend with only keyCode 229;
      // cancel that event so the form's implicit submit cannot grade it.
      if (
        !inputComposition.isComposing()
        && !event.nativeEvent.isComposing
        && event.nativeEvent.keyCode === 229
      ) event.preventDefault()
      return
    }
    if (event.key !== 'Enter' || !submitted) return
    event.preventDefault()
    onAdvance()
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (inputComposition.isComposing()) {
      event.preventDefault()
      return
    }
    onSubmit(event)
  }

  return (
    <section className="today-checkpoint-step">
      <form className="grid justify-items-center gap-5 text-center" onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
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

        {useBlankPhrase && (
          <div className="today-checkpoint-promptCard today-checkpoint-prompt" data-result={result ?? 'pending'}>
            <TypeRecallPhrase
              before={item.lesson.typeRecall.before}
              after={item.lesson.typeRecall.after}
              answer={answer}
              submitted={submitted}
              result={result}
              onAnswerChange={onAnswerChange}
              targetLanguage={item.lesson.targetLanguage}
              compositionProps={inputComposition.compositionProps}
              placeholderKey={isSegmentReviewMode ? 'today.checkpoint.segmentInputPlaceholder' : 'today.checkpoint.typePlaceholder'}
            />
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {t('today.checkpoint.baseCue')}
            </p>
            <p className="mt-1 break-words text-sm leading-6 text-[var(--text-secondary)]">
              {resolvedBasePrompt}
            </p>
          </div>
        )}

        {!useBlankPhrase && (
          <div className="today-checkpoint-promptCard today-checkpoint-prompt" data-result={result ?? 'pending'}>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {t('today.checkpoint.basePrompt')}
            </p>
            <p className="mt-3 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-3xl">
              {resolvedBasePrompt}
            </p>
          </div>
        )}

        <div className="grid w-full max-w-xl justify-items-center gap-4">
          {!useBlankPhrase && (
            <Input
              value={answer}
              onChange={(event) => onAnswerChange(event.target.value)}
              disabled={submitted}
              placeholder={t('today.checkpoint.typePlaceholder')}
              aria-label={t('today.checkpoint.answerLabel')}
              aria-invalid={result === 'wrong'}
              aria-describedby={submitted ? 'today-checkpoint-feedback' : undefined}
              {...getGuidedInputMetadata(item.lesson.targetLanguage)}
              {...inputComposition.compositionProps}
              className="today-checkpoint-input h-12 text-center text-xl font-semibold sm:text-2xl"
            />
          )}
          {!submitted && (
            <Button type="submit" className="today-checkpoint-primaryAction" disabled={!answer.trim()}>
              {t('today.checkpoint.check')}
            </Button>
          )}
        </div>

        <GuidedNativeInputSupport
          targetLanguage={item.lesson.targetLanguage}
          showScriptLab={result === 'wrong'}
        />

        {submitted && (
          <div className="today-checkpoint-resultRow">
            <GuidedFeedback id="today-checkpoint-feedback" status={result === 'correct' ? 'correct' : 'wrong'}>
              {result === 'correct'
                ? t('today.practice.correct')
                : t('today.checkpoint.correctAnswer', { answer: item.lesson.typeRecall.answer })}
            </GuidedFeedback>
            <Button ref={continueButtonRef} className="today-checkpoint-primaryAction" type="button" onClick={onAdvance}>
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
  result,
  onAnswerChange,
  targetLanguage,
  compositionProps,
  placeholderKey = 'today.checkpoint.typePlaceholder',
}: {
  before: string
  after: string
  answer: string
  submitted: boolean
  result: 'correct' | 'wrong' | undefined
  onAnswerChange: (value: string) => void
  targetLanguage: string
  compositionProps: ReturnType<typeof useGuidedInputComposition>['compositionProps']
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
        aria-invalid={result === 'wrong'}
        aria-describedby={submitted ? 'today-checkpoint-feedback' : undefined}
        {...getGuidedInputMetadata(targetLanguage)}
        {...compositionProps}
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
  const { profile } = useAuth()
  const cueText = resolveGuidedBaseContent(item.lesson.speak.baseCue, {
    preferredBaseLanguage: profile?.base_language,
    authoredBaseLanguage: item.lesson.baseLanguage,
  }).text
  const [speechState, setSpeechState] = useState<GuidedSpeechPromptCheckState>(() => ({
    status: canUseGuidedSpeechRecognition() ? 'idle' : 'unsupported',
    attempts: 0,
    transcriptMatch: 0,
    passed: false,
  }))
  const canAdvance = speechState.status === 'passed'

  return (
    <section className="today-checkpoint-step">
      <div className="grid justify-items-center gap-5">
        <GuidedSpeechPrompt
          prompt={t('today.checkpoint.speakPrompt')}
          cueText={cueText}
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

        <Button className="today-checkpoint-primaryAction" type="button" onClick={onDone} disabled={!canAdvance}>
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
  const { profile } = useAuth()
  const missedItems = getMissedSummaryItems(record, planItems, profile?.base_language)

  return (
    <main className="today-shell today-checkpoint-shell today-checkpoint-page today-checkpoint-page--centered" data-guided-vibe={selectedVibeId}>
      <section className="today-checkpoint-summary">
        <span className="today-completion-brandMark mx-auto" aria-hidden="true">
          <GuidedBrand kind="current-crest" />
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
                  className="today-checkpoint-reviewItem"
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
        <Button asChild type="button" className="today-checkpoint-primaryAction mt-6">
          <Link to={backToTodayHref}>{t('today.checkpoint.backToToday')}</Link>
        </Button>
      </section>
    </main>
  )
}

function getMissedSummaryItems(
  record: GuidedCheckpointRecord,
  planItems: GuidedCheckpointPlanItem[],
  preferredBaseLanguage?: string | null,
) {
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
        lessonTitle: planItem
          ? resolveGuidedBaseContent(planItem.lesson.title, {
            preferredBaseLanguage,
            authoredBaseLanguage: planItem.lesson.baseLanguage,
          }).text
          : item.lessonId,
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
    <main className="today-shell today-checkpoint-shell today-checkpoint-page today-checkpoint-page--centered" data-guided-vibe={selectedVibeId}>
      <section className="today-checkpoint-emptyState">
        <RotateCcw className="mx-auto h-10 w-10 text-[var(--accent)]" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
          {t('today.checkpoint.unavailableTitle')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
          {t('today.checkpoint.unavailableBody')}
        </p>
        <Button asChild type="button" className="today-checkpoint-primaryAction mt-6">
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

function createCheckpointDraft(
  scope: GuidedCheckpointDraftScope,
  plan: GuidedCheckpointPlan,
  itemIndex: number,
  phase: 'type' | 'speak',
  reviewedItems: GuidedCheckpointReviewedItem[],
): GuidedCheckpointDraft {
  return {
    schemaVersion: 1,
    mode: scope.mode,
    pathId: scope.pathId,
    segment: scope.segment,
    targetLanguage: scope.targetLanguage,
    vibe: scope.vibe,
    checkpointIndex: plan.checkpointIndex,
    completedPathCount: plan.completedPathCount,
    itemIndex,
    phase,
    planItems: plan.items.map((item) => ({
      lessonId: item.lessonId,
      pathId: item.pathId,
      vibe: item.vibe,
    })),
    reviewedItems: reviewedItems.map((item) => ({ ...item })),
    updatedAt: new Date().toISOString(),
  }
}
