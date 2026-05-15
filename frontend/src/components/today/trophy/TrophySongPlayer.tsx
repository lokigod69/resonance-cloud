import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  readGuidedTrophySongCandidate,
  writeGuidedTrophySongCandidate,
  type GuidedTrophySongAudioCandidate,
  type GuidedTrophySongAudioStatus,
  type GuidedTrophySongCandidateId,
} from '@/data/guidedTrophySongs'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/useTranslation'

type TrophySongPlayerProps = {
  catalogId: string
  audioStatus: GuidedTrophySongAudioStatus
  audioCandidates: Partial<Record<GuidedTrophySongCandidateId, GuidedTrophySongAudioCandidate>>
  activeCandidateDefault: GuidedTrophySongCandidateId
  caption: string
}

export function TrophySongPlayer({
  catalogId,
  audioStatus,
  audioCandidates,
  activeCandidateDefault,
  caption,
}: TrophySongPlayerProps) {
  const { t } = useTranslation()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<GuidedTrophySongCandidateId | undefined>(() => (
    readGuidedTrophySongCandidate(catalogId, audioCandidates, activeCandidateDefault)
  ))
  const [status, setStatus] = useState<'idle' | 'playing' | 'ended'>('idle')
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioUrl = selectedCandidate ? audioCandidates[selectedCandidate]?.publicUrl ?? null : null
  const hasAudio = audioStatus === 'ready' && Boolean(audioUrl)

  useEffect(() => {
    setSelectedCandidate(readGuidedTrophySongCandidate(catalogId, audioCandidates, activeCandidateDefault))
  }, [activeCandidateDefault, audioCandidates, catalogId])

  useEffect(() => {
    audioRef.current?.pause()
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

  const handleCandidateChange = (candidate: GuidedTrophySongCandidateId) => {
    if (!audioCandidates[candidate]?.publicUrl) return
    writeGuidedTrophySongCandidate(catalogId, candidate)
    setSelectedCandidate(candidate)
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
            {hasAudio ? caption : t('today.trophy.player.comingSoon')}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-[var(--border-subtle)] p-1" aria-label="Song candidate">
            {(['A', 'B'] as const).map((candidate) => {
              const available = Boolean(audioCandidates[candidate]?.publicUrl)
              const selected = selectedCandidate === candidate

              return (
                <button
                  key={candidate}
                  type="button"
                  disabled={!available}
                  onClick={() => handleCandidateChange(candidate)}
                  className="min-h-9 min-w-10 rounded-md px-3 text-sm font-semibold text-[var(--text-secondary)] transition enabled:hover:bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] disabled:opacity-40 data-[selected=true]:bg-[var(--accent)] data-[selected=true]:text-[var(--button-primary-text)]"
                  data-selected={selected}
                  aria-pressed={selected}
                >
                  {candidate}
                </button>
              )
            })}
          </div>
          <Button
            type="button"
            size="lg"
            variant={hasAudio ? 'default' : 'outline'}
            disabled={!hasAudio}
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
      {hasAudio && audioUrl && (
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
