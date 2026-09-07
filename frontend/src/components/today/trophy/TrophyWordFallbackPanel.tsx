import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getGuidedPathMetadata } from '@/data/guidedLessons'
import type { ActiveGuidedVibeId } from '@/data/guidedVibes'
import type { GuidedSegmentReviewNumber } from '@/lib/guidedCheckpoint'
import {
  createGuidedTrophyWordReviewRecord,
  getGuidedTrophyWordsForSegment,
  writeGuidedTrophyClozeRecord,
  type GuidedTrophyClozeRecord,
} from '@/lib/guidedTrophy'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { TrophyWordCard } from '@/components/today/trophy/TrophyWordCard'

type TrophyWordFallbackPanelProps = {
  pathId: string
  segment: GuidedSegmentReviewNumber
  vibe: ActiveGuidedVibeId
  backToTodayHref: string
  userId?: string
  onComplete: (record: GuidedTrophyClozeRecord) => void
}

export function TrophyWordFallbackPanel({
  pathId,
  segment,
  vibe,
  backToTodayHref,
  userId,
  onComplete,
}: TrophyWordFallbackPanelProps) {
  const { t } = useTranslation()
  const [saveFailed, setSaveFailed] = useState(false)
  const pathMetadata = getGuidedPathMetadata(pathId)
  const trophyWords = getGuidedTrophyWordsForSegment(pathId, segment, vibe)
  const handleComplete = () => {
    const result = writeGuidedTrophyClozeRecord(
      userId,
      createGuidedTrophyWordReviewRecord(pathId, vibe, segment),
    )
    if (!result.saved) {
      setSaveFailed(true)
      return
    }
    onComplete(result.record)
  }

  return (
    <main
      className="today-shell today-checkpoint-shell today-checkpoint-page today-trophy-page relative isolate mx-auto grid min-h-dvh w-full content-start"
      data-guided-vibe={vibe}
    >
      <header className="today-trophy-header">
        <Button asChild type="button" variant="ghost" size="sm" className="today-checkpoint-back">
          <Link to={backToTodayHref}>
            <ChevronLeft className="h-4 w-4" />
            {t('today.checkpoint.backToToday')}
          </Link>
        </Button>
        <h1 className="today-trophy-title">
          {t('today.trophy.fallbackTitle')}
        </h1>
      </header>

      <section className="today-trophy-wordGrid">
        {trophyWords.map((trophyWord) => (
          <TrophyWordCard
            key={trophyWord.word}
            trophyWord={trophyWord}
            authoredBaseLanguage={pathMetadata?.baseLanguage ?? 'German'}
          />
        ))}
      </section>

      <section className="today-trophy-player">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {t('today.trophy.player.comingSoon')}
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          {t('today.trophy.fallbackBody')}
        </p>
        <Button type="button" className="today-checkpoint-primaryAction mt-4" onClick={handleComplete}>
          {t('today.checkpoint.done')}
        </Button>
        {saveFailed && (
          <div className="mt-4" role="alert">
            <p className="text-sm text-[var(--text-secondary)]">{t('errors.route.title')}</p>
            <Button type="button" variant="outline" className="mt-3" onClick={() => setSaveFailed(false)}>
              {t('errors.route.retry')}
            </Button>
          </div>
        )}
      </section>
    </main>
  )
}
