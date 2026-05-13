import { ChevronLeft, ChevronRight, CheckCircle2, Mic, MicOff, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getGuidedTodayPathOptions, guidedAnswerMatches } from '@/data/guidedLessons'
import { isActiveGuidedVibeId, type ActiveGuidedVibeId } from '@/data/guidedVibes'
import { useAuth } from '@/hooks/useAuth'
import {
  buildGuidedCheckpointPlan,
  completeGuidedCheckpoint,
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
  const defaultPathId = getGuidedTodayPathOptions()[0]?.id ?? 'english-a1-practical-1'
  const selectedVibeId = resolveCheckpointVibe(searchParams.get('vibe'), defaultPathId)
  const progress = useMemo(() => readTodayProgressState(user?.id), [user?.id])
  const plan = useMemo(
    () => buildGuidedCheckpointPlan(progress, selectedVibeId),
    [progress, selectedVibeId],
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
      const record = completeGuidedCheckpoint(selectedVibeId, reviewedItemsRef.current)
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
    return <CheckpointUnavailable />
  }

  if (phase === 'summary' && summary) {
    return <CheckpointSummary record={summary} onBackToToday={() => navigate('/today')} />
  }

  return (
    <main
      className="today-shell relative isolate mx-auto grid min-h-dvh w-full max-w-4xl content-start gap-5 px-4 py-4 sm:px-6 lg:py-8"
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

      <CheckpointHeader plan={plan} itemIndex={itemIndex} progressValue={progressValue} />

      {phase === 'type' && (
        <CheckpointTypeStep
          item={currentItem}
          answer={answer}
          result={typeResult}
          onAnswerChange={setAnswer}
          onSubmit={handleTypeSubmit}
          onAdvance={handleAdvanceToSpeak}
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
}: {
  plan: GuidedCheckpointPlan
  itemIndex: number
  progressValue: number
}) {
  return (
    <section className="theme-panel rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button asChild type="button" variant="ghost" size="sm" className="-ml-2 mb-3">
            <Link to="/today">
              <ChevronLeft className="h-4 w-4" />
              Back to Today
            </Link>
          </Button>
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            Quick Review
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight text-[var(--text-primary)]">
            Retrieval checkpoint
          </h1>
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
}: {
  item: GuidedCheckpointPlanItem
  answer: string
  result: 'correct' | 'wrong' | undefined
  onAnswerChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onAdvance: () => void
}) {
  const submitted = result !== undefined

  return (
    <section className="theme-panel rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6 lg:p-7">
      <div className="grid justify-items-center gap-5 text-center">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          Type the English phrase from the German prompt.
        </p>
        <div className="w-full max-w-2xl rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            German prompt
          </p>
          <p className="mt-3 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-3xl">
            {item.lesson.corePhrase.baseText}
          </p>
        </div>

        <form className="grid w-full max-w-xl justify-items-center gap-4" onSubmit={onSubmit}>
          <Input
            value={answer}
            onChange={(event) => onAnswerChange(event.target.value)}
            disabled={submitted}
            placeholder="Type in English"
            aria-label="English recall answer"
            className="h-12 text-center text-xl font-semibold sm:text-2xl"
          />
          {!submitted && (
            <Button type="submit" disabled={!answer.trim()}>
              Check
            </Button>
          )}
        </form>

        {submitted && (
          <div className="grid justify-items-center gap-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_72%,transparent)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
              {result === 'correct' && <CheckCircle2 className="h-4 w-4 text-[#34d399]" />}
              {result === 'correct'
                ? 'Correct on the first try'
                : `Correct answer: ${item.lesson.typeRecall.answer}`}
            </p>
            <Button type="button" onClick={onAdvance}>
              Speak
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
    <section className="theme-panel rounded-lg border border-[var(--border-subtle)] p-4 sm:p-6 lg:p-7">
      <div className="grid justify-items-center gap-5 text-center">
        <p className="text-sm leading-6 text-[var(--text-secondary)]">
          Say the phrase aloud. No score is recorded for speaking.
        </p>
        <div className="w-full max-w-2xl rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Speak from this cue
          </p>
          <p className="mt-3 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:text-3xl">
            {item.lesson.speak.baseCue}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {isSupported && (
            <Button type="button" variant="outline" onClick={status === 'listening' ? handleStop : handleStart}>
              {status === 'listening' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {status === 'listening' ? 'Stop' : 'Record'}
            </Button>
          )}
          <Button type="button" onClick={onDone}>
            {status === 'done' ? 'Next' : 'Done'}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {status === 'unsupported' && (
          <p className="rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_70%,transparent)] px-3 py-2 text-sm leading-6 text-[var(--text-secondary)]">
            Speech recognition is not available in this browser. Continue after saying it aloud.
          </p>
        )}
      </div>
    </section>
  )
}

function CheckpointSummary({
  record,
  onBackToToday,
}: {
  record: GuidedCheckpointRecord
  onBackToToday: () => void
}) {
  return (
    <main className="today-shell mx-auto grid min-h-dvh w-full max-w-3xl place-items-center px-4 py-8 sm:px-6">
      <section className="theme-panel w-full rounded-lg border border-[var(--border-subtle)] p-6 text-center sm:p-8">
        <CheckCircle2 className="mx-auto h-10 w-10 text-[#34d399]" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
          Quick Review complete
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
          {record.itemsCorrectFirstTry} out of {record.itemsReviewed} correct on first try
        </p>
        <Button type="button" className="mt-6" onClick={onBackToToday}>
          Back to Today
        </Button>
      </section>
    </main>
  )
}

function CheckpointUnavailable() {
  return (
    <main className="today-shell mx-auto grid min-h-dvh w-full max-w-3xl place-items-center px-4 py-8 sm:px-6">
      <section className="theme-panel w-full rounded-lg border border-[var(--border-subtle)] p-6 text-center sm:p-8">
        <RotateCcw className="mx-auto h-10 w-10 text-[var(--accent)]" aria-hidden="true" />
        <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">
          No Quick Review right now
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[var(--text-secondary)]">
          Complete a full Guided Today path in your active vibe to start a checkpoint.
        </p>
        <Button asChild type="button" className="mt-6">
          <Link to="/today">Back to Today</Link>
        </Button>
      </section>
    </main>
  )
}

function resolveCheckpointVibe(value: string | null, defaultPathId: string): ActiveGuidedVibeId {
  return isActiveGuidedVibeId(value) ? value : getSelectedGuidedVibe(defaultPathId)
}
