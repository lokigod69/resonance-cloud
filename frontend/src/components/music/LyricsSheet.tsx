import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Loader2, X } from 'lucide-react'
import type { MusicTrack } from '@/hooks/useMusicPlayer'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import {
  cleanDisplayLyrics,
  extractMusicLyrics,
  extractMusicLyricsTranslation,
} from '@/lib/musicLyrics'
import { compactMusicCaptionSegment, resolveTrackMusicCaption } from '@/lib/musicDisplayMetadata'
import { useTranslation } from '@/hooks/useTranslation'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { getThumbnailUrl } from '@/lib/imageUrls'

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

  useBodyScrollLock(open)

  useEffect(() => {
    if (!open || !track) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preserve existing sheet reset behavior.
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

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onOpenChange, open])

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

  function renderClassicCloseButton(className = '') {
    return (
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className={[
          'absolute z-20 flex h-8 w-8 items-center justify-center rounded-full border border-border/50 bg-background/70 text-muted-foreground shadow-sm backdrop-blur-xl transition hover:bg-background/90 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        ].join(' ')}
        aria-label="Close"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    )
  }

  function renderLyricsPanel(label: string, lyrics: string | null, className = '') {
    if (!lyrics) return null
    const shellModifier = variant === 'glassy' ? 'lyrics-shell--glassy' : 'lyrics-shell--classic'
    return (
      <section
        className={[
          'lyrics-shell',
          shellModifier,
          'pointer-events-auto flex min-h-0 min-w-0 flex-col',
          className,
        ].join(' ')}
      >
        {hasTranslation ? (
          <h3 className="mb-2 text-xs font-medium uppercase tracking-normal text-[var(--text-muted)]">
            {label}
          </h3>
        ) : null}
        <div
          data-lyrics-scroll-shell
          className="lyrics-scroll-fade flex-1"
        >
          <div
            data-lyrics-scroll-body
            data-body-scroll-lock-scrollable="true"
            className="h-full max-h-[min(56dvh,36rem)] min-h-[min(38dvh,22rem)] overflow-y-auto overscroll-contain flex justify-center px-2 py-6 sm:max-h-[min(58dvh,38rem)] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            <pre
              className="inline-block max-w-full whitespace-pre-wrap text-left font-sans text-[15px] leading-7 [text-shadow:_0_1px_1px_rgba(0,0,0,0.22)]"
            >
              {lyrics}
            </pre>
          </div>
        </div>
      </section>
    )
  }

  function renderStatusBody() {
    if (state.status === 'loading') {
      return (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {t('music.lyrics.loading')}
        </div>
      )
    }
    if (state.status === 'error') {
      return (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{state.error || t('music.lyrics.error')}</span>
        </div>
      )
    }
    return <p className="py-8 text-sm text-muted-foreground">{t('music.lyrics.empty')}</p>
  }

  function renderStatusShell(extraClassName = '') {
    const shellModifier = variant === 'glassy' ? 'lyrics-shell--glassy' : 'lyrics-shell--classic'
    return (
      <section
        className={[
          'lyrics-shell',
          shellModifier,
          'pointer-events-auto flex min-h-0 min-w-0 flex-col items-center justify-center',
          extraClassName,
        ].filter(Boolean).join(' ')}
      >
        {renderStatusBody()}
      </section>
    )
  }

  if (!open) return null

  const portalTarget = typeof document === 'undefined' ? null : document.body
  if (!portalTarget) return null

  if (variant === 'glassy') {

    const renderGlassyCloseButton = (className = '') => (
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className={[
          'pointer-events-auto absolute z-20 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--glass-bg,rgba(12,12,18,0.72))] text-[var(--text-muted)] backdrop-blur-xl transition hover:text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
          className,
        ].join(' ')}
        aria-label="Close"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    )

    return createPortal(
      <div
        data-glassy-lyrics-layer
        className="pointer-events-none fixed inset-x-0 top-0 z-[60]"
        style={{ height: '100dvh' }}
      >
        <div className="hidden h-full items-center gap-6 px-6 pb-[calc(8rem+env(safe-area-inset-bottom,0px))] pt-24 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(18rem,28rem)_minmax(0,1fr)]">
          {hasTranslation
            ? renderLyricsPanel(t('music.lyrics.translation'), displayTranslation, 'lg:col-start-1')
            : null}
          {hasTranslation || displayOriginal ? <div className="lg:col-start-2" aria-hidden /> : null}
          {displayOriginal
            ? renderLyricsPanel(t('music.lyrics.original'), displayOriginal, 'lg:col-start-3')
            : renderStatusShell('lg:col-start-2')}
          {renderGlassyCloseButton('right-6 top-20')}
        </div>

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="pointer-events-auto absolute left-0 right-0 z-0 bg-black/60 backdrop-blur-sm lg:hidden"
          style={{
            top: 'var(--glassy-header-offset)',
            bottom: 'calc(7rem + env(safe-area-inset-bottom, 0px) + var(--mobile-bottom-nav-overlay-gap))',
          }}
          aria-label="Close"
        />

        <div
          className="lyrics-shell lyrics-shell--glassy pointer-events-auto absolute inset-x-3 z-10 flex flex-col lg:hidden"
          style={{
            position: 'absolute',
            top: 'calc(var(--glassy-header-offset) + 1rem)',
            bottom: 'calc(7rem + env(safe-area-inset-bottom, 0px) + var(--mobile-bottom-nav-overlay-gap) + 1rem)',
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-3 pr-10">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{track?.word ?? t('music.lyrics')}</p>
              {track?.translation ? (
                <p className="truncate text-xs text-[var(--text-muted)]">{track.translation}</p>
              ) : null}
            </div>
          </div>
          {hasTranslation ? (
            <div className="mb-3 grid grid-cols-2 rounded-full bg-[var(--field-bg)] p-1">
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
          {mobileLyrics ? (
            <div className="relative flex min-h-0 flex-1">
              <div
                data-lyrics-scroll-shell
                data-body-scroll-lock-scrollable="true"
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                <div
                  data-lyrics-scroll-body
                  className="min-h-full flex items-center justify-center px-2 py-5"
                >
                  <pre
                    className="inline-block max-w-full whitespace-pre-wrap text-left font-sans text-[15px] leading-7 [text-shadow:_0_1px_1px_rgba(0,0,0,0.22)]"
                  >
                    {mobileLyrics}
                  </pre>
                </div>
              </div>
              <div
                className="lyrics-scroll-fade pointer-events-none inset-0"
                style={{ position: 'absolute' }}
                aria-hidden
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              {renderStatusBody()}
            </div>
          )}
          {renderGlassyCloseButton('right-3 top-3')}
        </div>
      </div>,
      portalTarget,
    )
  }

  return createPortal(
    <div
      data-classic-lyrics-layer
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex items-center justify-center px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px)+var(--mobile-bottom-nav-overlay-gap))] pt-[calc(var(--app-safe-top)+4.5rem)]"
      style={{ height: '100dvh' }}
    >
      <section className="pointer-events-auto relative flex min-h-0 w-full max-w-[min(1180px,calc(100vw-2rem))] max-h-[calc(100dvh-9.5rem)] flex-col overflow-hidden rounded-xl border border-border/45 bg-gradient-to-br from-background/88 via-background/76 to-muted/58 p-4 text-foreground shadow-[0_28px_90px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/72 sm:p-5">
        {renderClassicCloseButton('right-3 top-3')}

        <header className="flex min-w-0 items-start gap-3 pr-10">
          {track?.thumbnail_url ? (
            <img
              src={getThumbnailUrl(track.thumbnail_url, { size: 128, format: 'webp' }) ?? undefined}
              alt={track.word}
              className="h-12 w-12 shrink-0 rounded-md border border-border/50 object-cover shadow-md"
              draggable={false}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
              {t('music.lyrics')}
            </p>
            <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
              <h2 className="truncate text-lg font-semibold leading-tight text-foreground">
                {track?.word ?? t('music.lyrics.noTrack')}
              </h2>
              {track?.translation ? (
                <p className="truncate text-sm text-muted-foreground">{track.translation}</p>
              ) : null}
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {[genre, formatMode(lyricMode, t)].filter(Boolean).join(' - ')}
            </p>
          </div>
        </header>

        <div className="mt-4 min-h-0 flex-1">
          {state.status === 'ready' && displayOriginal ? (
            <div className="flex min-h-0 flex-col gap-4">
              {hasTranslation ? (
                <div className="grid grid-cols-2 rounded-full bg-muted/35 p-1 lg:hidden">
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

              {hasTranslation ? (
                <div
                  data-lyrics-desktop-columns
                  className="hidden min-h-0 grid-cols-1 gap-5 lg:grid lg:grid-cols-2"
                >
                  {renderLyricsPanel(t('music.lyrics.translation'), displayTranslation)}
                  {renderLyricsPanel(t('music.lyrics.original'), displayOriginal)}
                </div>
              ) : (
                <div
                  data-lyrics-single-column
                  className="mx-auto grid min-h-0 w-full max-w-3xl grid-cols-1 gap-4"
                >
                  {renderLyricsPanel(t('music.lyrics.original'), displayOriginal)}
                </div>
              )}

              {hasTranslation ? (
                <div className="lg:hidden">
                  {renderLyricsPanel(
                    translationView === 'translation'
                      ? t('music.lyrics.translation')
                      : t('music.lyrics.original'),
                    mobileLyrics,
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="px-1">{renderStatusBody()}</div>
          )}
        </div>
      </section>
    </div>,
    portalTarget,
  )
}
