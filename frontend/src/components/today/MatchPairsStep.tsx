import { Check, RotateCcw, Volume2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { getDeterministicMatchColumns, type GuidedLesson, type GuidedMatchPair } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { playGuidedAudio } from '@/lib/guidedAudio'
import { cn } from '@/lib/utils'

type MatchPairsStepProps = {
  lesson: GuidedLesson
  matchedPairIds: Set<string>
  onMatchedPairIdsChange: (matchedPairIds: Set<string>) => void
}

export function MatchPairsStep({
  lesson,
  matchedPairIds,
  onMatchedPairIdsChange,
}: MatchPairsStepProps) {
  const { t } = useTranslation()
  const columns = getDeterministicMatchColumns(lesson)
  const targetColumnLabel = t(`today.language.${lesson.targetLanguage}`) || t('today.matchPairs.targetColumn')
  const baseColumnLabel = t(`today.language.${lesson.baseLanguage}`) || t('today.matchPairs.baseColumn')
  const [selectedEnglishId, setSelectedEnglishId] = useState<string | null>(null)
  const [wrongPairIds, setWrongPairIds] = useState<Set<string>>(() => new Set())
  const wrongResetRef = useRef<number | undefined>(undefined)

  useEffect(() => () => {
    if (wrongResetRef.current !== undefined) window.clearTimeout(wrongResetRef.current)
  }, [])

  const handleEnglishSelect = (pairId: string) => {
    if (matchedPairIds.has(pairId)) return
    setSelectedEnglishId(pairId)
    setWrongPairIds(new Set())
  }

  const handleGermanSelect = (pairId: string) => {
    if (!selectedEnglishId || matchedPairIds.has(pairId)) return

    if (selectedEnglishId === pairId) {
      const nextMatchedPairIds = new Set(matchedPairIds)
      nextMatchedPairIds.add(pairId)
      onMatchedPairIdsChange(nextMatchedPairIds)
      setSelectedEnglishId(null)
      setWrongPairIds(new Set())
      return
    }

    setWrongPairIds(new Set([selectedEnglishId, pairId]))
    setSelectedEnglishId(null)
    if (wrongResetRef.current !== undefined) window.clearTimeout(wrongResetRef.current)
    wrongResetRef.current = window.setTimeout(() => {
      setWrongPairIds(new Set())
    }, 520)
  }

  const handleReset = () => {
    onMatchedPairIdsChange(new Set())
    setSelectedEnglishId(null)
    setWrongPairIds(new Set())
  }

  const handleEnglishListen = (pair: GuidedMatchPair) => {
    void playGuidedAudio({
      pathId: lesson.pathId,
      lessonId: lesson.id,
      vibe: lesson.vibeId,
      surface: 'chunk',
      surfaceKey: pair.id,
      text: pair.targetText,
      lang: lesson.speak.language,
    })
  }

  return (
    <div className="today-match-step grid gap-5">
      <div className="today-step-intro flex flex-wrap items-start justify-between gap-3">
        <p className="today-step-prompt max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
          {t('today.matchPairs.subtitle')}
        </p>
        <Button className="today-match-reset" type="button" variant="ghost" size="sm" onClick={handleReset} disabled={matchedPairIds.size === 0 && !selectedEnglishId}>
          <RotateCcw className="h-4 w-4" />
          {t('today.reset')}
        </Button>
      </div>

      <div className="today-match-grid mx-auto grid w-full max-w-2xl justify-center gap-4 sm:grid-cols-[minmax(9rem,15rem)_minmax(9rem,15rem)]">
        <div className="today-match-column grid content-start justify-items-center gap-2">
          <p className="text-center text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {targetColumnLabel}
          </p>
          {columns.english.map((pair) => (
            <MatchChip
              key={pair.id}
              pair={pair}
              side="target"
              isMatched={matchedPairIds.has(pair.id)}
              isSelected={selectedEnglishId === pair.id}
              isWrong={wrongPairIds.has(pair.id)}
              onClick={() => handleEnglishSelect(pair.id)}
              onListen={() => handleEnglishListen(pair)}
              listenLabel={t('today.listenToItem', { item: pair.targetText })}
            />
          ))}
        </div>

        <div className="today-match-column grid content-start justify-items-center gap-2">
          <p className="text-center text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {baseColumnLabel}
          </p>
          {columns.german.map((pair) => (
            <MatchChip
              key={pair.id}
              pair={pair}
              side="base"
              isMatched={matchedPairIds.has(pair.id)}
              isSelected={false}
              isWrong={wrongPairIds.has(pair.id)}
              onClick={() => handleGermanSelect(pair.id)}
            />
          ))}
        </div>
      </div>
      <div aria-live="polite" className="sr-only">
        {wrongPairIds.size > 0 ? t('today.matchPairs.wrong') : ''}
      </div>
    </div>
  )
}

function MatchChip({
  pair,
  side,
  isMatched,
  isSelected,
  isWrong,
  onClick,
  onListen,
  listenLabel,
}: {
  pair: GuidedMatchPair
  side: 'target' | 'base'
  isMatched: boolean
  isSelected: boolean
  isWrong: boolean
  onClick: () => void
  onListen?: () => void
  listenLabel?: string
}) {
  const text = side === 'target' ? pair.targetText : pair.baseText

  return (
    <div className="today-match-chipRow flex w-full max-w-full items-center justify-center gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={isMatched}
        aria-pressed={isSelected || isMatched}
        data-match-state={isMatched ? 'matched' : isWrong ? 'wrong' : isSelected ? 'selected' : 'idle'}
        className={cn(
          'today-match-chip group flex min-h-10 min-w-[8rem] max-w-full flex-1 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
          isMatched
            ? 'border-[color-mix(in_srgb,#34d399_58%,transparent)] bg-[color-mix(in_srgb,#34d399_13%,transparent)] text-[var(--text-primary)] shadow-[0_0_0_1px_color-mix(in_srgb,#34d399_24%,transparent)]'
            : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_64%,transparent)] text-[var(--text-primary)] hover:-translate-y-0.5',
          isSelected && 'border-[color-mix(in_srgb,var(--accent)_62%,transparent)] bg-[color-mix(in_srgb,var(--accent-soft)_72%,transparent)]',
          isWrong && 'animate-pulse border-[color-mix(in_srgb,#f87171_62%,transparent)] bg-[color-mix(in_srgb,#f87171_12%,transparent)] shadow-[0_0_0_1px_color-mix(in_srgb,#f87171_25%,transparent)]',
        )}
      >
        <span className="min-w-0 whitespace-normal break-normal leading-snug">{text}</span>
        {isMatched && <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
        {isWrong && !isMatched && <X className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />}
      </button>
      {onListen && (
        <button
          type="button"
          onClick={onListen}
          className="today-match-listenButton inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_58%,transparent)] text-[var(--text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--accent-soft)_58%,transparent)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-label={listenLabel}
          title={listenLabel}
        >
          <Volume2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
