import { RotateCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getDeterministicBuildChips, resolveGuidedBaseContent, type GuidedLesson } from '@/data/guidedLessons'
import { useAuth } from '@/hooks/useAuth'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { GuidedBrand, GuidedFeedback } from './GuidedBrand'

export type BuildPhraseCheckState = {
  status: 'idle' | 'correct' | 'wrong' | 'revealed'
  attempts: number
  usedFallback: boolean
}

type BuildPhraseStepProps = {
  lesson: GuidedLesson
  initialAttempts?: number
  initialStatus?: BuildPhraseCheckState['status']
  initialUsedFallback?: boolean
  onCheckStateChange: (state: BuildPhraseCheckState) => void
}

export function BuildPhraseStep({
  lesson,
  initialAttempts = 0,
  initialStatus = 'idle',
  initialUsedFallback = false,
  onCheckStateChange,
}: BuildPhraseStepProps) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const preferredBaseLanguage = profile?.base_language
  const shuffledChips = useMemo(() => getDeterministicBuildChips(lesson), [lesson])
  const targetChipCount = useMemo(() => getTargetBuildChipCount(lesson), [lesson])
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>(() => (
    initialStatus === 'correct' || initialStatus === 'revealed'
      ? Array.from({ length: targetChipCount }, (_, index) => index)
      : []
  ))
  const [status, setStatus] = useState<BuildPhraseCheckState['status']>(initialStatus)
  const [attempts, setAttempts] = useState(initialAttempts)
  const [usedFallback, setUsedFallback] = useState(initialUsedFallback)

  const availableChips = shuffledChips
    .filter(({ index }) => !selectedIndexes.includes(index))

  const buildPhraseFromIndexes = (indexes: number[]) => (
    indexes.map((index) => lesson.build.chips[index]).join(' ')
  )

  const applySelection = (nextSelectedIndexes: number[]) => {
    const nextPhrase = buildPhraseFromIndexes(nextSelectedIndexes)
    setSelectedIndexes(nextSelectedIndexes)

    if (status === 'correct' || status === 'revealed') return

    if (nextSelectedIndexes.length < targetChipCount) {
      if (status !== 'idle') {
        setStatus('idle')
        onCheckStateChange({ status: 'idle', attempts, usedFallback })
      }
      return
    }

    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)

    if (nextPhrase === lesson.build.targetText) {
      setStatus('correct')
      onCheckStateChange({ status: 'correct', attempts: nextAttempts, usedFallback })
      return
    }

    setStatus('wrong')
    onCheckStateChange({ status: 'wrong', attempts: nextAttempts, usedFallback })
  }

  const handleSelect = (index: number) => {
    if (status === 'correct' || status === 'revealed' || selectedIndexes.includes(index)) return
    applySelection([...selectedIndexes, index])
  }

  const handleRemove = (position: number) => {
    if (status === 'correct' || status === 'revealed') return
    applySelection(selectedIndexes.filter((_, index) => index !== position))
  }

  const handleClear = () => {
    applySelection([])
  }

  const handleShowAnswer = () => {
    setSelectedIndexes(Array.from({ length: targetChipCount }, (_, index) => index))
    setStatus('revealed')
    setUsedFallback(true)
    onCheckStateChange({ status: 'revealed', attempts, usedFallback: true })
  }

  // The base-language line the learner is translating. build.targetText is
  // validator-pinned to corePhrase.targetText, so corePhrase.baseText is its
  // meaning; the guard keeps any drifting data from showing a wrong cue.
  const cueText = lesson.build.targetText === lesson.corePhrase.targetText
    ? resolveGuidedBaseContent(lesson.corePhrase.baseText, {
      preferredBaseLanguage,
      authoredBaseLanguage: lesson.baseLanguage,
    }).text
    : undefined

  return (
    <div className="today-build-step grid gap-5" data-tile-layout={targetChipCount <= 3 ? 'phrase' : 'flow'} data-build-result={status}>
      {cueText && (
        <div className="today-build-cueCard">
          <GuidedBrand kind="listen-ribbon" className="today-cue-mark" />
          <p className="sr-only">
            {t('today.build.cueLabel')}
          </p>
          <p className="today-build-cueText">
            {cueText}
          </p>
        </div>
      )}

      <div
        data-build-state={status}
        className="today-build-answerSurface"
      >
        <p className="sr-only">
          {t('today.build.answerLabel')}
        </p>
        <div className="today-build-answerDrop" data-empty={selectedIndexes.length === 0}>
          {selectedIndexes.length === 0 ? (
            <span className="text-sm text-[var(--text-muted)]">{t('today.build.emptySelection')}</span>
          ) : (
            selectedIndexes.map((chipIndex, position) => (
              <button
                key={`${chipIndex}-${position}`}
                type="button"
                disabled={status === 'correct' || status === 'revealed'}
                onClick={() => handleRemove(position)}
                data-glass-tone={getChipTone(shuffledChips.findIndex((chip) => chip.index === chipIndex))}
                className={cn('today-word-piece theme-chip-active', status === 'wrong' && 'today-word-piece--retry')}
              >
                <span className="today-tile-label">{lesson.build.chips[chipIndex]}</span>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="today-build-chipBank" hidden={status === 'correct' || status === 'revealed'}>
        {availableChips.map(({ chip, index }) => (
          <button
            key={`${chip}-${index}`}
            type="button"
            disabled={status === 'correct' || status === 'revealed'}
            onClick={() => handleSelect(index)}
            data-glass-tone={getChipTone(shuffledChips.findIndex((item) => item.index === index))}
            className="today-word-piece theme-chip"
          >
            <span className="today-tile-label">{chip}</span>
          </button>
        ))}
      </div>

      <div className="today-step-resetRow flex flex-wrap items-center justify-center gap-3" hidden={selectedIndexes.length === 0 || status === 'correct' || status === 'revealed'}>
        <Button variant="ghost" onClick={handleClear} disabled={selectedIndexes.length === 0 || status === 'correct' || status === 'revealed'}>
          <RotateCcw className="h-4 w-4" />
          {t('today.clearAnswer')}
        </Button>
        {status === 'wrong' && <Button variant="ghost" onClick={handleShowAnswer}>{t('today.type.showFallback')}</Button>}
      </div>

      <GuidedFeedback status={status === 'correct' && usedFallback ? 'revealed' : status}>
        {status === 'wrong'
          ? t('today.build.wrong')
          : status === 'correct'
            ? t(usedFallback ? 'today.practice.answerShown' : 'today.practice.correct')
            : status === 'revealed'
              ? t('today.practice.answerShown')
              : ''}
      </GuidedFeedback>
    </div>
  )
}

// Colour follows each shuffled piece when it moves; it never hints at answer order.
function getChipTone(index: number) {
  return (['amber', 'pink', 'violet'] as const)[index % 3]
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
