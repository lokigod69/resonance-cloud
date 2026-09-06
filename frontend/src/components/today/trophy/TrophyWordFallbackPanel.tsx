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
      className="today-shell today-checkpoint-shell relative isolate mx-auto grid min-h-dvh w-full max-w-5xl content-start gap-5 px-4 py-4 sm:px-6 lg:py-8"
      data-guided-vibe={vibe}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] opacity-70"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--today-glow) 34%, transparent), transparent 58%), linear-gradient(180deg, color-mix(in srgb, var(--surface-glass) 42%, transparent), transparent)',
        }}
        aria-hidden="true"
      />

      <section className="theme-panel today-trophy-panel rounded-lg border p-4 sm:p-6">
        <Button asChild type="button" variant="ghost" size="sm" className="-ml-2 mb-4">
          <Link to={backToTodayHref}>
            <ChevronLeft className="h-4 w-4" />
            {t('today.checkpoint.backToToday')}
          </Link>
        </Button>
        <h1 className="break-words text-3xl font-semibold leading-tight text-[var(--text-primary)]">
          {t('today.trophy.fallbackTitle')}
        </h1>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {trophyWords.map((trophyWord) => (
          <TrophyWordCard
            key={trophyWord.word}
            trophyWord={trophyWord}
            authoredBaseLanguage={pathMetadata?.baseLanguage ?? 'German'}
          />
        ))}
      </section>

      <section className="today-trophy-player rounded-lg border border-[var(--border-subtle)] p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {t('today.trophy.player.comingSoon')}
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          {t('today.trophy.fallbackBody')}
        </p>
        <Button type="button" className="mt-4" onClick={handleComplete}>
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
