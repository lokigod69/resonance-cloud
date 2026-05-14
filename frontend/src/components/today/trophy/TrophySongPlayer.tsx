import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/useTranslation'

type TrophySongPlayerProps = {
  audioUrl: string | null
  caption: string
}

export function TrophySongPlayer({ audioUrl, caption }: TrophySongPlayerProps) {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    setStatus('idle')
    setCurrentTime(0)
    setDuration(0)
  }, [audioUrl])

  const handleToggle = async () => {
    const audio = audioRef.current
    if (!audio) return

    if (status === 'playing') {
      audio.pause()
      setStatus('idle')
      return
    }

    if (status === 'ended') {
      audio.currentTime = 0
    }

    await audio.play()
    setStatus('playing')
  }

  const buttonLabel = status === 'playing'
    ? t('today.trophy.player.pause')
    : status === 'ended'
      ? t('today.trophy.player.replay')
      : t('today.trophy.player.play')

  return (
    <section className="today-trophy-player rounded-lg border border-[var(--border-subtle)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {t('today.trophy.player.title')}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {audioUrl ? caption : t('today.trophy.player.comingSoon')}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Button
            type="button"
            size="lg"
            variant={audioUrl ? 'default' : 'outline'}
            disabled={!audioUrl}
            onClick={handleToggle}
            className="min-h-12"
          >
            {status === 'playing' ? <Pause className="h-4 w-4" /> : status === 'ended' ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {buttonLabel}
          </Button>
          <span className="min-w-16 text-right text-sm tabular-nums text-[var(--text-secondary)]" aria-live="polite">
            {formatTimestamp(currentTime)} / {formatTimestamp(duration)}
          </span>
        </div>
      </div>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onPause={() => setStatus((current) => (current === 'playing' ? 'idle' : current))}
          onEnded={(event) => {
            setCurrentTime(event.currentTarget.duration)
            setStatus('ended')
          }}
        />
      )}
    </section>
  )
}

function formatTimestamp(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
