import { ChevronLeft, Music2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getGuidedTodayPathOptions } from '@/data/guidedLessons'
import { guidedVibes, type ActiveGuidedVibeId } from '@/data/guidedVibes'
import type { GuidedSegmentReviewNumber } from '@/lib/guidedCheckpoint'
import { getGuidedTrophyWordsForSegment } from '@/lib/guidedTrophy'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { TrophyWordCard } from '@/components/today/trophy/TrophyWordCard'

type TrophyWordFallbackPanelProps = {
  pathId: string
  segment: GuidedSegmentReviewNumber
  vibe: ActiveGuidedVibeId
  backToTodayHref: string
}

export function TrophyWordFallbackPanel({
  pathId,
  segment,
  vibe,
  backToTodayHref,
}: TrophyWordFallbackPanelProps) {
  const { t } = useTranslation()
  const pathMetadata = getGuidedTodayPathOptions().find((path) => path.id === pathId)
  const trophyWords = getGuidedTrophyWordsForSegment(pathId, segment, vibe)
  const vibeLabel = guidedVibes[vibe]?.label ?? vibe
  const pathLabel = pathMetadata?.shortTitle ?? pathMetadata?.title ?? pathId

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {t('today.trophy.panelKicker', { segment })}
            </p>
            <h1 className="mt-1 break-words text-3xl font-semibold leading-tight text-[var(--text-primary)]">
              {t('today.trophy.fallbackTitle')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
              {t('today.trophy.fallbackBody')}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <MetadataPill label="Path" value={pathLabel} />
              <MetadataPill label="Voice" value={vibeLabel} />
              <MetadataPill label="Segment" value={String(segment)} />
            </div>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-sm text-[var(--text-secondary)]">
            <Music2 className="h-4 w-4 text-[var(--accent)]" />
            {t('today.trophy.panelBadge')}
          </span>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {trophyWords.map((trophyWord) => (
          <TrophyWordCard key={trophyWord.word} trophyWord={trophyWord} />
        ))}
      </section>

      <section className="today-trophy-player rounded-lg border border-[var(--border-subtle)] p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {t('today.trophy.player.title')}
        </p>
        <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
          {t('today.trophy.player.comingSoon')}
        </p>
      </section>
    </main>
  )
}

function MetadataPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
      <span className="font-semibold text-[var(--text-primary)]">{label}</span>
      <span>{value}</span>
    </span>
  )
}
