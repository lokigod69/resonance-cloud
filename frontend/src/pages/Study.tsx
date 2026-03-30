import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Check,
  Clock,
  RotateCcw,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { LoadingIndicator } from '@/components/ui/LoadingIndicator'
import { useVideoVersion } from '@/hooks/useVideoVersion'
import { useVideoVolume } from '@/hooks/useVideoVolume'
import { useVideoPlayback } from '@/hooks/useVideoPlayback'
import { useSunoAudio } from '@/hooks/useSunoAudio'
import { VideoControls } from '@/components/VideoControls'
import { useStudySession } from '@/hooks/useStudySession'

export default function Study() {
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
  const { volume, isMuted, setVolume, toggleMute } = useVideoVolume(videoRef, true, suno.hasSuno ? true : undefined)
  const { isPlaying, togglePlay, replay, onPlay, onPause } = useVideoPlayback(videoRef)
  const effectiveIsMuted = suno.hasSuno ? suno.isMuted : isMuted
  const effectiveToggleMute = suno.hasSuno ? suno.toggleMute : toggleMute

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
        <BookOpen className="h-12 w-12 text-muted-foreground/50" />
        <div>
          <h2 className="text-xl font-bold mb-2">No words ready to study yet</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Generate a deck first — once your videos are ready, they'll appear here for review.
          </p>
        </div>
        <Button onClick={() => navigate('/generate')}>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate a Deck
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
          <h2 className="text-2xl font-bold mb-2">Session Complete</h2>
          <p className="text-muted-foreground">
            You reviewed <span className="text-foreground font-semibold">{reviewed}</span> word{reviewed !== 1 ? 's' : ''}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="text-green-400">{sessionStats.remembered} remembered</span>
            {sessionStats.reviewLater > 0 && (
              <span className="text-orange-400 ml-2">{sessionStats.reviewLater} need review</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={restart}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Start Again
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
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
              <div className="relative rounded-xl border border-border overflow-hidden mb-6 group/video">
                {/* Left skip arrow — centered on video */}
                <button
                  onClick={skipPrev}
                  disabled={currentIndex === 0}
                  className="absolute -left-14 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-border bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Right skip arrow — centered on video */}
                <button
                  onClick={skipNext}
                  disabled={currentIndex >= words.length - 1}
                  className="absolute -right-14 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full border border-border bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all disabled:opacity-20 disabled:cursor-not-allowed"
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
                      muted
                      playsInline
                      className="w-full aspect-video object-contain bg-black cursor-pointer"
                      onClick={togglePlay}
                      onPlay={() => { onPlay(); suno.handleVideoPlay() }}
                      onPause={() => { onPause(); suno.handleVideoPause() }}
                      onTimeUpdate={suno.hasSuno ? suno.handleTimeUpdate : undefined}
                    />
                    <audio
                      ref={suno.sunoAudioRef}
                      key={current.id}
                      src={current.suno_audio_url ?? undefined}
                      preload={current.suno_audio_url ? 'auto' : 'none'}
                      onError={suno.handleSunoError}
                    />
                    <VideoControls
                      isPlaying={isPlaying}
                      onTogglePlay={togglePlay}
                      volume={volume}
                      isMuted={effectiveIsMuted}
                      onVolumeChange={setVolume}
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
                  <div className="w-full aspect-video bg-muted flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Word */}
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold mb-3">{current.word}</h2>

                {/* Reveal area */}
                {revealed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    {current.translation && (
                      <p className="text-xl text-muted-foreground mt-1">{current.translation}</p>
                    )}
                    {current.mnemonic && (
                      <p className="text-sm italic text-muted-foreground/70 mt-3 max-w-lg mx-auto leading-relaxed">
                        {current.mnemonic}
                      </p>
                    )}
                    {current.etymology && (
                      <p className="text-xs text-muted-foreground/50 mt-2 max-w-lg mx-auto leading-relaxed">
                        {current.etymology}
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setRevealed(true)}
                    className="px-8 py-3 rounded-full tracking-widest uppercase text-sm"
                  >
                    Reveal Answer
                  </Button>
                )}
              </div>

              {/* Actions — only visible after reveal */}
              {revealed && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex justify-center gap-3"
                >
                  <Button
                    onClick={handleRemembered}
                    variant="outline"
                    className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Remembered
                  </Button>
                  <Button variant="outline" onClick={handleReviewLater}>
                    <Clock className="h-4 w-4 mr-2" />
                    Review Later
                  </Button>
                  <Button variant="outline" onClick={replay}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Replay
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Keyboard hints */}
      <div className="mt-8 text-center text-xs text-muted-foreground/50">
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">Space</kbd> reveal/advance
        &nbsp;&middot;&nbsp;
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">&larr;</kbd><kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">&rarr;</kbd> skip
        &nbsp;&middot;&nbsp;
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">R</kbd> replay
        &nbsp;&middot;&nbsp;
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">P</kbd> play/pause
        &nbsp;&middot;&nbsp;
        <kbd className="px-1.5 py-0.5 rounded border border-border text-[10px]">M</kbd> mute
      </div>
    </div>
  )
}
