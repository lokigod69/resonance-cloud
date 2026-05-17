import { ChevronLeft } from 'lucide-react'
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
  backToTodayHref: string
  onComplete: (record: GuidedTrophyClozeRecord) => void
}

export function TrophySongPanel({ row, backToTodayHref, onComplete }: TrophySongPanelProps) {
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
          <Link to={backToTodayHref}>
            <ChevronLeft className="h-4 w-4" />
            {t('today.checkpoint.backToToday')}
          </Link>
        </Button>
        <h1 className="break-words text-3xl font-semibold leading-tight text-[var(--text-primary)]">
          {t('today.trophy.panelTitle')}
        </h1>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {trophyWords.map((trophyWord) => (
          <TrophyWordCard key={trophyWord.word} trophyWord={trophyWord} />
        ))}
      </section>

      <TrophySongPlayer
        catalogId={row.id}
        audioStatus={row.audioStatus}
        audioCandidates={row.audioCandidates}
        activeCandidateDefault={row.activeCandidateDefault}
        caption={row.musicCaption}
      />

      <TrophyLyricsReview
        displayLyrics={row.displayLyrics}
        lyricsTranslationDe={row.lyricsTranslationDe}
      />

      <TrophyLyricClozeDrill
        lyricsDisplay={row.lyricsDisplay}
        clozePositions={row.clozePositions}
        trophyWords={row.trophyWords}
        onComplete={handleDrillComplete}
      />
    </main>
  )
}

function TrophyLyricsReview({
  displayLyrics,
  lyricsTranslationDe,
}: {
  displayLyrics: string
  lyricsTranslationDe: string
}) {
  return (
    <section className="today-trophy-lyrics rounded-lg border border-[var(--border-subtle)] p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <LyricColumn title="English lyrics" body={displayLyrics} />
        <LyricColumn title="German translation" body={lyricsTranslationDe} />
      </div>
    </section>
  )
}

function LyricColumn({ title, body }: { title: string; body: string }) {
  return (
    <article className="min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-1)_52%,transparent)] p-4">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-7 text-[var(--text-secondary)]">
        {body}
      </pre>
    </article>
  )
}
