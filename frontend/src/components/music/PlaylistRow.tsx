import { useRef, useState, useEffect } from 'react'
import { Music } from 'lucide-react'
import type { MusicTrack } from '@/hooks/useMusicPlayer'

// Duration cache: persists across component remounts within the same browser session
const durationCache = new Map<string, number>()

interface PlaylistRowProps {
  track: MusicTrack
  isActive: boolean
  isPlaying: boolean
  onClick: () => void
  onRetry?: () => void
  isRetrying?: boolean
  retryStatus?: string
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

export function PlaylistRow({ track, isActive, isPlaying, onClick, onRetry, isRetrying, retryStatus }: PlaylistRowProps) {
  const [duration, setDuration] = useState<number | null>(() => {
    if (track.duration !== null) return track.duration
    return durationCache.get(track.suno_audio_url ?? '') ?? null
  })
  const probeRef = useRef<HTMLAudioElement | null>(null)

  // Probe duration via lightweight audio element (preload=metadata, no actual playback)
  useEffect(() => {
    if (!track.suno_audio_url || duration !== null) return
    const audio = new Audio()
    audio.preload = 'metadata'
    probeRef.current = audio

    const handleMeta = () => {
      durationCache.set(track.suno_audio_url!, audio.duration)
      setDuration(audio.duration)
    }
    audio.addEventListener('loadedmetadata', handleMeta)
    audio.src = track.suno_audio_url

    return () => {
      audio.removeEventListener('loadedmetadata', handleMeta)
      audio.src = ''
    }
  }, [track.suno_audio_url, duration])

  const hasAudio = !!track.suno_audio_url && !track.error
  const isDisabled = !hasAudio

  return (
    <div
      role={isDisabled ? undefined : 'button'}
      tabIndex={isDisabled ? undefined : 0}
      onClick={isDisabled ? undefined : onClick}
      onKeyDown={isDisabled ? undefined : (e) => e.key === 'Enter' && onClick()}
      className={[
        'flex items-center gap-3 px-4 py-3 border-b border-white/5 transition-colors',
        isActive ? 'bg-white/5' : '',
        isDisabled
          ? 'opacity-60 cursor-default'
          : 'cursor-pointer hover:bg-white/5',
      ].join(' ')}
    >
      {/* Thumbnail / equalizer */}
      <div className="w-14 h-14 rounded shrink-0 overflow-hidden bg-white/5 flex items-center justify-center">
        {isActive && isPlaying ? (
          <Equalizer />
        ) : track.thumbnail_url ? (
          <img
            src={track.thumbnail_url}
            alt={track.word}
            className="w-full h-full object-cover"
          />
        ) : (
          <Music size={16} className="text-gray-600" />
        )}
      </div>

      {/* Word + translation */}
      <div className="flex-1 min-w-0">
        <p className={`text-base font-medium truncate ${isActive ? 'text-white' : 'text-gray-200'}`}>
          {track.word}
        </p>
        {track.translation && (
          <p className="text-sm text-gray-500 truncate">{track.translation}</p>
        )}
      </div>

      {/* Deck name */}
      <p className="hidden sm:block text-xs text-gray-600 truncate max-w-[120px] shrink-0">
        {track.deckName}
      </p>

      {/* Genre badge */}
      {track.genre && (
        <span className="hidden md:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-gray-500 shrink-0 truncate max-w-[100px]">
          {track.genre}
        </span>
      )}

      {/* Duration / retry status */}
      <span className="text-[11px] font-mono text-gray-500 tabular-nums shrink-0 text-right">
        {track.error ? (
          <span className="text-red-500/70 font-sans text-[10px]">—</span>
        ) : hasAudio ? (
          <span className="w-10 inline-block">
            {duration !== null ? formatDuration(duration) : '…'}
          </span>
        ) : isRetrying ? (
          <span className="text-gray-400 font-sans text-[10px] flex items-center gap-1">
            <svg className="animate-spin h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {retryStatus === 'processing' ? 'Generating…' : 'Queued'}
          </span>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onRetry?.() }}
            className="text-[10px] text-gray-500 hover:text-[var(--accent,#06b6d4)] transition-colors font-sans px-1 py-0.5 rounded hover:bg-white/5"
            title="Retry Suno generation"
          >
            ↻ Retry
          </button>
        )}
      </span>
    </div>
  )
}
