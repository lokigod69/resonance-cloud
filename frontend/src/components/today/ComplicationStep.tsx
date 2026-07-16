import { Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  guidedAnswerMatches,
  resolveGuidedBaseContent,
  type GuidedClozeBlank,
  type GuidedLesson,
} from '@/data/guidedLessons'
import { playGuidedAudio, stopGuidedAudio } from '@/lib/guidedAudio'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PatternSpotlightCard } from '@/components/today/PatternStep'
import { cn } from '@/lib/utils'

export type ComplicationCheckState = {
  status: 'idle' | 'correct' | 'wrong'
  /** check presses, summed into the session's typeAttempts */
  attempts: number
  /** any blank solved via its fallback/choice reveal after a miss */
  usedFallback: boolean
  blanksTotal: number
  blanksFirstTry: number
}

type BlankState = {
  value: string
  status: 'idle' | 'correct' | 'wrong'
  /** fallback chips visible (typed kinds after a miss; choice kind always) */
  chipsVisible: boolean
  usedFallback: boolean
  /** correct with no misses and no fallback */
  firstTry: boolean
  everWrong: boolean
}

type ComplicationStepProps = {
  lesson: GuidedLesson
  onCheckStateChange: (state: ComplicationCheckState) => void
}

/**
 * B1 step 5 (design doc §3.2): them₂ lands NOW — audio + reveal — and the
 * learner answers it by completing you₂'s 2–3 blanks. Surprise and resolution
 * on one screen; the pattern spotlight stays reachable.
 */
export function ComplicationStep({ lesson, onCheckStateChange }: ComplicationStepProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const preferredBaseLanguage = profile?.base_language
  const dialogue = lesson.dialogue ?? []
  const themTwo = dialogue[2]
  const cloze = lesson.cloze
  const blanks = cloze?.segments.filter((segment) => segment.type === 'blank') ?? []
  const [attempts, setAttempts] = useState(0)
  const [patternVisible, setPatternVisible] = useState(false)
  const [blankStates, setBlankStates] = useState<BlankState[]>(() =>
    blanks.map((segment) => ({
      value: '',
      status: 'idle',
      chipsVisible: segment.type === 'blank' && segment.blank.kind === 'choice',
      usedFallback: false,
      firstTry: false,
      everWrong: false,
    })),
  )

  // them₂ LANDS as the step opens (design doc §3.2 step 5): audio plays with
  // the reveal — best-effort (autoplay policies vary; the Listen button remains).
  useEffect(() => {
    if (!themTwo) return
    void playGuidedAudio({
      pathId: lesson.pathId,
      lessonId: lesson.id,
      vibe: lesson.vibeId,
      surface: 'dialogue',
      surfaceKey: 'turn-3',
      text: themTwo.targetText,
      lang: lesson.speak.language,
    })
    return stopGuidedAudio
  // eslint-disable-next-line react-hooks/exhaustive-deps -- play once on step entry; lesson identity is stable within a session.
  }, [])

  if (!themTwo || !cloze) return null

  const resolvedThemTwoBase = resolveGuidedBaseContent(themTwo.baseText, {
    preferredBaseLanguage,
    authoredBaseLanguage: lesson.baseLanguage,
  }).text

  const publish = (nextStates: BlankState[], nextAttempts: number) => {
    const allCorrect = nextStates.length > 0 && nextStates.every((state) => state.status === 'correct')
    onCheckStateChange({
      status: allCorrect ? 'correct' : nextStates.some((state) => state.status === 'wrong') ? 'wrong' : 'idle',
      attempts: nextAttempts,
      usedFallback: nextStates.some((state) => state.usedFallback),
      blanksTotal: nextStates.length,
      blanksFirstTry: nextStates.filter((state) => state.firstTry).length,
    })
  }

  const setBlankValue = (blankIndex: number, value: string, viaChip: boolean) => {
    setBlankStates((current) => {
      const next = current.map((state, index) => {
        if (index !== blankIndex || state.status === 'correct') return state
        return {
          ...state,
          value,
          status: 'idle' as const,
          // Choice blanks are chip-native; only post-miss chip use counts as fallback.
          usedFallback: state.usedFallback || (viaChip && state.everWrong),
        }
      })
      publish(next, attempts)
      return next
    })
  }

  const handleCheck = () => {
    // typeAttempts equivalence is SUMMED per blank (design doc §4.4): one check
    // press evaluates every unresolved blank.
    const evaluatedCount = blankStates.filter((state) => state.status !== 'correct').length
    const nextAttempts = attempts + Math.max(evaluatedCount, 1)
    setAttempts(nextAttempts)
    setBlankStates((current) => {
      const next = current.map((state, index) => {
        if (state.status === 'correct') return state
        const blank = blanks[index]
        const isCorrect = blank.type === 'blank'
          && state.value.trim().length > 0
          && guidedAnswerMatches(state.value, blank.blank.acceptedAnswers)

        if (isCorrect) {
          return {
            ...state,
            status: 'correct' as const,
            firstTry: !state.everWrong && !state.usedFallback,
          }
        }

        return {
          ...state,
          status: 'wrong' as const,
          everWrong: true,
          chipsVisible: true,
        }
      })
      publish(next, nextAttempts)
      return next
    })
  }

  const handleListenThemTwo = () => {
    void playGuidedAudio({
      pathId: lesson.pathId,
      lessonId: lesson.id,
      vibe: lesson.vibeId,
      surface: 'dialogue',
      surfaceKey: 'turn-3',
      text: themTwo.targetText,
      lang: lesson.speak.language,
    })
  }

  const allCorrect = blankStates.length > 0 && blankStates.every((state) => state.status === 'correct')

  return (
    <div className="today-complication-step grid gap-5">
      <p className="today-step-prompt mx-auto max-w-xl text-center text-sm leading-6 text-[var(--text-secondary)]">
        {t('today.complication.prompt')}
      </p>

      <div className="today-complication-themCard rounded-lg border border-[color-mix(in_srgb,var(--accent-2)_44%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--surface-1)_60%,transparent)] p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {t('today.complication.theirReaction')}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={handleListenThemTwo}>
            <Volume2 className="h-4 w-4" />
            {t('today.listen')}
          </Button>
        </div>
        <p className="mt-2 break-words text-2xl font-semibold leading-tight text-[var(--text-primary)]">
          {themTwo.targetText}
        </p>
        <p className="mt-1 break-words text-sm leading-6 text-[var(--text-secondary)]">
          {resolvedThemTwoBase}
        </p>
      </div>

      <div
        data-complication-state={allCorrect ? 'correct' : 'active'}
        className={cn(
          'today-complication-clozeCard rounded-lg border bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-4 transition',
          allCorrect
            ? 'border-[color-mix(in_srgb,#34d399_54%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,#34d399_28%,transparent)]'
            : 'border-[var(--border-subtle)]',
        )}
      >
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {t('today.complication.yourReply')}
        </p>
        <div className="flex flex-wrap items-baseline justify-center gap-y-3 text-center text-xl font-semibold leading-relaxed text-[var(--text-primary)] sm:text-2xl">
          {cloze.segments.map((segment, segmentIndex) => {
            if (segment.type === 'text') {
              return <span key={`text-${segmentIndex}`} className="whitespace-pre-wrap">{segment.text}</span>
            }
            const blankIndex = cloze.segments
              .slice(0, segmentIndex)
              .filter((candidate) => candidate.type === 'blank')
              .length
            const state = blankStates[blankIndex]
            return (
              <ClozeBlankField
                key={`blank-${segmentIndex}`}
                blank={segment.blank}
                state={state}
                onValueChange={(value, viaChip) => setBlankValue(blankIndex, value, viaChip)}
              />
            )
          })}
        </div>

        <ClozeChipRows blanks={blanks} blankStates={blankStates} onPick={setBlankValue} />
      </div>

      <div className="today-complication-actions flex flex-wrap items-center justify-center gap-3">
        {!allCorrect && (
          <Button className="today-complication-checkButton" onClick={handleCheck}>
            {t('today.checkAnswer')}
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={() => setPatternVisible((visible) => !visible)}>
          {patternVisible ? t('today.complication.hidePattern') : t('today.complication.showPattern')}
        </Button>
      </div>

      {patternVisible && lesson.pattern && (
        <PatternSpotlightCard lesson={lesson} pattern={lesson.pattern} />
      )}

      <div aria-live="polite" className="sr-only">
        {allCorrect
          ? t('today.complication.correct')
          : blankStates.some((state) => state.status === 'wrong')
            ? t('today.complication.wrong')
            : ''}
      </div>
    </div>
  )
}

function ClozeBlankField({
  blank,
  state,
  onValueChange,
}: {
  blank: GuidedClozeBlank
  state: BlankState
  onValueChange: (value: string, viaChip: boolean) => void
}) {
  const { t } = useTranslation()
  const isChoice = blank.kind === 'choice'
  const widthCh = Math.min(Math.max(blank.answer.length + 2, 6), 24)

  return (
    <span className="today-complication-blank mx-1 inline-flex flex-col items-center gap-1 align-baseline">
      <Input
        value={state.value}
        onChange={(event) => onValueChange(event.target.value, false)}
        readOnly={isChoice || state.status === 'correct'}
        placeholder={isChoice ? t('today.complication.choicePlaceholder') : t('today.type.placeholder')}
        aria-label={t('today.complication.blankLabel')}
        style={{ width: `${widthCh}ch`, minWidth: '5.5rem' }}
        className={cn(
          'today-complication-blankInput h-11 text-center text-lg font-semibold sm:text-xl',
          state.status === 'correct' && 'border-[color-mix(in_srgb,#34d399_54%,transparent)]',
          state.status === 'wrong' && 'border-[color-mix(in_srgb,#f87171_58%,transparent)]',
        )}
      />
      {blank.cue && (
        <span className="text-xs font-medium text-[var(--text-muted)]">({blank.cue})</span>
      )}
    </span>
  )
}

function ClozeChipRows({
  blanks,
  blankStates,
  onPick,
}: {
  blanks: Array<{ type: 'blank'; blank: GuidedClozeBlank } | { type: 'text'; text: string }>
  blankStates: BlankState[]
  onPick: (blankIndex: number, value: string, viaChip: boolean) => void
}) {
  const visibleRows = blanks
    .map((segment, index) => ({ segment, index }))
    .filter((row): row is { segment: { type: 'blank'; blank: GuidedClozeBlank }; index: number } =>
      row.segment.type === 'blank'
      && blankStates[row.index]?.chipsVisible === true
      && blankStates[row.index]?.status !== 'correct')

  if (visibleRows.length === 0) return null

  return (
    <div className="today-complication-chipRows mt-4 grid gap-2">
      {visibleRows.map(({ segment, index }) => (
        <div key={`chips-${index}`} className="flex flex-wrap items-center justify-center gap-2">
          {segment.blank.choices.map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => onPick(index, choice, true)}
              className={cn(
                'theme-chip min-h-10 rounded-md px-3 py-1.5 text-sm font-medium shadow-sm transition-transform hover:-translate-y-0.5',
                blankStates[index]?.value === choice && 'theme-chip-active',
              )}
            >
              {choice}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
