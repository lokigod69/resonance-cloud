import { Check, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { getGuidedMatchPairs, type GuidedLesson, type GuidedMatchPair } from '@/data/guidedLessons'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
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
  const pairs = getGuidedMatchPairs(lesson)
  const rightPairs = orderGermanPairs(pairs)
  const [selectedEnglishId, setSelectedEnglishId] = useState<string | null>(null)
  const [wrongPairId, setWrongPairId] = useState<string | null>(null)

  const handleEnglishSelect = (pairId: string) => {
    if (matchedPairIds.has(pairId)) return
    setSelectedEnglishId(pairId)
    setWrongPairId(null)
  }

  const handleGermanSelect = (pairId: string) => {
    if (!selectedEnglishId || matchedPairIds.has(pairId)) return

    if (selectedEnglishId === pairId) {
      const nextMatchedPairIds = new Set(matchedPairIds)
      nextMatchedPairIds.add(pairId)
      onMatchedPairIdsChange(nextMatchedPairIds)
      setSelectedEnglishId(null)
      setWrongPairId(null)
      return
    }

    setWrongPairId(pairId)
    setSelectedEnglishId(null)
  }

  const handleReset = () => {
    onMatchedPairIdsChange(new Set())
    setSelectedEnglishId(null)
    setWrongPairId(null)
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold text-[var(--text-primary)]">
            {t('today.matchPairs.title')}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {t('today.matchPairs.subtitle')}
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleReset} disabled={matchedPairIds.size === 0 && !selectedEnglishId}>
          <RotateCcw className="h-4 w-4" />
          {t('today.reset')}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            English
          </p>
          {pairs.map((pair) => (
            <MatchChip
              key={pair.id}
              pair={pair}
              side="target"
              isMatched={matchedPairIds.has(pair.id)}
              isSelected={selectedEnglishId === pair.id}
              isWrong={false}
              onClick={() => handleEnglishSelect(pair.id)}
            />
          ))}
        </div>

        <div className="grid gap-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Deutsch
          </p>
          {rightPairs.map((pair) => (
            <MatchChip
              key={pair.id}
              pair={pair}
              side="base"
              isMatched={matchedPairIds.has(pair.id)}
              isSelected={false}
              isWrong={wrongPairId === pair.id}
              onClick={() => handleGermanSelect(pair.id)}
            />
          ))}
        </div>
      </div>

      {wrongPairId && (
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-2)_76%,transparent)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
          <X className="h-4 w-4 text-[var(--text-muted)]" />
          {t('today.matchPairs.wrong')}
        </div>
      )}
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
}: {
  pair: GuidedMatchPair
  side: 'target' | 'base'
  isMatched: boolean
  isSelected: boolean
  isWrong: boolean
  onClick: () => void
}) {
  const text = side === 'target' ? pair.targetText : pair.baseText

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isMatched}
      aria-pressed={isSelected || isMatched}
      className={cn(
        'group flex min-h-12 min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:px-4',
        isMatched
          ? 'border-[color-mix(in_srgb,var(--accent)_48%,transparent)] bg-[var(--accent-soft)] text-[var(--text-primary)]'
          : 'border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_64%,transparent)] text-[var(--text-primary)] hover:-translate-y-0.5',
        isSelected && 'border-[color-mix(in_srgb,var(--accent)_62%,transparent)] bg-[color-mix(in_srgb,var(--accent-soft)_72%,transparent)]',
        isWrong && 'border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--surface-2)_84%,transparent)]',
      )}
    >
      <span className="min-w-0 whitespace-normal break-normal leading-snug">{text}</span>
      {isMatched && <Check className="h-4 w-4 shrink-0 text-[var(--accent)]" />}
      {isWrong && !isMatched && <X className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />}
    </button>
  )
}

function orderGermanPairs(pairs: GuidedMatchPair[]) {
  const order = ['english', 'excuse-me', 'do-you-speak']
  return [...pairs].sort((left, right) => order.indexOf(left.id) - order.indexOf(right.id))
}
