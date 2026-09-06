import { CheckCircle2, XCircle } from 'lucide-react'
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { guidedAnswerMatches } from '@/data/guidedLessons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslation } from '@/hooks/useTranslation'
import {
  getTrophyClozeAcceptedAnswers,
  isGuidedTrophyClozeComplete,
  type GuidedTrophyClozeItem,
} from '@/lib/guidedTrophy'
import { cn } from '@/lib/utils'

type ClozePosition = {
  lineIndex: number
  word: string
  startChar: number
  endChar: number
}

type TrophyLyricClozeDrillProps = {
  lyricsDisplay: string
  clozePositions: ClozePosition[]
  trophyWords: string[]
  onComplete: (items: GuidedTrophyClozeItem[]) => boolean
}

type LineAttempt = {
  value: string
  checkedValue?: string
  attempts: number
  attempted: boolean
  firstTryCorrect: boolean
  correct: boolean
}

export function TrophyLyricClozeDrill({
  lyricsDisplay,
  clozePositions,
  trophyWords,
  onComplete,
}: TrophyLyricClozeDrillProps) {
  const { t } = useTranslation()
  const lines = useMemo(() => lyricsDisplay.split('\n'), [lyricsDisplay])
  const [attempts, setAttempts] = useState<Record<number, LineAttempt>>({})
  const [completed, setCompleted] = useState(false)
  const completedRef = useRef(false)
  const attemptedCount = Object.values(attempts).filter((attempt) => attempt.attempted).length
  const completeReady = isGuidedTrophyClozeComplete(
    clozePositions.map((position) => ({ correct: attempts[position.lineIndex]?.correct ?? false })),
    clozePositions.length,
  )

  const handleValueChange = (lineIndex: number, value: string) => {
    setAttempts((current) => ({
      ...current,
      [lineIndex]: {
        value,
        checkedValue: current[lineIndex]?.checkedValue,
        attempts: current[lineIndex]?.attempts ?? 0,
        attempted: current[lineIndex]?.attempted ?? false,
        firstTryCorrect: current[lineIndex]?.firstTryCorrect ?? false,
        correct: current[lineIndex]?.correct ?? false,
      },
    }))
  }

  const markAttempted = (position: ClozePosition) => {
    setAttempts((current) => {
      const currentAttempt = current[position.lineIndex]
      const value = currentAttempt?.value ?? ''
      if (!value.trim() || completedRef.current) return current
      if (currentAttempt?.attempted && currentAttempt.checkedValue === value) return current

      const correct = guidedAnswerMatches(value, getTrophyClozeAcceptedAnswers(position.word))
      const nextAttempts = (currentAttempt?.attempts ?? 0) + 1
      return {
        ...current,
        [position.lineIndex]: {
          value,
          checkedValue: value,
          attempts: nextAttempts,
          attempted: true,
          firstTryCorrect: currentAttempt?.attempted
            ? currentAttempt.firstTryCorrect
            : correct,
          correct,
        },
      }
    })
  }

  const handleComplete = () => {
    if (!completeReady || completedRef.current) return
    const saved = onComplete(
      clozePositions.map((position) => {
        const attempt = attempts[position.lineIndex]
        return {
          lineIndex: position.lineIndex,
          word: position.word,
          attempts: attempt?.attempts ?? 0,
          firstTryCorrect: attempt?.firstTryCorrect ?? false,
          correct: attempt?.correct ?? false,
        }
      }),
    )
    if (saved) {
      completedRef.current = true
      setCompleted(true)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, position: ClozePosition) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    markAttempted(position)
  }

  return (
    <section className="today-trophy-drill rounded-lg border border-[var(--border-subtle)] p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {t('today.trophy.drill.title')}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {t('today.trophy.drill.body')}
          </p>
        </div>
        <span className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
          {attemptedCount}/{clozePositions.length}
        </span>
      </div>

      <div className="grid gap-3">
        {clozePositions.map((position) => {
          const line = lines[position.lineIndex] ?? ''
          const before = line.slice(0, position.startChar)
          const after = line.slice(position.endChar)
          const attempt = attempts[position.lineIndex]
          const status = !attempt?.attempted ? 'idle' : attempt.correct ? 'correct' : 'wrong'

          return (
            <div
              key={`${position.lineIndex}:${position.word}`}
              className="today-trophy-lyricRow rounded-lg border p-3"
              data-result={status}
            >
              <label className="flex flex-col gap-2 text-base leading-7 text-[var(--text-primary)] sm:flex-row sm:flex-wrap sm:items-center">
                <span>{before}</span>
                <Input
                  value={attempt?.value ?? ''}
                  onChange={(event) => handleValueChange(position.lineIndex, event.target.value)}
                  onBlur={() => markAttempted(position)}
                  onKeyDown={(event) => handleKeyDown(event, position)}
                  disabled={Boolean(attempt?.correct) || completed}
                  aria-label={t('today.trophy.drill.inputLabel', { word: trophyWords[position.lineIndex] ?? position.word })}
                  className={cn(
                    'today-trophy-clozeInput h-11 min-w-28 text-center font-semibold',
                    position.word.length > 9 ? 'w-44' : 'w-32',
                  )}
                  style={{ width: `${Math.max(7, position.word.length + 4)}ch` }}
                />
                <span>{after}</span>
              </label>
              <div className="mt-2 min-h-6 text-sm text-[var(--text-secondary)]" aria-live="polite">
                {status === 'correct' && (
                  <span className="inline-flex items-center gap-1.5 text-[#34d399]">
                    <CheckCircle2 className="h-4 w-4" />
                    {t('today.trophy.drill.correct')}
                  </span>
                )}
                {status === 'wrong' && (
                  <span className="inline-flex items-center gap-1.5 text-[#f59e0b]">
                    <XCircle className="h-4 w-4" />
                    {t('today.trophy.drill.tryAgain', { answer: position.word })}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <Button type="button" className="mt-4 min-h-11" disabled={!completeReady} onClick={handleComplete}>
        {completeReady ? t('today.trophy.drill.completed') : t('today.trophy.drill.completeHint')}
      </Button>
    </section>
  )
}
