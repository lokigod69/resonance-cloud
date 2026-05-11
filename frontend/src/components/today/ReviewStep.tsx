import { CheckCircle2, Sparkles, XCircle } from 'lucide-react'
import { useState } from 'react'
import { getGuidedReviewChoices, type GuidedLesson, type GuidedReviewChoice, type LessonItem } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type ReviewStepResult = {
  reviewCorrect: number
  reviewTotal: number
}

type ReviewStepProps = {
  lesson: GuidedLesson
  reviewItems: LessonItem[]
  onFinish: (result: ReviewStepResult) => void
}

export function ReviewStep({ lesson, reviewItems, onFinish }: ReviewStepProps) {
  const { t } = useTranslation()
  const [itemIndex, setItemIndex] = useState(0)
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [correctCount, setCorrectCount] = useState(0)

  if (reviewItems.length === 0) {
    return (
      <div className="grid gap-5">
        <div>
          <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
            {t('today.review.title')}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t('today.review.allKnown.body')}
          </p>
        </div>

        <div className="rounded-lg border border-[color-mix(in_srgb,var(--accent)_42%,transparent)] bg-[var(--accent-soft)] p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-1 h-5 w-5 shrink-0 text-[var(--accent)]" />
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {t('today.review.allKnown.title')}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                {t('today.review.allKnown.confirmation')}
              </p>
            </div>
          </div>
        </div>

        <div>
          <Button onClick={() => onFinish({ reviewCorrect: 0, reviewTotal: 0 })}>
            {t('today.review.finish')}
          </Button>
        </div>
      </div>
    )
  }

  const item = reviewItems[itemIndex]
  const choices = rotateChoices(getGuidedReviewChoices(lesson, item), itemIndex)
  const isLastItem = itemIndex === reviewItems.length - 1

  const handleChoice = (choice: GuidedReviewChoice) => {
    setSelectedChoiceId(choice.id)
    setStatus(choice.isCorrect ? 'correct' : 'wrong')
  }

  const handleNext = () => {
    const nextCorrectCount = correctCount + (status === 'correct' ? 1 : 0)
    if (isLastItem) {
      onFinish({
        reviewCorrect: nextCorrectCount,
        reviewTotal: reviewItems.length,
      })
      return
    }

    setCorrectCount(nextCorrectCount)
    setItemIndex((current) => current + 1)
    setSelectedChoiceId(null)
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
              total: reviewItems.length,
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
        <p className="mt-5 text-sm font-medium text-[var(--text-muted)]">
          {t('today.review.choicePrompt')}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {choices.map((choice) => {
            const isSelected = selectedChoiceId === choice.id
            const isSelectedCorrect = isSelected && choice.isCorrect
            const isSelectedWrong = isSelected && !choice.isCorrect

            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleChoice(choice)}
                className={cn(
                  'theme-chip min-h-11 rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                  isSelectedCorrect && 'border-[color-mix(in_srgb,var(--accent)_58%,transparent)] bg-[var(--accent-soft)] text-[var(--text-primary)]',
                  isSelectedWrong && 'border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--surface-2)_78%,transparent)] text-[var(--text-secondary)]',
                )}
                aria-pressed={isSelected}
              >
                {choice.targetText}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {status !== 'idle' && (
          <Button onClick={handleNext}>
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

function rotateChoices(choices: GuidedReviewChoice[], itemIndex: number) {
  if (choices.length === 0) return choices
  const offset = (itemIndex + 1) % choices.length
  return [...choices.slice(offset), ...choices.slice(0, offset)]
}
