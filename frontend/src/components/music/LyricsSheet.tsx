import { useEffect, useState } from 'react'
import { AlertCircle, FileText, Loader2 } from 'lucide-react'
import type { MusicTrack } from '@/hooks/useMusicPlayer'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import {
  cleanDisplayLyrics,
  extractMusicLyrics,
  extractMusicLyricsTranslation,
} from '@/lib/musicLyrics'
import { compactMusicCaptionSegment, resolveTrackMusicCaption } from '@/lib/musicDisplayMetadata'
import { useTranslation } from '@/hooks/useTranslation'

type MusicLyricsRow = {
  id: string | null
  language: string | null
  language_code: string | null
  lyric_mode: string | null
  genre: string | null
  music_caption: string | null
  lyrics: string | null
  suno_lyrics: string | null
  display_lyrics: string | null
  translation_language: string | null
  translation_language_code: string | null
  translated_lyrics: string | null
  translation_status: string | null
  translation_model: string | null
  synced_lyrics: unknown
  created_at: string | null
}

type LyricsJobRow = {
  concept_artifact: Record<string, unknown> | null
  music_caption: string | null
  genre: string | null
  lyric_mode: string | null
  vocal_gender: string | null
  completed_at: string | null
  created_at: string | null
}

type LyricsState =
  | { status: 'idle'; lyrics: null; row: null; lyricsRow: null; error: null }
  | { status: 'loading'; lyrics: null; row: null; lyricsRow: null; error: null }
  | {
      status: 'ready'
      lyrics: { original: string | null; translation: string | null }
      row: LyricsJobRow | null
      lyricsRow: MusicLyricsRow | null
      error: null
    }
  | { status: 'error'; lyrics: null; row: null; lyricsRow: null; error: string }

type LyricsSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  track: MusicTrack | null
  variant?: 'classic' | 'glassy'
}

function textValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function formatMode(mode: string | null, t: (key: string) => string): string {
  if (!mode) return t('music.lyrics.unknown')
  const key = `music.lyrics.mode.${mode}`
  const translated = t(key)
  return translated === key ? mode : translated
}

export function LyricsSheet({
  open,
  onOpenChange,
  track,
  variant = 'classic',
}: LyricsSheetProps) {
  const { t } = useTranslation()
  const [state, setState] = useState<LyricsState>({
    status: 'idle',
    lyrics: null,
    row: null,
    lyricsRow: null,
    error: null,
  })
  const [translationView, setTranslationView] = useState<'original' | 'translation'>('original')

  useEffect(() => {
    if (!open || !track) {
      setState({ status: 'idle', lyrics: null, row: null, lyricsRow: null, error: null })
      setTranslationView('original')
      return
    }

    let cancelled = false

    async function loadLyrics() {
      if (!track) return
      setState({ status: 'loading', lyrics: null, row: null, lyricsRow: null, error: null })
      setTranslationView('original')

      const { data: lyricsData, error: lyricsError } = await supabase
        .from('music_lyrics')
        .select(`
          id,
          language,
          language_code,
          lyric_mode,
          genre,
          music_caption,
          lyrics,
          suno_lyrics,
          display_lyrics,
          translation_language,
          translation_language_code,
          translated_lyrics,
          translation_status,
          translation_model,
          synced_lyrics,
          created_at
        `)
        .eq('word_id', track.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (lyricsError) {
        setState({
          status: 'error',
          lyrics: null,
          row: null,
          lyricsRow: null,
          error: lyricsError.message || t('music.lyrics.error'),
        })
        return
      }

      const lyricsRow = (lyricsData ?? null) as MusicLyricsRow | null
      if (lyricsRow) {
        const result = extractMusicLyrics({
          musicLyricsRow: lyricsRow,
          songGeneration: track.song_generation,
        })
        setState({
          status: 'ready',
          lyrics: {
            original: result?.lyrics ?? null,
            translation: extractMusicLyricsTranslation(lyricsRow),
          },
          row: null,
          lyricsRow,
          error: null,
        })
        return
      }

      const { data, error } = await supabase
        .from('music_generation_jobs')
        .select('concept_artifact, music_caption, genre, lyric_mode, vocal_gender, completed_at, created_at')
        .eq('word_id', track.id)
        .eq('status', 'complete')
        .order('completed_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        setState({
          status: 'error',
          lyrics: null,
          row: null,
          lyricsRow: null,
          error: error.message || t('music.lyrics.error'),
        })
        return
      }

      const row = (data ?? null) as LyricsJobRow | null
      const result = extractMusicLyrics({
        conceptArtifact: row?.concept_artifact ?? null,
        songGeneration: track.song_generation,
      })
      setState({
        status: 'ready',
        lyrics: { original: result?.lyrics ?? null, translation: null },
        row,
        lyricsRow: null,
        error: null,
      })
    }

    void loadLyrics()

    return () => {
      cancelled = true
    }
  }, [open, track, t])

  const row = state.row
  const lyricsRow = state.lyricsRow
  const genre = compactMusicCaptionSegment(
    lyricsRow?.music_caption ||
      lyricsRow?.genre ||
      resolveTrackMusicCaption(track, {
        status: 'complete',
        music_caption: row?.music_caption ?? null,
        concept_artifact: row?.concept_artifact ?? null,
      }),
  ) || t('music.lyrics.unknown')
  const lyricMode =
    textValue(lyricsRow?.lyric_mode) ||
    textValue(row?.lyric_mode) ||
    textValue(track?.song_generation?.lyric_mode) ||
    null

  const contentClassName = [
    'max-w-[min(1040px,calc(100vw-2rem))] max-h-[82dvh] border-border/70 p-0 sm:max-h-[76dvh]',
    variant === 'glassy'
      ? 'border-[var(--border-subtle)] bg-[var(--glass-bg,rgba(10,10,14,0.82))] text-[var(--text-primary)] shadow-2xl backdrop-blur-2xl'
      : 'bg-background text-foreground',
  ].join(' ')
  const displayOriginal =
    state.status === 'ready' && state.lyrics.original
      ? cleanDisplayLyrics(state.lyrics.original)
      : null
  const displayTranslation =
    state.status === 'ready' && state.lyrics.translation
      ? cleanDisplayLyrics(state.lyrics.translation)
      : null
  const hasTranslation = Boolean(displayTranslation)
  const mobileLyrics =
    translationView === 'translation' && displayTranslation ? displayTranslation : displayOriginal

  function renderLyricsPanel(label: string, lyrics: string | null) {
    if (!lyrics) return null
    return (
      <section className="flex min-h-0 min-w-0 flex-col">
        {hasTranslation ? (
          <h3 className="mb-2 text-xs font-medium uppercase tracking-normal text-muted-foreground">
            {label}
          </h3>
        ) : null}
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-md before:absolute before:inset-x-0 before:top-0 before:z-10 before:h-6 before:bg-gradient-to-b before:from-background/80 before:to-transparent after:absolute after:inset-x-0 after:bottom-0 after:z-10 after:h-6 after:bg-gradient-to-t after:from-background/80 after:to-transparent before:pointer-events-none after:pointer-events-none">
          <pre
            className="h-full max-h-[min(54dvh,34rem)] overflow-y-auto whitespace-pre-wrap bg-muted/30 px-5 py-6 text-[15px] leading-7 text-foreground font-sans sm:max-h-[calc(76dvh-14rem)] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            {lyrics}
          </pre>
        </div>
      </section>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={contentClassName}>
        <DialogHeader className="pr-14">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" aria-hidden />
            {t('music.lyrics')}
          </DialogTitle>
          <DialogDescription>
            {track ? track.word : t('music.lyrics.noTrack')}
            {track?.translation ? ` - ${track.translation}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 px-6 pb-6">
          {state.status === 'loading' ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t('music.lyrics.loading')}
            </div>
          ) : state.status === 'error' ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{state.error || t('music.lyrics.error')}</span>
            </div>
          ) : state.status === 'ready' && displayOriginal ? (
            <div className="flex min-h-0 flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-muted-foreground">Word</p>
                  <p className="mt-1 truncate font-medium text-foreground">{track?.word ?? t('music.lyrics.unknown')}</p>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-muted-foreground">Translation</p>
                  <p className="mt-1 truncate font-medium text-foreground">{track?.translation || t('music.lyrics.unknown')}</p>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-muted-foreground">{t('music.lyrics.genre')}</p>
                  <p className="mt-1 font-medium text-foreground">{genre}</p>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-muted-foreground">{t('music.lyrics.lyricMode')}</p>
                  <p className="mt-1 font-medium text-foreground">{formatMode(lyricMode, t)}</p>
                </div>
              </div>

              {hasTranslation ? (
                <div className="grid grid-cols-2 rounded-md bg-muted/30 p-1 lg:hidden">
                  <Button
                    type="button"
                    variant={translationView === 'original' ? 'secondary' : 'ghost'}
                    size="sm"
                    aria-pressed={translationView === 'original'}
                    onClick={() => setTranslationView('original')}
                  >
                    {t('music.lyrics.original')}
                  </Button>
                  <Button
                    type="button"
                    variant={translationView === 'translation' ? 'secondary' : 'ghost'}
                    size="sm"
                    aria-pressed={translationView === 'translation'}
                    onClick={() => setTranslationView('translation')}
                  >
                    {t('music.lyrics.translation')}
                  </Button>
                </div>
              ) : null}

              <div className={hasTranslation ? 'grid-cols-1 gap-4 lg:grid-cols-2 hidden lg:grid' : 'mx-auto grid w-full max-w-3xl grid-cols-1 gap-4'}>
                {renderLyricsPanel(t('music.lyrics.original'), displayOriginal)}
                {hasTranslation ? renderLyricsPanel(t('music.lyrics.translation'), displayTranslation) : null}
              </div>

              {hasTranslation ? (
                <div className="lg:hidden">
                  {renderLyricsPanel(
                    translationView === 'translation' ? t('music.lyrics.translation') : t('music.lyrics.original'),
                    mobileLyrics,
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="py-8 text-sm text-muted-foreground">{t('music.lyrics.empty')}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
