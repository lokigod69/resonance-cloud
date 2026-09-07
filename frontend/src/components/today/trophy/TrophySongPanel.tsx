import { ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  getGuidedPathMetadata,
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
  userId?: string
  backToTodayHref: string
  onComplete: (record: GuidedTrophyClozeRecord) => void
}

export function TrophySongPanel({ row, userId, backToTodayHref, onComplete }: TrophySongPanelProps) {
  const { t } = useTranslation()
  const [saveFailed, setSaveFailed] = useState(false)
  const pathMetadata = getGuidedPathMetadata(row.pathId)
  const trophyWords = getGuidedPathLessons(row.pathId)
    .filter((lesson) => (
      row.segment === 1
        ? lesson.lessonNumber >= 1 && lesson.lessonNumber <= 5
        : lesson.lessonNumber >= 6 && lesson.lessonNumber <= 10
    ))
    .map((lesson) => resolveGuidedLessonVariant(lesson, row.vibe).trophyWord)

  const handleDrillComplete = (items: GuidedTrophyClozeItem[]) => {
    const result = writeGuidedTrophyClozeRecord(
      userId,
      createGuidedTrophyClozeRecord(row.pathId, row.vibe, row.segment, items),
    )
    if (!result.saved) {
      setSaveFailed(true)
      return false
    }
    onComplete(result.record)
    return true
  }

  return (
    <main
      className="today-shell today-checkpoint-shell today-checkpoint-page today-trophy-page relative isolate mx-auto grid min-h-dvh w-full content-start"
      data-guided-vibe={row.vibe}
    >
      <header className="today-trophy-header">
        <Button asChild type="button" variant="ghost" size="sm" className="today-checkpoint-back">
          <Link to={backToTodayHref}>
            <ChevronLeft className="h-4 w-4" />
            {t('today.checkpoint.backToToday')}
          </Link>
        </Button>
        <h1 className="today-trophy-title">
          {t('today.trophy.panelTitle')}
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
        targetLanguage={pathMetadata?.targetLanguage ?? ''}
        onComplete={handleDrillComplete}
      />
      {saveFailed && (
        <section className="rounded-lg border border-[color-mix(in_srgb,#f59e0b_48%,var(--border-subtle))] p-4 text-center" role="alert">
          <p className="text-sm text-[var(--text-secondary)]">{t('errors.route.title')}</p>
          <Button type="button" variant="outline" className="mt-3" onClick={() => setSaveFailed(false)}>
            {t('errors.route.retry')}
          </Button>
        </section>
      )}
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
  const { t } = useTranslation()

  return (
    <section className="today-trophy-lyrics">
      <div className="grid gap-4 lg:grid-cols-2">
        <LyricColumn title={t('today.trophy.lyrics.targetTitle')} body={displayLyrics} />
        <LyricColumn title={t('today.trophy.lyrics.baseTitle')} body={lyricsTranslationDe} />
      </div>
    </section>
  )
}

function LyricColumn({ title, body }: { title: string; body: string }) {
  return (
    <article className="today-trophy-lyricColumn">
      <h2 className="text-sm font-semibold text-[var(--text-primary)]">
        {title}
      </h2>
      <pre className="mt-3 max-h-[520px] overflow-auto whitespace-pre-wrap break-words font-sans text-sm leading-7 text-[var(--text-secondary)]">
        {body}
      </pre>
    </article>
  )
}
