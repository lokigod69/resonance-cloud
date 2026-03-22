import { useRef, useState, useCallback, useEffect } from 'react'
import { Play, Pause, Volume2, VolumeX } from 'lucide-react'

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

  const toggleMute = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    el.muted = !muted
    setMuted(!muted)
  }, [muted])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
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
        className={`w-7 h-7 flex items-center justify-center rounded-md flex-shrink-0 transition-colors ${
          playing ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        {playing ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      {/* Progress bar */}
      <div
        ref={barRef}
        className="flex-1 h-4 flex items-center cursor-pointer group touch-none"
        onPointerDown={onPointerDown}
      >
        <div className="w-full h-1 bg-[var(--border)] rounded-full relative">
          <div
            className={`h-full bg-[var(--accent)] rounded-full ${dragging ? '' : 'transition-[width] duration-100'}`}
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

      {/* Mute */}
      <button
        onClick={toggleMute}
        className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex-shrink-0 transition-colors"
      >
        {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
      </button>
    </div>
  )
}
