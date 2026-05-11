import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import { useState } from 'react'
import type { GuidedLesson } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type BuildPhraseCheckState = {
  status: 'idle' | 'correct' | 'wrong'
  attempts: number
}

type BuildPhraseStepProps = {
  lesson: GuidedLesson
  onCheckStateChange: (state: BuildPhraseCheckState) => void
}

export function BuildPhraseStep({ lesson, onCheckStateChange }: BuildPhraseStepProps) {
  const { t } = useTranslation()
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([])
  const [status, setStatus] = useState<BuildPhraseCheckState['status']>('idle')
  const [attempts, setAttempts] = useState(0)
  const selectedPhrase = selectedIndexes.map((index) => lesson.build.chips[index]).join(' ')

  const availableChips = lesson.build.chips
    .map((chip, index) => ({ chip, index }))
    .filter(({ index }) => !selectedIndexes.includes(index))

  const buildPhraseFromIndexes = (indexes: number[]) => (
    indexes.map((index) => lesson.build.chips[index]).join(' ')
  )

  const applySelection = (nextSelectedIndexes: number[]) => {
    const nextPhrase = buildPhraseFromIndexes(nextSelectedIndexes)
    setSelectedIndexes(nextSelectedIndexes)

    if (nextPhrase === lesson.build.targetText) {
      if (status !== 'correct') {
        const nextAttempts = attempts + 1
        setAttempts(nextAttempts)
        setStatus('correct')
        onCheckStateChange({ status: 'correct', attempts: nextAttempts })
      }
      return
    }

    if (status !== 'idle') {
      setStatus('idle')
      onCheckStateChange({ status: 'idle', attempts })
    }
  }

  const handleSelect = (index: number) => {
    applySelection([...selectedIndexes, index])
  }

  const handleRemove = (position: number) => {
    applySelection(selectedIndexes.filter((_, index) => index !== position))
  }

  const handleClear = () => {
    applySelection([])
  }

  const handleCheck = () => {
    const nextStatus = selectedPhrase === lesson.build.targetText ? 'correct' : 'wrong'
    const nextAttempts = status === 'correct' ? attempts : attempts + 1
    setAttempts(nextAttempts)
    setStatus(nextStatus)
    onCheckStateChange({ status: nextStatus, attempts: nextAttempts })
  }

  return (
    <div className="grid gap-5">
      <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
        {t('today.build.prompt')}
      </p>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-3 sm:p-4">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {t('today.build.answerLabel')}
        </p>
        <div className="flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--app-bg)_28%,transparent)] p-3 text-center">
          {selectedIndexes.length === 0 ? (
            <span className="text-sm text-[var(--text-muted)]">{t('today.build.emptySelection')}</span>
          ) : (
            selectedIndexes.map((chipIndex, position) => (
              <button
                key={`${chipIndex}-${position}`}
                type="button"
                onClick={() => handleRemove(position)}
                className="theme-chip-active min-h-11 rounded-md px-3 py-2 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5"
              >
                {lesson.build.chips[chipIndex]}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {availableChips.map(({ chip, index }) => (
          <button
            key={`${chip}-${index}`}
            type="button"
            onClick={() => handleSelect(index)}
            className="theme-chip min-h-11 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-transform hover:-translate-y-0.5"
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={handleCheck} disabled={selectedIndexes.length === 0 || status === 'correct'}>
          {t('today.checkAnswer')}
        </Button>
        <Button variant="ghost" onClick={handleClear} disabled={selectedIndexes.length === 0}>
          <RotateCcw className="h-4 w-4" />
          {t('today.clearAnswer')}
        </Button>
      </div>

      {status !== 'idle' && (
        <div
          className={cn(
            'mx-auto inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-sm',
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
          <span>{status === 'correct' ? t('today.build.correct') : t('today.build.wrong')}</span>
        </div>
      )}
    </div>
  )
}
