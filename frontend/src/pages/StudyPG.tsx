import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Clock, RotateCcw, Sparkles, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react'
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'
import { useVideoVersion } from '@/hooks/useVideoVersion'
import { useVideoVolume } from '@/hooks/useVideoVolume'
import { useVideoPlayback } from '@/hooks/useVideoPlayback'
import { useSunoAudio } from '@/hooks/useSunoAudio'
import { VideoControls } from '@/components/VideoControls'
import { useStudySession } from '@/hooks/useStudySession'
import OrbDock from '@/components/OrbDock'

export default function StudyPG() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)

  const { words, loading, sessionStats, recordAttempt, scheduleRetry, consumeRetry, restart: restartSession } = useStudySession()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [reviewed, setReviewed] = useState(0)
  const visitedIdsRef = useRef<Set<string>>(new Set())
  const suno = useSunoAudio(
    words[currentIndex]?.suno_audio_url ?? null,
    words[currentIndex]?.id ?? '',
    videoRef,
  )
  const { volume, isMuted, setVolume, toggleMute } = useVideoVolume(videoRef, true, suno.hasSuno)
  const { isPlaying, togglePlay, replay, onPlay, onPause } = useVideoPlayback(videoRef)
  const effectiveIsMuted = suno.hasSuno ? suno.isMuted : isMuted
  const effectiveToggleMute = suno.hasSuno ? suno.toggleMute : toggleMute
  const [sunoVolume, setSunoVolume] = useState(1.0)
  const handleVolumeChange = useCallback((v: number) => {
    if (suno.hasSuno) {
      const clamped = Math.max(0, Math.min(1, v))
      const audio = suno.sunoAudioRef.current
      if (audio) audio.volume = clamped
      setSunoVolume(clamped)
    } else {
      setVolume(v)
    }
  }, [suno.hasSuno, suno.sunoAudioRef, setVolume])

  const current = words[currentIndex] ?? null
  const { activeVideoUrl, activeThumbnailUrl } = useVideoVersion(current ?? { id: '', video_url: null, thumbnail_url: null })

  const advanceToNext = useCallback(() => {
    setReviewed((r) => r + 1)
    setRevealed(false)
    if (current) visitedIdsRef.current.add(current.id)

    // Check retry pocket
    const retryId = consumeRetry()
    if (retryId) {
      const idx = words.findIndex((w) => w.id === retryId)
      if (idx !== -1) {
        setCurrentIndex(idx)
        return
      }
    }

    // Linear advance, skipping visited
    let next = currentIndex + 1
    while (next < words.length && visitedIdsRef.current.has(words[next].id)) next++
    if (next >= words.length) {
      // Before ending session, drain any pending retries even if gap not fully met
      const forcedRetryId = consumeRetry(true)
      if (forcedRetryId) {
        const idx = words.findIndex((w) => w.id === forcedRetryId)
        if (idx !== -1) {
          setCurrentIndex(idx)
          return
        }
      }
      setSessionComplete(true)
    } else {
      setCurrentIndex(next)
    }
  }, [current, currentIndex, words, consumeRetry])

  const handleRemembered = useCallback(() => {
    if (!current) return
    recordAttempt(current.id, true)
    advanceToNext()
  }, [current, recordAttempt, advanceToNext])

  const handleReviewLater = useCallback(() => {
    if (!current) return
    recordAttempt(current.id, false)
    scheduleRetry(current.id)
    advanceToNext()
  }, [current, recordAttempt, scheduleRetry, advanceToNext])

  const restart = useCallback(() => {
    restartSession()
    setCurrentIndex(0)
    setRevealed(false)
    setSessionComplete(false)
    setReviewed(0)
    visitedIdsRef.current = new Set()
  }, [restartSession])

  const skipPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
      setRevealed(false)
    }
  }, [currentIndex])

  const skipNext = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((i) => i + 1)
      setRevealed(false)
    }
  }, [currentIndex, words.length])

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (sessionComplete) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!revealed) setRevealed(true)
        else handleRemembered()
      }
      if (e.key === 'ArrowLeft') { e.preventDefault(); skipPrev() }
      if (e.key === 'ArrowRight') { e.preventDefault(); skipNext() }
      if (e.key === 'r' || e.key === 'R') replay()
      if (e.key === 'm' || e.key === 'M') toggleMute()
      if (e.key === 'p' || e.key === 'P') togglePlay()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, handleRemembered, replay, sessionComplete, toggleMute, togglePlay, skipPrev, skipNext])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingIndicator text="Loading study cards" />
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <BookOpen className="h-12 w-12 text-white/15" />
        <div>
          <h2 className="text-xl font-bold font-display mb-2">No words ready to study yet</h2>
          <p className="text-[var(--pg-text-dim)] text-sm max-w-sm">
            Generate a deck first — once your videos are ready, they'll appear here for review.
          </p>
        </div>
        <button
          onClick={() => navigate('/generate')}
          className="px-6 py-3 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/50 text-[var(--pg-accent-teal)] font-display font-semibold hover:bg-[var(--pg-accent-teal)]/30 transition-all"
        >
          <Sparkles className="h-4 w-4 inline mr-2" />
          Generate a Deck
        </button>
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
          className="w-20 h-20 rounded-full bg-[var(--pg-accent-green)]/20 border border-[var(--pg-accent-green)]/40 flex items-center justify-center"
        >
          <Check className="h-10 w-10 text-[var(--pg-accent-green)]" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold font-display mb-2">Session Complete</h2>
          <p className="text-[var(--pg-text-dim)]">
            You reviewed <span className="text-white font-semibold">{reviewed}</span> word{reviewed !== 1 ? 's' : ''}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--pg-text-dim)' }}>
            <span style={{ color: 'var(--pg-accent-green)' }}>{sessionStats.remembered} remembered</span>
            {sessionStats.reviewLater > 0 && (
              <span className="ml-2" style={{ color: '#fb923c' }}>{sessionStats.reviewLater} need review</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={restart}
            className="px-6 py-3 rounded-xl bg-[var(--pg-accent-teal)]/20 border border-[var(--pg-accent-teal)]/50 text-[var(--pg-accent-teal)] font-display font-semibold hover:bg-[var(--pg-accent-teal)]/30 transition-all"
          >
            <RotateCcw className="h-4 w-4 inline mr-2" />
            Start Again
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 rounded-xl border border-white/10 text-[var(--pg-text-dim)] font-display font-medium hover:bg-white/5 transition-all"
          >
            Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-96px)]">
      {/* Card + content */}
      <div className="w-full max-w-2xl">
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
            {/* Video with arrows anchored to it */}
            <div className="relative pg-glass rounded-2xl overflow-hidden mb-6 group/video">
              {/* Left skip arrow — centered on video */}
              <button
                onClick={skipPrev}
                disabled={currentIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all opacity-40 sm:opacity-0 sm:group-hover/video:opacity-100 disabled:!opacity-0 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Right skip arrow — centered on video */}
              <button
                onClick={skipNext}
                disabled={currentIndex >= words.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/60 transition-all opacity-40 sm:opacity-0 sm:group-hover/video:opacity-100 disabled:!opacity-0 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              {activeVideoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    key={current.id}
                    src={activeVideoUrl}
                    autoPlay
                    loop
                    playsInline
                    className="w-full aspect-video object-contain bg-black cursor-pointer"
                    onClick={togglePlay}
                    onPlay={() => { onPlay(); suno.handleVideoPlay() }}
                    onPause={() => { onPause(); suno.handleVideoPause() }}
                    onTimeUpdate={suno.hasSuno ? suno.handleTimeUpdate : undefined}
                    onEnded={suno.hasSuno ? suno.handleVideoEnded : undefined}
                  />
                  <audio
                    ref={suno.sunoAudioRef}
                    key={current.id}
                    src={current.suno_audio_url ?? undefined}
                    preload={current.suno_audio_url ? 'auto' : 'none'}
                    onCanPlayThrough={suno.handleSunoLoad}
                    onError={suno.handleSunoError}
                  />
                  <VideoControls
                    isPlaying={isPlaying}
                    onTogglePlay={togglePlay}
                    volume={suno.hasSuno ? sunoVolume : volume}
                    isMuted={effectiveIsMuted}
                    onVolumeChange={handleVolumeChange}
                    onToggleMute={effectiveToggleMute}
                    fullscreenRef={videoRef}
                  />
                </>
              ) : activeThumbnailUrl ? (
                <img
                  src={activeThumbnailUrl}
                  alt={current.word}
                  className="w-full aspect-video object-cover"
                />
              ) : (
                <div className="w-full aspect-video bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-white/10" />
                </div>
              )}
            </div>

            {/* Word */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold font-display mb-3">{current.word}</h2>

              {/* Reveal area */}
              {revealed ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  {current.translation && (
                    <p className="text-xl text-gray-300 mt-1">{current.translation}</p>
                  )}
                  {current.mnemonic && (
                    <p className="text-sm italic text-gray-500 mt-3 max-w-lg mx-auto leading-relaxed">
                      {current.mnemonic}
                    </p>
                  )}
                  {current.etymology && (
                    <p className="text-xs text-gray-600 mt-2 max-w-lg mx-auto leading-relaxed">
                      {current.etymology}
                    </p>
                  )}
                </motion.div>
              ) : (
                <button
                  onClick={() => setRevealed(true)}
                  className="px-8 py-3 rounded-full border border-white/20 bg-white/5 backdrop-blur text-white tracking-widest uppercase text-sm font-display hover:bg-white/10 transition-all"
                >
                  Reveal Answer
                </button>
              )}
            </div>

            {/* Actions — only visible after reveal */}
            {revealed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-col sm:flex-row justify-center items-center gap-3"
              >
                <button
                  onClick={handleRemembered}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--pg-accent-green)]/15 border border-[var(--pg-accent-green)]/30 text-[var(--pg-accent-green)] text-sm font-display font-medium hover:bg-[var(--pg-accent-green)]/25 transition-all"
                >
                  <Check className="h-4 w-4" />
                  Remembered
                </button>
                <button
                  onClick={handleReviewLater}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-[var(--pg-text-dim)] text-sm font-display font-medium hover:bg-white/5 transition-all"
                >
                  <Clock className="h-4 w-4" />
                  Review Later
                </button>
                <button
                  onClick={replay}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-[var(--pg-text-dim)] text-sm font-display font-medium hover:bg-white/5 transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Replay
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      {/* Orb thumbnail dock — word navigation */}
      <OrbDock
        words={words}
        currentIndex={currentIndex}
        onSelect={(i) => {
          setCurrentIndex(i)
          setRevealed(false)
        }}
      />

      {/* Keyboard hints */}
      <div className="hidden md:block mt-8 text-center text-xs" style={{ color: 'var(--pg-text-dim)', opacity: 0.5 }}>
        <kbd className="px-1.5 py-0.5 rounded border border-white/10 text-[10px]">Space</kbd> reveal/advance
        &nbsp;&middot;&nbsp;
        <kbd className="px-1.5 py-0.5 rounded border border-white/10 text-[10px]">←</kbd><kbd className="px-1.5 py-0.5 rounded border border-white/10 text-[10px]">→</kbd> skip
        &nbsp;&middot;&nbsp;
        <kbd className="px-1.5 py-0.5 rounded border border-white/10 text-[10px]">R</kbd> replay
        &nbsp;&middot;&nbsp;
        <kbd className="px-1.5 py-0.5 rounded border border-white/10 text-[10px]">P</kbd> play/pause
        &nbsp;&middot;&nbsp;
        <kbd className="px-1.5 py-0.5 rounded border border-white/10 text-[10px]">M</kbd> mute
      </div>
    </div>
  )
}
