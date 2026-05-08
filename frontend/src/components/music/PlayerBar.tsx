import { FileText, Music, SkipBack, SkipForward, Play, Pause, Repeat, Repeat1, Shuffle } from 'lucide-react'
import { VolumeControl } from '@/components/VolumeControl'
import { SimulatedWaveform } from './SimulatedWaveform'
import { trackHasAudio, type MusicTrack, type RepeatMode } from '@/hooks/useMusicPlayer'
import type { MouseEvent, PointerEvent, RefObject, TouchEvent } from 'react'
import {
  PLAYER_ACTIVE_TOGGLE_CLASS,
  PLAYER_BAR_CLASS,
  PLAYER_FOCUS_RING_CLASS,
  PLAYER_INACTIVE_TOGGLE_CLASS,
  PLAYER_SOFT_ICON_BUTTON_CLASS,
} from '@/lib/playerStyles'
import { getThumbnailUrl } from '@/lib/imageUrls'

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

interface PlayerBarProps {
  audioRef: RefObject<HTMLAudioElement | null>
  currentTrack: MusicTrack | null
  isPlaying: boolean
  repeatMode: RepeatMode
  shuffle: boolean
  volume: number
  isMuted: boolean
  currentTime: number
  duration: number
  onTogglePlay: () => void
  onNext: () => void
  onPrev: () => void
  onSeek: (ratio: number) => void
  onSetVolume: (v: number) => void
  onToggleMute: () => void
  onCycleRepeat: () => void
  onToggleShuffle: () => void
  onToggleLyrics?: () => void
  lyricsOpen?: boolean
  onEnded: () => void
  onTimeUpdate: () => void
  onLoadedMetadata: () => void
  onError: () => void
  onPlay: () => void
  onPause: () => void
}

export function PlayerBar({
  audioRef,
  currentTrack,
  isPlaying,
  repeatMode,
  shuffle,
  volume,
  isMuted,
  currentTime,
  duration,
  onTogglePlay,
  onNext,
  onPrev,
  onSeek,
  onSetVolume,
  onToggleMute,
  onCycleRepeat,
  onToggleShuffle,
  onToggleLyrics,
  lyricsOpen = false,
  onEnded,
  onTimeUpdate,
  onLoadedMetadata,
  onError,
  onPlay,
  onPause,
}: PlayerBarProps) {
  const progress = duration > 0 ? currentTime / duration : 0

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat
  const seekDisabled = !currentTrack || duration <= 0
  const showLyricsButton = Boolean(onToggleLyrics)
  const lyricsDisabled = !currentTrack || !trackHasAudio(currentTrack)

  const seekFromClientX = (clientX: number, target: HTMLDivElement) => {
    if (seekDisabled) return
    const rect = target.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onSeek(ratio)
  }

  const handleMobileSeekPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    seekFromClientX(e.clientX, e.currentTarget)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Some synthetic/mobile events do not expose a capturable pointer.
    }
  }

  const handleMobileSeekPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return
    seekFromClientX(e.clientX, e.currentTarget)
  }

  const handleMobileSeekMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    seekFromClientX(e.clientX, e.currentTarget)
  }

  const handleMobileSeekMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return
    seekFromClientX(e.clientX, e.currentTarget)
  }

  const handleMobileSeekTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    if (touch) seekFromClientX(touch.clientX, e.currentTarget)
  }

  const handleMobileSeekTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0]
    if (touch) seekFromClientX(touch.clientX, e.currentTarget)
  }

  return (
    <div className={PLAYER_BAR_CLASS}>
      {/* Hidden audio element — owned by useMusicPlayer */}
      <audio
        ref={audioRef}
        onEnded={onEnded}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onError={onError}
        onPlay={onPlay}
        onPause={onPause}
      />

      <style>{`
        .music-mobile-seek {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
          touch-action: pan-x;
        }
        .music-mobile-seek::-webkit-slider-runnable-track {
          height: 44px;
          background: transparent;
          border: 0;
        }
        .music-mobile-seek::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          margin-top: 13px;
          border-radius: 9999px;
          border: 2px solid var(--background, #0f172a);
          background: var(--accent, #06b6d4);
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
        }
        .music-mobile-seek::-moz-range-track {
          height: 44px;
          background: transparent;
          border: 0;
        }
        .music-mobile-seek::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          border: 2px solid var(--background, #0f172a);
          background: var(--accent, #06b6d4);
          box-shadow: 0 1px 6px rgba(0, 0, 0, 0.35);
        }
      `}</style>

      {/* Left: transport controls */}
      <div className="order-1 flex items-center gap-2 shrink-0">
        {currentTrack && (
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-card/50 border border-border">
            {currentTrack?.thumbnail_url ? (
              <img
                src={getThumbnailUrl(currentTrack.thumbnail_url, { size: 128, format: 'webp' }) ?? undefined}
                alt={currentTrack.word}
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <Music size={16} className="text-muted-foreground" aria-hidden />
            )}
          </div>
        )}

        <button
          onClick={onPrev}
          disabled={!currentTrack}
          className={`w-8 h-8 ${PLAYER_SOFT_ICON_BUTTON_CLASS}`}
          aria-label="Previous"
        >
          <SkipBack size={16} />
        </button>

        <button
          onClick={onTogglePlay}
          disabled={!currentTrack}
          className={`w-9 h-9 flex items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${PLAYER_FOCUS_RING_CLASS}`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <button
          onClick={onNext}
          disabled={!currentTrack}
          className={`w-8 h-8 ${PLAYER_SOFT_ICON_BUTTON_CLASS}`}
          aria-label="Next"
        >
          <SkipForward size={16} />
        </button>
      </div>

      {/* Center: waveform + time */}
      <div className="order-3 sm:order-2 basis-full sm:basis-auto flex-1 flex items-center gap-2 sm:gap-3 min-w-0 justify-center sm:justify-start">
        <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0 w-10 text-right">
          {formatTime(currentTime)}
        </span>

        {/* Waveform — desktop only */}
        <div className="hidden sm:block flex-1 h-8 min-w-0">
          <SimulatedWaveform
            seed={currentTrack?.id ?? ''}
            progress={progress}
            onSeek={onSeek}
            className="w-full h-full"
          />
        </div>

        <div
          className="relative sm:hidden flex-1 min-w-0 h-11 flex items-center cursor-pointer"
          onPointerDown={handleMobileSeekPointerDown}
          onPointerMove={handleMobileSeekPointerMove}
          onMouseDown={handleMobileSeekMouseDown}
          onMouseMove={handleMobileSeekMouseMove}
          onTouchStart={handleMobileSeekTouchStart}
          onTouchMove={handleMobileSeekTouchMove}
        >
          <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-white/20 pointer-events-none">
            <div
              className="h-full rounded-full bg-[var(--accent,#06b6d4)]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.001"
            value={progress}
            disabled={seekDisabled}
            onChange={(e) => onSeek(Number(e.currentTarget.value))}
            className="music-mobile-seek pointer-events-none absolute inset-0 w-full h-11 disabled:opacity-40"
            aria-label="Seek"
          />
        </div>

        <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0 w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Right: shuffle, repeat, volume */}
      <div className="order-2 sm:order-3 ml-auto sm:ml-0 flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleShuffle}
          className={`w-8 h-8 ${PLAYER_SOFT_ICON_BUTTON_CLASS} ${
            shuffle ? PLAYER_ACTIVE_TOGGLE_CLASS : PLAYER_INACTIVE_TOGGLE_CLASS
          }`}
          aria-label="Shuffle"
          title="Shuffle"
        >
          <Shuffle size={14} />
        </button>

        <button
          onClick={onCycleRepeat}
          className={`w-8 h-8 ${PLAYER_SOFT_ICON_BUTTON_CLASS} ${
            repeatMode !== 'off'
              ? PLAYER_ACTIVE_TOGGLE_CLASS
              : PLAYER_INACTIVE_TOGGLE_CLASS
          }`}
          aria-label={`Repeat: ${repeatMode}`}
          title={repeatMode === 'off' ? 'Repeat' : 'Repeat one'}
        >
          <RepeatIcon size={14} />
        </button>

        {showLyricsButton && (
          <button
            onClick={onToggleLyrics}
            disabled={lyricsDisabled}
            className={`w-8 h-8 ${PLAYER_SOFT_ICON_BUTTON_CLASS} ${
              lyricsOpen ? PLAYER_ACTIVE_TOGGLE_CLASS : PLAYER_INACTIVE_TOGGLE_CLASS
            }`}
            aria-pressed={lyricsOpen}
            aria-label="Lyrics"
            title="Lyrics"
          >
            <FileText size={14} />
          </button>
        )}

        <VolumeControl
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={onSetVolume}
          onToggleMute={onToggleMute}
          buttonClassName={`w-8 h-8 ${PLAYER_SOFT_ICON_BUTTON_CLASS}`}
          iconSize={14}
          popDirection="up"
          sliderAlign="end"
        />
      </div>
    </div>
  )
}
