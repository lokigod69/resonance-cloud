import { useEffect, useState } from 'react'
import { AlertCircle, FileText, Loader2 } from 'lucide-react'
import type { MusicTrack } from '@/hooks/useMusicPlayer'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { supabase } from '@/lib/supabase'
import { extractMusicLyrics } from '@/lib/musicLyrics'
import { useTranslation } from '@/hooks/useTranslation'

type LyricsJobRow = {
  concept_artifact: Record<string, unknown> | null
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
        .select('concept_artifact, genre, lyric_mode, vocal_gender, completed_at, created_at')
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
  const genre =
    textValue(row?.genre) ||
    textValue(track?.genre) ||
    textValue(track?.song_generation?.genre) ||
    t('music.lyrics.unknown')
  const lyricMode =
    textValue(row?.lyric_mode) ||
    textValue(track?.song_generation?.lyric_mode) ||
    null

  const side = variant === 'glassy' ? 'bottom' : 'right'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={
          variant === 'glassy'
            ? 'max-h-[48dvh] rounded-t-2xl border-[var(--border-subtle)] bg-[var(--glass-bg,rgba(10,10,14,0.92))] text-[var(--text-primary)] backdrop-blur-xl'
            : 'sm:max-w-md'
        }
      >
        <SheetHeader className="pr-14">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" aria-hidden />
            {t('music.lyrics')}
          </SheetTitle>
          <SheetDescription>
            {track ? track.word : t('music.lyrics.noTrack')}
            {track?.translation ? ` - ${track.translation}` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5">
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-muted-foreground">{t('music.lyrics.genre')}</p>
                  <p className="mt-1 font-medium text-foreground">{genre}</p>
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2">
                  <p className="text-muted-foreground">{t('music.lyrics.lyricMode')}</p>
                  <p className="mt-1 font-medium text-foreground">{formatMode(lyricMode, t)}</p>
                </div>
              </div>

              <pre className="whitespace-pre-wrap rounded-md bg-muted/30 p-4 text-sm leading-6 text-foreground font-sans">
                {state.lyrics}
              </pre>
            </div>
          ) : (
            <p className="py-8 text-sm text-muted-foreground">{t('music.lyrics.empty')}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
