import { useState } from 'react'
import type { GuidedLesson } from '@/data/guidedLessons'
import { guidedAnswerMatches } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { GuidedFeedback } from './GuidedBrand'
import {
  GuidedNativeInputSupport,
} from './GuidedNativeInput'
import { getGuidedInputMetadata, useGuidedInputComposition } from './guidedInputComposition'

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
  const inputComposition = useGuidedInputComposition()

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
    if (inputComposition.isComposing() || !answer.trim() || status === 'correct' || status === 'revealed') return
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
            {...getGuidedInputMetadata(lesson.targetLanguage)}
            {...inputComposition.compositionProps}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' || inputComposition.isComposingKeyboardEvent(event)) return
              event.preventDefault()
              handleCheck()
            }}
            className="h-12 w-full text-xl font-semibold sm:w-64 sm:text-2xl md:w-72"
          />
          <span>{lesson.typeRecall.after}</span>
        </div>
      </div>

      <GuidedNativeInputSupport
        targetLanguage={lesson.targetLanguage}
        showScriptLab={status === 'wrong' || status === 'revealed'}
      />

      <div className="today-type-actions flex flex-wrap items-center justify-center gap-3" hidden={status === 'correct' || status === 'revealed'}>
        <Button className="today-type-checkButton" onClick={handleCheck} disabled={!answer.trim() || status === 'correct' || status === 'revealed'}>
          {t('today.checkAnswer')}
        </Button>
        {!fallbackVisible && (
          <Button type="button" variant="ghost" onClick={handleShowFallback}>
            {t('today.type.showFallback')}
          </Button>
        )}
      </div>

      <GuidedFeedback id="today-type-feedback" status={status === 'correct' && usedFallback ? 'revealed' : status}>
        {status === 'wrong'
          ? t('today.type.wrong')
          : status === 'correct'
            ? t(usedFallback ? 'today.practice.answerShown' : 'today.practice.correct')
            : status === 'revealed'
              ? t('today.practice.answerShown')
              : ''}
      </GuidedFeedback>
    </div>
  )
}
