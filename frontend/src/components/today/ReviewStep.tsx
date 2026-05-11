import { CheckCircle2, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { GuidedLesson } from '@/data/guidedLessons'
import { guidedAnswerMatches } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type ReviewStepResult = {
  reviewCorrect: number
  reviewTotal: number
}

type ReviewStepProps = {
  lesson: GuidedLesson
  onFinish: (result: ReviewStepResult) => void
}

export function ReviewStep({ lesson, onFinish }: ReviewStepProps) {
  const { t } = useTranslation()
  const [itemIndex, setItemIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [correctCount, setCorrectCount] = useState(0)
  const item = lesson.lessonItems[itemIndex]
  const isLastItem = itemIndex === lesson.lessonItems.length - 1

  const handleAnswerChange = (value: string) => {
    setAnswer(value)
    if (status !== 'idle') {
      setStatus('idle')
    }
  }

  const handleCheck = () => {
    setStatus(guidedAnswerMatches(answer, item.acceptedAnswers) ? 'correct' : 'wrong')
  }

  const handleNext = () => {
    const nextCorrectCount = correctCount + (status === 'correct' ? 1 : 0)
    if (isLastItem) {
      onFinish({
        reviewCorrect: nextCorrectCount,
        reviewTotal: lesson.lessonItems.length,
      })
      return
    }

    setCorrectCount(nextCorrectCount)
    setItemIndex((current) => current + 1)
    setAnswer('')
    setStatus('idle')
  }

  return (
    <div className="grid gap-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
            {t('today.review.title')}
          </h3>
          <span className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs text-[var(--text-muted)]">
            {t('today.review.itemProgress', {
              current: itemIndex + 1,
              total: lesson.lessonItems.length,
            })}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {t('today.review.prompt')}
        </p>
      </div>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-4">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {t('today.review.basePrompt')}
        </p>
        <p className="mt-3 break-words text-3xl font-semibold leading-tight text-[var(--text-primary)]">
          {item.baseText}
        </p>
        <Input
          value={answer}
          onChange={(event) => handleAnswerChange(event.target.value)}
          placeholder={t('today.review.placeholder')}
          aria-label={t('today.review.inputLabel')}
          className="mt-5 h-12 text-lg font-semibold"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleCheck}>
          {t('today.checkAnswer')}
        </Button>
        {status !== 'idle' && (
          <Button variant="outline" onClick={handleNext}>
            {isLastItem ? t('today.review.finish') : t('today.review.nextItem')}
          </Button>
        )}
      </div>

      {status !== 'idle' && (
        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border p-3 text-sm leading-6',
            status === 'correct'
              ? 'border-[color-mix(in_srgb,var(--accent)_46%,transparent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
              : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_72%,transparent)] text-[var(--text-secondary)]',
          )}
        >
          {status === 'correct' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          )}
          <span>
            {status === 'correct'
              ? t('today.review.correct')
              : t('today.review.wrong', { answer: item.targetText })}
          </span>
        </div>
      )}
    </div>
  )
}
