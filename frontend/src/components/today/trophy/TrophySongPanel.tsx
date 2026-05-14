import { ChevronLeft, Music2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  getGuidedPathLessons,
  resolveGuidedLessonVariant,
} from '@/data/guidedLessons'
import type { TrophySongRow } from '@/lib/trophySongsClient'
import {
  createGuidedTrophyClozeRecord,
  writeGuidedTrophyClozeRecord,
  type GuidedTrophyClozeItem,
  type GuidedTrophyClozeRecord,
} from '@/lib/guidedTrophy'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { TrophyLyricClozeDrill } from '@/components/today/trophy/TrophyLyricClozeDrill'
import { TrophySongPlayer } from '@/components/today/trophy/TrophySongPlayer'
import { TrophyWordCard } from '@/components/today/trophy/TrophyWordCard'

type TrophySongPanelProps = {
  row: TrophySongRow
  onComplete: (record: GuidedTrophyClozeRecord) => void
}

export function TrophySongPanel({ row, onComplete }: TrophySongPanelProps) {
  const { t } = useTranslation()
  const trophyWords = getGuidedPathLessons(row.pathId)
    .filter((lesson) => (
      row.segment === 1
        ? lesson.lessonNumber >= 1 && lesson.lessonNumber <= 5
        : lesson.lessonNumber >= 6 && lesson.lessonNumber <= 10
    ))
    .map((lesson) => resolveGuidedLessonVariant(lesson, row.vibe).trophyWord)

  const handleDrillComplete = (items: GuidedTrophyClozeItem[]) => {
    const record = writeGuidedTrophyClozeRecord(
      createGuidedTrophyClozeRecord(row.pathId, row.vibe, row.segment, items),
    )
    onComplete(record)
  }

  return (
    <main
      className="today-shell today-checkpoint-shell relative isolate mx-auto grid min-h-dvh w-full max-w-5xl content-start gap-5 px-4 py-4 sm:px-6 lg:py-8"
      data-guided-vibe={row.vibe}
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
          <Link to="/today">
            <ChevronLeft className="h-4 w-4" />
            {t('today.checkpoint.backToToday')}
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {t('today.trophy.panelKicker', { segment: row.segment })}
            </p>
            <h1 className="mt-1 break-words text-3xl font-semibold leading-tight text-[var(--text-primary)]">
              {t('today.trophy.panelTitle')}
            </h1>
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

      <TrophySongPlayer audioUrl={row.audioPublicUrl} caption={row.musicCaption} />

      <TrophyLyricClozeDrill
        lyricsDisplay={row.lyricsDisplay}
        clozePositions={row.clozePositions}
        trophyWords={row.trophyWords}
        onComplete={handleDrillComplete}
      />
    </main>
  )
}
