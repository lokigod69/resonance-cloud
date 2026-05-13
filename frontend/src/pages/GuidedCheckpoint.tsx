import { ChevronLeft, ChevronRight, CheckCircle2, Mic, MicOff, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
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
import { readTodayProgressState } from '@/lib/todayProgress'
import { getSelectedGuidedVibe } from '@/lib/todayVibe'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import {
  canUseBrowserSpeechRecognition,
  createBrowserSpeechRecognizer,
  type BrowserSpeechRecognizer,
} from '@/components/today/speechRecognition'

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
  const selectedSegment = resolveSegmentReviewNumber(searchParams.get('segment'))
  const progress = useMemo(() => readTodayProgressState(user?.id), [user?.id])
  const plan = useMemo(
    () => (
      isPathCheckMode
        ? buildGuidedPathCheckPlan(selectedPathId, selectedVibeId)
        : isSegmentReviewMode && selectedSegment
          ? buildGuidedSegmentReviewPlan(progress, selectedPathId, selectedSegment, selectedVibeId)
        : buildGuidedCheckpointPlan(progress, selectedVibeId)
    ),
    [isPathCheckMode, isSegmentReviewMode, progress, selectedPathId, selectedSegment, selectedVibeId],
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

  if (!plan || !currentItem) {
    return <CheckpointUnavailable selectedVibeId={selectedVibeId} />
  }

  if (phase === 'summary' && summary) {
    return (
      <CheckpointSummary
        record={summary}
        selectedVibeId={selectedVibeId}
        isPathCheckMode={isPathCheckMode}
        isSegmentReviewMode={isSegmentReviewMode}
        onBackToToday={() => navigate('/today')}
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
        />
      )}

      {phase === 'speak' && (
        <CheckpointSpeakStep item={currentItem} onDone={handleNextItem} />
      )}
    </main>
  )
}

function CheckpointHeader({
  plan,
  itemIndex,
  progressValue,
  isPathCheckMode,
  isSegmentReviewMode,
}: {
  plan: GuidedCheckpointPlan
  itemIndex: number
  progressValue: number
  isPathCheckMode: boolean
  isSegmentReviewMode: boolean
}) {
  const { t } = useTranslation()
  const title = isPathCheckMode
    ? t('today.path.pathCheck')
    : isSegmentReviewMode
      ? t('today.checkpoint.segmentTitle')
      : t('today.checkpoint.title')
  const heading = isPathCheckMode
    ? t('today.checkpoint.pathCheckHeading')
    : isSegmentReviewMode
      ? t('today.checkpoint.segmentHeading', { segment: plan.segment ?? 1 })
      : t('today.checkpoint.heading')

  return (
    <section className="theme-panel today-checkpoint-header rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild type="button" variant="ghost" size="sm" className="-ml-2 mb-3">
            <Link to="/today">
              <ChevronLeft className="h-4 w-4" />
              {t('today.checkpoint.backToToday')}
            </Link>
          </Button>
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            {title}
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight text-[var(--text-primary)]">
            {heading}
          </h1>
          {isPathCheckMode && (
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              {t('today.checkpoint.pathCheckDiagnostic')}
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
}: {
  item: GuidedCheckpointPlanItem
  answer: string
  result: 'correct' | 'wrong' | undefined
  onAnswerChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onAdvance: () => void
  isSegmentReviewMode: boolean
  isPathCheckMode: boolean
}) {
  const submitted = result !== undefined
  const { t } = useTranslation()

  return (
    <section className="theme-panel today-checkpoint-step rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6 lg:p-7">
      <div className="grid justify-items-center gap-5 text-center">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {isSegmentReviewMode
            ? t('today.checkpoint.segmentTypePrompt')
            : isPathCheckMode
              ? t('today.checkpoint.pathCheckTypePrompt')
              : t('today.checkpoint.typePrompt')}
        </p>

        {isSegmentReviewMode && (
          <div className="today-checkpoint-promptCard w-full max-w-2xl rounded-lg border p-4">
            <div className="flex flex-col justify-center gap-3 text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:flex-row sm:flex-wrap sm:items-center sm:text-3xl">
              <span>{item.lesson.typeRecall.before}</span>
              <Input
                value={answer}
                onChange={(event) => onAnswerChange(event.target.value)}
                disabled={submitted}
                placeholder={t('today.checkpoint.typePlaceholder')}
                aria-label={t('today.checkpoint.answerLabel')}
                className="today-checkpoint-input h-12 w-full text-center text-xl font-semibold sm:w-64 sm:text-2xl md:w-72"
              />
              <span>{item.lesson.typeRecall.after}</span>
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {t('today.checkpoint.germanCue')}
            </p>
            <p className="mt-1 break-words text-sm leading-6 text-[var(--text-secondary)]">
              {item.lesson.corePhrase.baseText}
            </p>
          </div>
        )}

        {!isSegmentReviewMode && (
          <div className="today-checkpoint-promptCard w-full max-w-2xl rounded-lg border p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {t('today.checkpoint.germanPrompt')}
            </p>
            <p className="mt-3 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-3xl">
              {item.lesson.corePhrase.baseText}
            </p>
          </div>
        )}

        <form className="grid w-full max-w-xl justify-items-center gap-4" onSubmit={onSubmit}>
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
        </form>

        {submitted && (
          <div className="grid justify-items-center gap-3">
            <p className="today-checkpoint-resultPill inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm text-[var(--text-secondary)]">
              {result === 'correct' && <CheckCircle2 className="h-4 w-4 text-[#34d399]" />}
              {result === 'correct'
                ? t('today.checkpoint.correctFirstTry')
                : t('today.checkpoint.correctAnswer', { answer: item.lesson.typeRecall.answer })}
            </p>
            <Button type="button" onClick={onAdvance}>
              {t('today.checkpoint.speak')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

function CheckpointSpeakStep({
  item,
  onDone,
}: {
  item: GuidedCheckpointPlanItem
  onDone: () => void
}) {
  const { t } = useTranslation()
  const recognitionRef = useRef<BrowserSpeechRecognizer | null>(null)
  const [status, setStatus] = useState<'idle' | 'listening' | 'done' | 'unsupported'>(
    canUseBrowserSpeechRecognition() ? 'idle' : 'unsupported',
  )
  const isSupported = canUseBrowserSpeechRecognition()

  useEffect(() => () => {
    recognitionRef.current?.abort()
    recognitionRef.current = null
  }, [])

  const finishAttempt = () => {
    recognitionRef.current = null
    setStatus('done')
  }

  const handleStart = () => {
    const recognizer = createBrowserSpeechRecognizer({
      lang: item.lesson.speak.language,
      onResult: finishAttempt,
      onError: finishAttempt,
      onEnd: () => {
        setStatus((current) => (current === 'listening' ? 'done' : current))
      },
    })

    if (!recognizer) {
      setStatus('unsupported')
      return
    }

    recognitionRef.current = recognizer
    setStatus('listening')
    try {
      recognizer.start()
    } catch {
      finishAttempt()
    }
  }

  const handleStop = () => {
    recognitionRef.current?.stop()
  }

  return (
    <section className="theme-panel today-checkpoint-step rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6 lg:p-7">
      <div className="grid justify-items-center gap-5 text-center">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          {t('today.checkpoint.speakPrompt')}
        </p>
        <div className="today-checkpoint-promptCard w-full max-w-2xl rounded-lg border p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('today.checkpoint.speakCue')}
          </p>
          <p className="mt-3 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-3xl">
            {item.lesson.speak.baseCue}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {isSupported && (
            <Button type="button" variant="outline" onClick={status === 'listening' ? handleStop : handleStart}>
              {status === 'listening' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {status === 'listening' ? t('today.checkpoint.stop') : t('today.checkpoint.record')}
            </Button>
          )}
          <Button type="button" onClick={onDone}>
            {status === 'done' ? t('today.checkpoint.next') : t('today.checkpoint.done')}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {status === 'unsupported' && (
          <p className="today-checkpoint-resultPill rounded-lg border px-3 py-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t('today.checkpoint.speechUnsupported')}
          </p>
        )}
      </div>
    </section>
  )
}

function CheckpointSummary({
  record,
  selectedVibeId,
  isPathCheckMode,
  isSegmentReviewMode,
  onBackToToday,
}: {
  record: GuidedCheckpointRecord
  selectedVibeId: ActiveGuidedVibeId
  isPathCheckMode: boolean
  isSegmentReviewMode: boolean
  onBackToToday: () => void
}) {
  const { t } = useTranslation()
  const vibe = guidedVibes[selectedVibeId]

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
              ? t('today.checkpoint.segmentCompleteTitle')
              : t('today.checkpoint.completeTitle')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
          {t('today.checkpoint.completeBody', {
            correct: record.itemsCorrectFirstTry,
            total: record.itemsReviewed,
          })}
        </p>
        <Button type="button" className="mt-6" onClick={onBackToToday}>
          {t('today.checkpoint.backToToday')}
        </Button>
      </section>
    </main>
  )
}

function CheckpointUnavailable({ selectedVibeId }: { selectedVibeId: ActiveGuidedVibeId }) {
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
          <Link to="/today">{t('today.checkpoint.backToToday')}</Link>
        </Button>
      </section>
    </main>
  )
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
