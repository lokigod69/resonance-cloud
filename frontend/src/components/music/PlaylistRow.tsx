import { useRef, useState, useEffect } from 'react'
import { FileText, Music } from 'lucide-react'
import { trackHasAudio, type MusicTrack } from '@/hooks/useMusicPlayer'
import { useTranslation } from '@/hooks/useTranslation'
import { compactMusicCaptionSegment, resolveTrackMusicCaption } from '@/lib/musicDisplayMetadata'

// Duration cache: persists across component remounts within the same browser session
const durationCache = new Map<string, number>()

interface PlaylistRowProps {
  track: MusicTrack
  isActive: boolean
  isPlaying: boolean
  onClick: () => void
  onGenerateSong?: () => void
  onShowLyrics?: () => void
  isGeneratingSong?: boolean
  generationStatus?: string
}

function formatDuration(s: number): string {
  if (!isFinite(s) || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

// Tiny animated equalizer for the active + playing state
function Equalizer() {
  return (
    <div className="flex items-end gap-[2px] w-5 h-5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-1 rounded-sm bg-[var(--accent,#06b6d4)]"
          style={{
            animation: `eq-bar ${0.6 + i * 0.15}s ease-in-out infinite alternate`,
            height: `${40 + i * 20}%`,
          }}
        />
      ))}
      <style>{`
        @keyframes eq-bar {
          from { transform: scaleY(0.3); }
          to   { transform: scaleY(1); }
        }
      `}</style>
    </div>
  )
}

export function PlaylistRow({
  track,
  isActive,
  isPlaying,
  onClick,
  onGenerateSong,
  onShowLyrics,
  isGeneratingSong,
  generationStatus,
}: PlaylistRowProps) {
  const { t } = useTranslation()
  const [duration, setDuration] = useState<number | null>(() => {
    if (track.duration !== null) return track.duration
    return durationCache.get((track.suno_storage_url ?? track.suno_audio_url) ?? '') ?? null
  })
  const probeRef = useRef<HTMLAudioElement | null>(null)

  // Probe duration via lightweight audio element (preload=metadata, no actual playback)
  useEffect(() => {
    const url = track.suno_storage_url ?? track.suno_audio_url
    if (!url || duration !== null) return
    const audio = new Audio()
    audio.preload = 'metadata'
    probeRef.current = audio

    const handleMeta = () => {
      durationCache.set(url, audio.duration)
      setDuration(audio.duration)
    }
    audio.addEventListener('loadedmetadata', handleMeta)
    audio.src = url

    return () => {
      audio.removeEventListener('loadedmetadata', handleMeta)
      audio.src = ''
    }
  }, [track.suno_storage_url, track.suno_audio_url, duration])

  const hasAudio = trackHasAudio(track)
  const isDisabled = !hasAudio
  const displayGenre = compactMusicCaptionSegment(resolveTrackMusicCaption(track))

  return (
    <div
      role={isDisabled ? undefined : 'button'}
      tabIndex={isDisabled ? undefined : 0}
      onClick={isDisabled ? undefined : onClick}
      onKeyDown={isDisabled ? undefined : (e) => e.key === 'Enter' && onClick()}
      className={[
        'flex items-center gap-3 px-4 py-3 border-b border-border transition-colors',
        isActive ? 'bg-accent/20' : '',
        isDisabled
          ? 'opacity-60 cursor-default'
          : 'cursor-pointer hover:bg-accent/10',
      ].join(' ')}
    >
      {/* Thumbnail / equalizer */}
      <div className="w-14 h-14 rounded shrink-0 overflow-hidden bg-card/50 flex items-center justify-center">
        {isActive && isPlaying ? (
          <Equalizer />
        ) : track.thumbnail_url ? (
          <img
            src={track.thumbnail_url}
            alt={track.word}
            className="w-full h-full object-cover"
          />
        ) : (
          <Music size={16} className="text-muted-foreground" />
        )}
      </div>

      {/* Word + translation */}
      <div className="flex-1 min-w-0">
        <p className={`text-base truncate ${isActive ? 'text-foreground font-semibold' : 'text-foreground/75 font-medium'}`}>
          {track.word}
        </p>
        {track.translation && (
          <p className="text-sm text-muted-foreground truncate">{track.translation}</p>
        )}
      </div>

      {/* Deck name */}
      <p className="hidden sm:block text-xs text-muted-foreground truncate max-w-[120px] shrink-0">
        {track.deckName}
      </p>

      {/* Genre badge */}
      {displayGenre && (
        <span className="hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-card/50 text-muted-foreground shrink-0 truncate max-w-[100px]">
          {displayGenre}
        </span>
      )}

      {/* Duration / generation status.
          NOTE: The `text-red-500/70` below is an intentional token-system exception.
          Destructive/error icons are semantically theme-independent — a delete/error
          indicator should read as "danger red" in every theme, not flavored to the
          active palette. `text-destructive` resolves to a dark red that disappears on
          dark themes, and `text-destructive-foreground` is the text color FOR USE ON
          destructive surfaces (e.g. white on warm-linen), not a bright error-text
          token. Do not re-tokenize for a single consumer. */}
      <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0 text-right">
        {track.error ? (
          <span className="text-red-500/70 font-sans text-[10px]">—</span>
        ) : hasAudio ? (
          <span className="inline-flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onShowLyrics?.() }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/10 hover:text-[var(--accent,#06b6d4)] transition-colors"
              title={t('music.lyrics')}
              aria-label={t('music.lyrics')}
            >
              <FileText className="h-3.5 w-3.5" aria-hidden />
            </button>
            <span className="w-10 inline-block">
              {duration !== null ? formatDuration(duration) : '…'}
            </span>
          </span>
        ) : isGeneratingSong ? (
          <span className="text-muted-foreground font-sans text-[10px] flex items-center gap-1">
            <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {generationStatus === 'processing' || generationStatus === 'polling' || generationStatus === 'uploading'
              ? t('music.generatingSong')
              : t('deckview.queued')}
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onGenerateSong?.() }}
            className="text-[10px] text-muted-foreground hover:text-[var(--accent,#06b6d4)] transition-colors font-sans px-1 py-0.5 rounded hover:bg-accent/10"
            title={t('music.generateSong')}
          >
            <Music className="inline h-3 w-3 mr-1" />
            {t('music.generateSong')}
          </button>
        )}
      </span>
    </div>
  )
}
