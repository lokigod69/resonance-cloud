import { XCircle } from 'lucide-react'
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
  onCheckStateChange: (state: TypeRecallCheckState) => void
}

export function TypeRecallStep({ lesson, onCheckStateChange }: TypeRecallStepProps) {
  const { t } = useTranslation()
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<TypeRecallCheckState['status']>('idle')
  const [attempts, setAttempts] = useState(0)
  const [fallbackVisible, setFallbackVisible] = useState(false)
  const [usedFallback, setUsedFallback] = useState(false)

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
    applyCheck(answer, usedFallback)
  }

  const handleShowFallback = () => {
    setFallbackVisible(true)
    setUsedFallback(true)
    setStatus('revealed')
    onCheckStateChange({ status: 'revealed', attempts, usedFallback: true })
  }

  return (
    <div className="grid justify-items-center gap-5 text-center">
      <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
        {t('today.type.prompt')}
      </p>

      <div
        className={cn(
          'w-full rounded-lg border bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-4 transition',
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
            placeholder={t('today.type.placeholder')}
            aria-label={t('today.type.inputLabel')}
            className="h-12 w-full text-xl font-semibold sm:w-64 sm:text-2xl md:w-72"
          />
          <span>{lesson.typeRecall.after}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={handleCheck}>
          {t('today.checkAnswer')}
        </Button>
        {!fallbackVisible && (
          <Button type="button" variant="ghost" onClick={handleShowFallback}>
            {t('today.type.showFallback')}
          </Button>
        )}
      </div>

      {fallbackVisible && (
        <p className="rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_72%,transparent)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
          {t('today.type.answerLine', { answer: lesson.typeRecall.answer })}
        </p>
      )}

      {status === 'wrong' && (
        <div
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_72%,transparent)] px-3 py-1.5 text-sm text-[var(--text-secondary)]"
        >
          <XCircle className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          <span>{t('today.type.wrong')}</span>
        </div>
      )}
    </div>
  )
}
