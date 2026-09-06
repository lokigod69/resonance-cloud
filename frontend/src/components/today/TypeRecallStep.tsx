import { useState } from 'react'
import type { GuidedLesson } from '@/data/guidedLessons'
import { guidedAnswerMatches } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type TypeRecallCheckState = {
  status: 'idle' | 'correct' | 'wrong' | 'revealed'
  attempts: number
  usedFallback: boolean
}

type TypeRecallStepProps = {
  lesson: GuidedLesson
  initialAttempts?: number
  initialStatus?: TypeRecallCheckState['status']
  initialUsedFallback?: boolean
  onCheckStateChange: (state: TypeRecallCheckState) => void
}

export function TypeRecallStep({
  lesson,
  initialAttempts = 0,
  initialStatus = 'idle',
  initialUsedFallback = false,
  onCheckStateChange,
}: TypeRecallStepProps) {
  const { t } = useTranslation()
  const [answer, setAnswer] = useState(() => (
    initialStatus === 'correct' || initialStatus === 'revealed'
      ? lesson.typeRecall.answer
      : ''
  ))
  const [status, setStatus] = useState<TypeRecallCheckState['status']>(initialStatus)
  const [attempts, setAttempts] = useState(initialAttempts)
  const [fallbackVisible, setFallbackVisible] = useState(initialUsedFallback || initialStatus === 'revealed')
  const [usedFallback, setUsedFallback] = useState(initialUsedFallback)

  const handleAnswerChange = (value: string) => {
    setAnswer(value)
    if (status !== 'idle') {
      setStatus('idle')
      onCheckStateChange({ status: 'idle', attempts, usedFallback })
    }
  }

  const applyCheck = (value: string, nextUsedFallback: boolean) => {
    const nextAttempts = attempts + 1
    const nextStatus = guidedAnswerMatches(value, lesson.typeRecall.acceptedAnswers) ? 'correct' : 'wrong'
    setAttempts(nextAttempts)
    setStatus(nextStatus)
    setUsedFallback(nextUsedFallback)
    onCheckStateChange({
      status: nextStatus,
      attempts: nextAttempts,
      usedFallback: nextUsedFallback,
    })
  }

  const handleCheck = () => {
    if (!answer.trim() || status === 'correct' || status === 'revealed') return
    applyCheck(answer, usedFallback)
  }

  const handleShowFallback = () => {
    setAnswer(lesson.typeRecall.answer)
    setFallbackVisible(true)
    setUsedFallback(true)
    setStatus('revealed')
    onCheckStateChange({ status: 'revealed', attempts, usedFallback: true })
  }

  return (
    <div className="today-type-step grid justify-items-center gap-5 text-center">
      <p className="today-step-prompt max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
        {t('today.type.prompt')}
      </p>

      <div
        data-type-state={status}
        className={cn(
          'today-type-card w-full rounded-lg border bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-4 transition',
          status === 'correct'
            ? 'border-[color-mix(in_srgb,#34d399_54%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,#34d399_28%,transparent)]'
            : status === 'wrong'
              ? 'border-[color-mix(in_srgb,#f87171_58%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,#f87171_24%,transparent)]'
              : status === 'revealed'
                ? 'border-[color-mix(in_srgb,var(--accent)_42%,transparent)]'
                : 'border-[var(--border-subtle)]',
        )}
      >
        <div className="flex flex-col justify-center gap-3 text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:flex-row sm:flex-wrap sm:items-center sm:text-3xl">
          <span>{lesson.typeRecall.before}</span>
          <Input
            value={answer}
            onChange={(event) => handleAnswerChange(event.target.value)}
            disabled={status === 'revealed'}
            placeholder={t('today.type.placeholder')}
            aria-label={t('today.type.inputLabel')}
            aria-invalid={status === 'wrong'}
            aria-describedby="today-type-feedback"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
                event.preventDefault()
                handleCheck()
              }
            }}
            className="h-12 w-full text-xl font-semibold sm:w-64 sm:text-2xl md:w-72"
          />
          <span>{lesson.typeRecall.after}</span>
        </div>
      </div>

      <div className="today-type-actions flex flex-wrap items-center justify-center gap-3">
        <Button className="today-type-checkButton" onClick={handleCheck} disabled={!answer.trim() || status === 'correct' || status === 'revealed'}>
          {t('today.checkAnswer')}
        </Button>
        {!fallbackVisible && (
          <Button type="button" variant="ghost" onClick={handleShowFallback}>
            {t('today.type.showFallback')}
          </Button>
        )}
      </div>

      {fallbackVisible && (
        <p className="today-type-answerLine rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_72%,transparent)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
          {t('today.type.answerLine', { answer: lesson.typeRecall.answer })}
        </p>
      )}

      <div id="today-type-feedback" aria-live="polite" className="today-answer-feedback" data-feedback={status}>
        {status === 'wrong'
          ? t('today.type.wrong')
          : status === 'correct'
            ? t('today.practice.correct')
            : status === 'revealed'
              ? t('today.practice.answerShown')
              : ''}
      </div>
    </div>
  )
}
