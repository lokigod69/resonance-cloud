import { RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getDeterministicBuildChips, type GuidedLesson } from '@/data/guidedLessons'
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
  const wrongResetRef = useRef<number | undefined>(undefined)
  const shuffledChips = useMemo(() => getDeterministicBuildChips(lesson), [lesson])
  const targetChipCount = useMemo(() => getTargetBuildChipCount(lesson), [lesson])

  const availableChips = shuffledChips
    .filter(({ index }) => !selectedIndexes.includes(index))

  useEffect(() => () => {
    if (wrongResetRef.current !== undefined) window.clearTimeout(wrongResetRef.current)
  }, [])

  const buildPhraseFromIndexes = (indexes: number[]) => (
    indexes.map((index) => lesson.build.chips[index]).join(' ')
  )

  const applySelection = (nextSelectedIndexes: number[]) => {
    const nextPhrase = buildPhraseFromIndexes(nextSelectedIndexes)
    setSelectedIndexes(nextSelectedIndexes)

    if (status === 'correct') return

    if (nextSelectedIndexes.length < targetChipCount) {
      if (status !== 'idle') {
        setStatus('idle')
        onCheckStateChange({ status: 'idle', attempts })
      }
      return
    }

    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)

    if (nextPhrase === lesson.build.targetText) {
      setStatus('correct')
      onCheckStateChange({ status: 'correct', attempts: nextAttempts })
      return
    }

    setStatus('wrong')
    onCheckStateChange({ status: 'wrong', attempts: nextAttempts })
    if (wrongResetRef.current !== undefined) window.clearTimeout(wrongResetRef.current)
    wrongResetRef.current = window.setTimeout(() => {
      setSelectedIndexes([])
      setStatus('idle')
      onCheckStateChange({ status: 'idle', attempts: nextAttempts })
    }, 620)
  }

  const handleSelect = (index: number) => {
    if (status === 'correct' || status === 'wrong') return
    applySelection([...selectedIndexes, index])
  }

  const handleRemove = (position: number) => {
    if (status === 'correct' || status === 'wrong') return
    applySelection(selectedIndexes.filter((_, index) => index !== position))
  }

  const handleClear = () => {
    applySelection([])
  }

  return (
    <div className="today-build-step grid gap-5">
      <p className="today-step-prompt max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
        {t('today.build.prompt')}
      </p>

      <div
        data-build-state={status}
        className={cn(
          'today-build-answerSurface rounded-lg border bg-[color-mix(in_srgb,var(--surface-1)_56%,transparent)] p-3 transition sm:p-4',
          status === 'correct'
            ? 'border-[color-mix(in_srgb,#34d399_54%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,#34d399_28%,transparent)]'
            : status === 'wrong'
              ? 'border-[color-mix(in_srgb,#f87171_58%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,#f87171_24%,transparent)]'
              : 'border-[var(--border-subtle)]',
        )}
      >
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          {t('today.build.answerLabel')}
        </p>
        <div className="today-build-answerDrop flex min-h-16 flex-wrap items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--app-bg)_28%,transparent)] p-3 text-center">
          {selectedIndexes.length === 0 ? (
            <span className="text-sm text-[var(--text-muted)]">{t('today.build.emptySelection')}</span>
          ) : (
            selectedIndexes.map((chipIndex, position) => (
              <button
                key={`${chipIndex}-${position}`}
                type="button"
                disabled={status === 'correct' || status === 'wrong'}
                onClick={() => handleRemove(position)}
                className={cn(
                  'theme-chip-active min-h-11 rounded-md px-3 py-2 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5',
                  (status === 'correct' || status === 'wrong') && 'cursor-default hover:translate-y-0',
                  status === 'correct' && 'ring-1 ring-[#34d399]',
                  status === 'wrong' && 'ring-1 ring-[#f87171]',
                )}
              >
                {lesson.build.chips[chipIndex]}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="today-build-chipBank flex flex-wrap justify-center gap-2">
        {availableChips.map(({ chip, index }) => (
          <button
            key={`${chip}-${index}`}
            type="button"
            disabled={status === 'correct' || status === 'wrong'}
            onClick={() => handleSelect(index)}
            className={cn(
              'theme-chip min-h-11 rounded-md px-4 py-2 text-sm font-medium shadow-sm transition-transform hover:-translate-y-0.5',
              (status === 'correct' || status === 'wrong') && 'cursor-default opacity-70 hover:translate-y-0',
            )}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="today-step-resetRow flex flex-wrap items-center justify-center gap-3">
        <Button variant="ghost" onClick={handleClear} disabled={selectedIndexes.length === 0 || status === 'correct'}>
          <RotateCcw className="h-4 w-4" />
          {t('today.clearAnswer')}
        </Button>
      </div>

      <div aria-live="polite" className="sr-only">
        {status === 'wrong' ? t('today.build.wrong') : ''}
      </div>
    </div>
  )
}

function getTargetBuildChipCount(lesson: GuidedLesson) {
  const targetIndexes: number[] = []
  for (let index = 0; index < lesson.build.chips.length; index += 1) {
    targetIndexes.push(index)
    if (targetIndexes.map((chipIndex) => lesson.build.chips[chipIndex]).join(' ') === lesson.build.targetText) {
      return targetIndexes.length
    }
  }
  return lesson.build.chips.length
}
