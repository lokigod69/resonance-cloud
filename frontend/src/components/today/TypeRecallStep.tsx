import { CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { GuidedLesson } from '@/data/guidedLessons'
import { guidedAnswerMatches } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type TypeRecallCheckState = {
  status: 'idle' | 'correct' | 'wrong'
  attempts: number
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

  const handleAnswerChange = (value: string) => {
    setAnswer(value)
    if (status !== 'idle') {
      setStatus('idle')
      onCheckStateChange({ status: 'idle', attempts })
    }
  }

  const handleCheck = () => {
    const nextAttempts = attempts + 1
    const nextStatus = guidedAnswerMatches(answer, lesson.typeRecall.acceptedAnswers) ? 'correct' : 'wrong'
    setAttempts(nextAttempts)
    setStatus(nextStatus)
    onCheckStateChange({ status: nextStatus, attempts: nextAttempts })
  }

  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
          {t('today.type.title')}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {t('today.type.prompt')}
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-4">
        <div className="flex flex-col gap-3 text-2xl font-semibold leading-tight text-[var(--text-primary)] sm:flex-row sm:flex-wrap sm:items-center sm:text-3xl">
          <span>{lesson.typeRecall.before}</span>
          <Input
            value={answer}
            onChange={(event) => handleAnswerChange(event.target.value)}
            placeholder={t('today.type.placeholder')}
            aria-label={t('today.type.inputLabel')}
            className="h-12 w-full text-xl font-semibold sm:w-48 sm:text-2xl"
          />
          <span>{lesson.typeRecall.after}</span>
        </div>
      </div>

      <div>
        <Button onClick={handleCheck}>
          {t('today.checkAnswer')}
        </Button>
      </div>

      {status !== 'idle' && (
        <div
          className={cn(
            'inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm',
            status === 'correct'
              ? 'border-[color-mix(in_srgb,var(--accent)_46%,transparent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
              : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_72%,transparent)] text-[var(--text-secondary)]',
          )}
        >
          {status === 'correct' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          )}
          <span>
            {status === 'correct'
              ? t('today.type.correct')
              : t('today.type.wrong', { answer: lesson.typeRecall.answer })}
          </span>
        </div>
      )}
    </div>
  )
}
