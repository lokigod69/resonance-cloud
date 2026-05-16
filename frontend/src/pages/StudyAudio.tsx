import { useRef, useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Check,
  X,
  RotateCcw,
  Headphones,
  Play,
  Pause,
  Eye,
  EyeOff,
} from 'lucide-react'
import { ParticleSpinner } from '@/components/ui/ParticleSpinner'
import { useStudyUI } from '@/hooks/useStudyUI'
import { useTranslation } from '@/hooks/useTranslation'
import { SimulatedWaveform } from '@/components/music/SimulatedWaveform'
import { VolumeControl } from '@/components/VolumeControl'
import { PLAYER_SOFT_ICON_BUTTON_CLASS } from '@/lib/playerStyles'

const THUMB_KEY = 'resonance-audio-thumbnail'

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '-:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function StudyAudio() {
  const navigate = useNavigate()
  const { t, tp } = useTranslation()
  const audioRef = useRef<HTMLAudioElement>(null)

  // useStudyUI expects HTMLVideoElement ref, but all hooks only use HTMLMediaElement APIs
  const {
    words, current, currentIndex, loading, sessionComplete, sessionStats, reviewed,
    revealed, setRevealed, decks, deckFilter, setDeckFilter,
    isMuted, toggleMute,
    handleRemembered, handleReviewLater, restart,
  } = useStudyUI({ videoRef: audioRef as unknown as React.RefObject<HTMLVideoElement | null>, studyMode: 'audio' })

  // Audio-specific state
  const [showThumbnail, setShowThumbnail] = useState(() =>
    localStorage.getItem(THUMB_KEY) === 'visible'
  )
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  // Local isPlaying state synced via audio events.
  // useVideoPlayback (via useStudyUI) also tracks play state internally,
  // but keyboard shortcut P checks vid.paused directly, so no divergence risk.
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const [volume, setVolume] = useState(1)

  // Resolve audio URL: permanent storage first, CDN fallback
  const audioUrl = current?.suno_storage_url ?? current?.suno_audio_url ?? null

  // Reset audio state when word changes; pause explicitly to prevent bleed during exit animation
  useEffect(() => {
    audioRef.current?.pause()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- canonical reset-on-key pattern; resets playback state when the current word changes
    setAudioProgress(0)
    setAudioDuration(0)
    setIsPlaying(false)
    setAudioError(false)
  }, [current?.id])

  useEffect(() => {
    const el = audioRef.current
    if (!el) return
    el.volume = volume
    el.muted = isMuted || volume === 0
  }, [volume, isMuted, audioUrl])

  // Persist thumbnail preference
  const toggleThumbnail = useCallback(() => {
    setShowThumbnail(prev => {
      const next = !prev
      localStorage.setItem(THUMB_KEY, next ? 'visible' : 'hidden')
      return next
    })
  }, [])

  // Play/pause toggle
  const togglePlay = useCallback(() => {
    const el = audioRef.current
    if (!el) return
    if (isPlaying) {
      el.pause()
    } else {
      el.play().catch(() => {})
    }
  }, [isPlaying])

  // Seek handler for waveform
  const handleSeek = useCallback((ratio: number) => {
    const el = audioRef.current
    if (!el || !isFinite(el.duration) || el.duration === 0) return
    el.currentTime = ratio * el.duration
  }, [])

  const handleVolumeChange = useCallback((nextVolume: number) => {
    setVolume(nextVolume)
    if (nextVolume > 0 && isMuted) toggleMute()
  }, [isMuted, toggleMute])

  // Audio-specific keyboard shortcuts (1/2 for review/remember)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sessionComplete || !revealed) return
      if (e.key === '1') { e.preventDefault(); handleReviewLater() }
      if (e.key === '2') { e.preventDefault(); handleRemembered() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sessionComplete, revealed, handleReviewLater, handleRemembered])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ParticleSpinner preset="heart" size={140} />
        <p className="text-sm text-muted-foreground opacity-60">{t('study.loadingCards')}</p>
      </div>
    )
  }

  if (words.length === 0) {
    const isFiltered = deckFilter !== 'all'
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <Headphones className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <h2 className="text-xl font-bold mb-2">
            {isFiltered ? t('study.noCardsReady') : t('study.noAudioTitle')}
          </h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            {isFiltered ? t('study.addCardsHintAudio') : t('study.noAudioDesc')}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/study')}>
          {t('study.backToModes')}
        </Button>
      </div>
    )
  }

  if (sessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center"
        >
          <Check className="h-10 w-10 text-green-400" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold mb-2">{t('study.sessionComplete')}</h2>
          <p className="text-muted-foreground">
            {tp('study.wordsReviewed', reviewed)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="text-green-400">{t('study.remembered', { count: sessionStats.remembered })}</span>
            {sessionStats.reviewLater > 0 && (
              <span className="text-orange-400 ml-2">{t('study.needReview', { count: sessionStats.reviewLater })}</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={restart}>
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('study.startAgain')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            {t('study.backToDecks')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-start px-4 pt-4 pb-10 sm:pt-6">
      <div className="w-full max-w-xl">
        {/* Deck filter */}
        {decks.length > 1 && (
          <div className="flex justify-center mb-4">
            <Select value={deckFilter} onValueChange={setDeckFilter}>
              <SelectTrigger
                size="sm"
                className="w-[200px] bg-card border-border text-foreground hover:bg-accent focus-visible:ring-0 focus-visible:border-accent"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-white/10 text-gray-200">
                <SelectItem value="all" className="focus:bg-white/10 focus:text-white">
                  {t('study.allDecks')}
                </SelectItem>
                {decks.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="focus:bg-white/10 focus:text-white">
                    {d.name ?? t('study.untitled')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Progress counter */}
        <p className="text-center text-sm text-muted-foreground mb-6">
          {currentIndex + 1} / {words.length}
        </p>

        <AnimatePresence mode="wait">
          {current && (
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full"
            >
              {/* Audio study card */}
              <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 backdrop-blur-sm min-h-[280px] sm:min-h-[340px] flex flex-col items-center justify-center px-6 py-8 mb-6 relative">
                {/* Thumbnail toggle */}
                <button
                  onClick={toggleThumbnail}
                  className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showThumbnail ? t('study.hideThumbnail') : t('study.showThumbnail')}
                >
                  {showThumbnail ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>

                {/* Word */}
                <h2 className="text-3xl sm:text-4xl font-bold text-center mb-6">{current.word}</h2>

                {/* Thumbnail (optional) */}
                {showThumbnail && current.thumbnail_url && (
                  <motion.img
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={current.thumbnail_url}
                    alt=""
                    className="w-24 h-24 rounded-xl object-cover mb-6 border border-border"
                  />
                )}

                {/* Audio player */}
                <div className="w-full max-w-sm">
                  {audioUrl ? (
                    <>
                      {/* Hidden audio element */}
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        preload="metadata"
                        onTimeUpdate={() => {
                          const el = audioRef.current
                          if (el && isFinite(el.duration) && el.duration > 0) {
                            setAudioProgress(el.currentTime / el.duration)
                            setAudioDuration(el.duration)
                          }
                        }}
                        onLoadedMetadata={() => {
                          const el = audioRef.current
                          if (el) setAudioDuration(el.duration)
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        onError={() => setAudioError(true)}
                      />

                      {/* Transport: play + waveform + time — or error fallback */}
                      {audioError ? (
                        <p className="text-sm text-orange-400/80 text-center py-2">
                          {t('study.audioUnavailable')}
                        </p>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={togglePlay}
                            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full transition-colors ${
                              isPlaying
                                ? 'bg-[var(--accent,#06b6d4)] text-[var(--on-accent)]'
                                : 'bg-foreground/10 text-foreground/80 hover:bg-foreground/20'
                            }`}
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                          >
                            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                          </button>

                          <div className="flex-1 h-12">
                            <SimulatedWaveform
                              seed={current.id}
                              progress={audioProgress}
                              onSeek={handleSeek}
                              className="w-full h-full"
                            />
                          </div>

                          <span className="text-[11px] font-mono text-gray-400 tabular-nums flex-shrink-0 w-[72px] text-right">
                            {formatTime(audioProgress * audioDuration)} / {formatTime(audioDuration)}
                          </span>

                          <VolumeControl
                            volume={volume}
                            isMuted={isMuted}
                            onVolumeChange={handleVolumeChange}
                            onToggleMute={toggleMute}
                            buttonClassName={`w-8 h-8 ${PLAYER_SOFT_ICON_BUTTON_CLASS}`}
                            iconSize={16}
                            popDirection="left"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 text-center italic">
                      {t('study.noAudioForWord')}
                    </p>
                  )}
                </div>
              </div>

              {/* Reveal area */}
              <div className="text-center mb-6">
                {revealed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    {current.translation && (
                      <p className="text-xl text-muted-foreground">{current.translation}</p>
                    )}
                    {current.mnemonic && (
                      <p className="text-sm italic text-muted-foreground/70 mt-3 max-w-lg mx-auto leading-relaxed">
                        {current.mnemonic}
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setRevealed(true)}
                    className="px-8 py-3 rounded-full tracking-widest uppercase text-sm"
                  >
                    {t('study.revealAnswer')}
                  </Button>
                )}
              </div>

              {/* Actions — only visible after reveal */}
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex justify-center gap-3 w-full max-w-md mx-auto"
                >
                  <button
                    onClick={handleReviewLater}
                    aria-label="Review Later"
                    className="w-16 h-16 rounded-full sm:w-auto sm:h-auto sm:flex-1 sm:rounded-2xl sm:py-4 bg-red-500/15 border-2 border-red-500/40 text-red-400 flex items-center justify-center gap-2 hover:bg-red-500/25 hover:border-red-500/60 transition-all"
                  >
                    <X className="h-7 w-7 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline text-sm font-medium">{t('study.reviewLater')}</span>
                  </button>

                  <button
                    onClick={handleRemembered}
                    aria-label="Remembered"
                    className="w-16 h-16 rounded-full sm:w-auto sm:h-auto sm:flex-1 sm:rounded-2xl sm:py-4 bg-green-500/15 border-2 border-green-500/40 text-green-400 flex items-center justify-center gap-2 hover:bg-green-500/25 hover:border-green-500/60 transition-all"
                  >
                    <Check className="h-7 w-7 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline text-sm font-medium">{t('study.rememberedAction')}</span>
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
