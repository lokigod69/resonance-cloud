import { useEffect, useState } from 'react'
import { AlertCircle, FileText, Loader2 } from 'lucide-react'
import type { MusicTrack } from '@/hooks/useMusicPlayer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { extractMusicLyrics } from '@/lib/musicLyrics'
import { compactMusicCaptionSegment, resolveTrackMusicCaption } from '@/lib/musicDisplayMetadata'
import { useTranslation } from '@/hooks/useTranslation'

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
  | { status: 'idle'; lyrics: null; row: null; error: null }
  | { status: 'loading'; lyrics: null; row: null; error: null }
  | { status: 'ready'; lyrics: string | null; row: LyricsJobRow | null; error: null }
  | { status: 'error'; lyrics: null; row: null; error: string }

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
    error: null,
  })

  useEffect(() => {
    if (!open || !track) {
      setState({ status: 'idle', lyrics: null, row: null, error: null })
      return
    }

    let cancelled = false

    async function loadLyrics() {
      if (!track) return
      setState({ status: 'loading', lyrics: null, row: null, error: null })

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
        lyrics: result?.lyrics ?? null,
        row,
        error: null,
      })
    }

    void loadLyrics()

    return () => {
      cancelled = true
    }
  }, [open, track, t])

  const row = state.row
  const genre = compactMusicCaptionSegment(
    resolveTrackMusicCaption(track, {
      status: 'complete',
      music_caption: row?.music_caption ?? null,
      concept_artifact: row?.concept_artifact ?? null,
    }),
  ) || t('music.lyrics.unknown')
  const lyricMode =
    textValue(row?.lyric_mode) ||
    textValue(track?.song_generation?.lyric_mode) ||
    null

  const contentClassName = [
    'top-auto bottom-0 left-0 translate-x-0 translate-y-0 max-w-none rounded-b-none rounded-t-2xl',
    'max-h-[calc(100dvh-1rem)] border-border/70 p-0',
    'sm:top-[50%] sm:left-[50%] sm:bottom-auto sm:translate-x-[-50%] sm:translate-y-[-50%]',
    'sm:max-w-[min(900px,calc(100vw-2rem))] sm:max-h-[70dvh] sm:rounded-lg',
    variant === 'glassy'
      ? 'border-[var(--border-subtle)] bg-[var(--glass-bg,rgba(10,10,14,0.82))] text-[var(--text-primary)] shadow-2xl backdrop-blur-2xl'
      : 'bg-background text-foreground',
  ].join(' ')

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
          ) : state.status === 'ready' && state.lyrics ? (
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

              <div className="grid grid-cols-1">
                <pre className="max-h-[calc(70dvh-12rem)] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/30 p-5 text-sm leading-6 text-foreground font-sans">
                  {state.lyrics}
                </pre>
              </div>
            </div>
          ) : (
            <p className="py-8 text-sm text-muted-foreground">{t('music.lyrics.empty')}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
