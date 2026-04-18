import { SkipBack, SkipForward, Play, Pause, Repeat, Repeat1, Shuffle } from 'lucide-react'
import { VolumeControl } from '@/components/VolumeControl'
import { SimulatedWaveform } from './SimulatedWaveform'
import type { MusicTrack, RepeatMode } from '@/hooks/useMusicPlayer'
import type { RefObject } from 'react'

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
  onEnded,
  onTimeUpdate,
  onLoadedMetadata,
  onError,
  onPlay,
  onPause,
}: PlayerBarProps) {
  const progress = duration > 0 ? currentTime / duration : 0

  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  return (
    <div className="fixed bottom-0 inset-x-0 h-16 bg-secondary backdrop-blur-sm border-t border-border z-50 flex items-center px-4 gap-4">
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

      {/* Left: transport controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onPrev}
          disabled={!currentTrack}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous"
        >
          <SkipBack size={16} />
        </button>

        <button
          onClick={onTogglePlay}
          disabled={!currentTrack}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
        </button>

        <button
          onClick={onNext}
          disabled={!currentTrack}
          className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Next"
        >
          <SkipForward size={16} />
        </button>
      </div>

      {/* Center: waveform + time */}
      <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0 justify-center sm:justify-start">
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

        <span className="text-[11px] font-mono text-muted-foreground tabular-nums shrink-0 w-10">
          {formatTime(duration)}
        </span>
      </div>

      {/* Right: shuffle, repeat, volume */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onToggleShuffle}
          className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
            shuffle ? 'text-[var(--accent,#06b6d4)]' : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
          }`}
          aria-label="Shuffle"
          title="Shuffle"
        >
          <Shuffle size={14} />
        </button>

        <button
          onClick={onCycleRepeat}
          className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
            repeatMode !== 'off'
              ? 'text-[var(--accent,#06b6d4)]'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
          }`}
          aria-label={`Repeat: ${repeatMode}`}
          title={repeatMode === 'off' ? 'Repeat off' : repeatMode === 'all' ? 'Repeat all' : 'Repeat one'}
        >
          <RepeatIcon size={14} />
        </button>

        <VolumeControl
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={onSetVolume}
          onToggleMute={onToggleMute}
          buttonClassName="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
          iconSize={14}
          popDirection="up"
        />
      </div>
    </div>
  )
}
