import { useRef, useState, useCallback, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'
import { VolumeControl } from '@/components/VolumeControl'
import {
  PLAYER_AUDIO_ROW_CLASS,
  PLAYER_FOCUS_RING_CLASS,
  PLAYER_PROGRESS_FILL_CLASS,
  PLAYER_PROGRESS_TRACK_CLASS,
  PLAYER_SOFT_ICON_BUTTON_CLASS,
} from '@/lib/playerStyles'

interface AudioPlayerProps {
  src: string
  className?: string
}

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '-:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)

  const toggle = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (playing) { el.pause(); setPlaying(false) }
    else {
      if (el.ended || currentTime >= duration - 0.1) {
        el.currentTime = 0
        setCurrentTime(0)
      }
      el.play(); setPlaying(true)
    }
  }, [playing, currentTime, duration])

  const barRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const seekTo = useCallback((clientX: number) => {
    const el = audioRef.current
    const bar = barRef.current
    if (!el || !bar || !isFinite(duration) || duration === 0) return
    const rect = bar.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    el.currentTime = ratio * duration
  }, [duration])

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    seekTo(e.clientX)
  }, [seekTo])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: PointerEvent) => seekTo(e.clientX)
    const onUp = () => setDragging(false)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  }, [dragging, seekTo])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.volume = volume
    el.muted = muted || volume === 0
  }, [volume, muted])

  const handleVolumeChange = useCallback((nextVolume: number) => {
    setVolume(nextVolume)
    if (nextVolume > 0) setMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    setMuted(prev => !prev)
  }, [])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`${PLAYER_AUDIO_ROW_CLASS} ${className ?? ''}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration) }}
        onTimeUpdate={() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime) }}
        onEnded={() => setPlaying(false)}
      />

      {/* Play/Pause */}
      <button
        onClick={toggle}
        className={`w-7 h-7 ${PLAYER_SOFT_ICON_BUTTON_CLASS} ${
          playing ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      {/* Progress bar */}
      <div
        ref={barRef}
        className={`flex-1 h-4 flex items-center cursor-pointer group touch-none ${PLAYER_FOCUS_RING_CLASS}`}
        onPointerDown={onPointerDown}
      >
        <div className={`${PLAYER_PROGRESS_TRACK_CLASS} h-1 relative`}>
          <div
            className={`${PLAYER_PROGRESS_FILL_CLASS} ${dragging ? '' : 'transition-[width] duration-100'}`}
            style={{ width: `${progress}%` }}
          />
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[var(--accent)] transition-opacity ${dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            style={{ left: `calc(${progress}% - 5px)` }}
          />
        </div>
      </div>

      {/* Time */}
      <span className="text-[10px] font-mono text-[var(--text-muted)] tabular-nums flex-shrink-0 w-[72px] text-right">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <VolumeControl
        volume={volume}
        isMuted={muted}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
        buttonClassName={`w-7 h-7 ${PLAYER_SOFT_ICON_BUTTON_CLASS}`}
        iconSize={12}
        popDirection="left"
      />
    </div>
  )
}
