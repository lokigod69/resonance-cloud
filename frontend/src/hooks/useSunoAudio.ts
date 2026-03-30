import { useRef, useEffect, useCallback, useState, type RefObject } from 'react'

const SUNO_AUDIO_START_DELAY = 3  // seconds after video starts
const FADE_DURATION = 2           // seconds before video end to start fading

/**
 * Manages Suno audio overlay on video playback.
 *
 * When a word has a suno_audio_url, the video should be muted and the Suno
 * track plays instead — starting after a configurable delay (to let the
 * bookend TTS play through), synchronized with play/pause, and fading out
 * near the end of the video.
 *
 * @param sunoAudioUrl - The Suno audio URL, or null if not available
 * @param resetKey     - A key that resets Suno state when it changes (wordId,
 *                       or `${wordId}-${videoKey}` when replay remounts video)
 * @param videoRef     - Ref to the video element for timing / pause detection
 */
export function useSunoAudio(
  sunoAudioUrl: string | null,
  resetKey: string,
  videoRef: RefObject<HTMLVideoElement | null>,
) {
  const sunoAudioRef = useRef<HTMLAudioElement | null>(null)
  const sunoDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sunoStartedRef = useRef(false)
  const [isMuted, setIsMuted] = useState(false)
  const [hasError, setHasError] = useState(false)

  const hasSuno = !!sunoAudioUrl && !hasError

  // ─── Reset ──────────────────────────────────────────────────────────────────

  const resetSuno = useCallback(() => {
    if (sunoDelayTimerRef.current) {
      clearTimeout(sunoDelayTimerRef.current)
      sunoDelayTimerRef.current = null
    }
    const audio = sunoAudioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.volume = 1.0
    }
    sunoStartedRef.current = false
  }, [])

  // Reset whenever the word (or video replay key) changes
  useEffect(() => {
    resetSuno()
    setHasError(false)
  }, [resetKey, resetSuno])

  // Cancel timer on unmount
  useEffect(() => {
    return () => {
      if (sunoDelayTimerRef.current) clearTimeout(sunoDelayTimerRef.current)
    }
  }, [])

  // ─── Mute ───────────────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    const audio = sunoAudioRef.current
    if (audio) audio.muted = !audio.muted
    setIsMuted(prev => !prev)
  }, [])

  // ─── Play / Pause handlers ───────────────────────────────────────────────────

  const handleVideoPlay = useCallback(() => {
    if (!hasSuno || !sunoAudioRef.current) return

    const elapsed = videoRef.current?.currentTime ?? 0

    // Resume from pause after Suno already started and we're past the delay
    if (sunoStartedRef.current && elapsed >= SUNO_AUDIO_START_DELAY) {
      sunoAudioRef.current.play().catch(() => {})
      return
    }

    // Fresh start or video replayed — use delay (adjusted for elapsed time)
    const delay = Math.max(0, (SUNO_AUDIO_START_DELAY - elapsed) * 1000)
    sunoDelayTimerRef.current = setTimeout(() => {
      const audio = sunoAudioRef.current
      const vid = videoRef.current
      // Guard: only play if video is still playing when timer fires
      if (audio && vid && !vid.paused) {
        audio.play().catch(() => {})
        sunoStartedRef.current = true
      }
    }, delay)
  }, [hasSuno, videoRef])

  const handleVideoPause = useCallback(() => {
    if (!hasSuno) return
    if (sunoDelayTimerRef.current) {
      clearTimeout(sunoDelayTimerRef.current)
      sunoDelayTimerRef.current = null
    }
    sunoAudioRef.current?.pause()
  }, [hasSuno])

  // ─── Fade-out (timeupdate) ───────────────────────────────────────────────────

  const handleTimeUpdate = useCallback(() => {
    const audio = sunoAudioRef.current
    const vid = videoRef.current
    if (!hasSuno || !audio || !vid) return
    if (isMuted) return  // nothing to fade if already muted

    const timeRemaining = vid.duration - vid.currentTime
    if (Number.isFinite(timeRemaining) && timeRemaining <= FADE_DURATION) {
      // Quadratic ease-out: drops slowly at first, then quickly
      const progress = 1 - timeRemaining / FADE_DURATION  // 0 → 1
      audio.volume = Math.max(0, 1 - progress * progress)
    } else {
      audio.volume = 1.0
    }
  }, [hasSuno, isMuted, videoRef])

  // ─── Error fallback ─────────────────────────────────────────────────────────

  const handleSunoError = useCallback(() => {
    setHasError(true)
    // Unmute video so the user still hears something
    if (videoRef.current) videoRef.current.muted = false
  }, [videoRef])

  // ─── Return ─────────────────────────────────────────────────────────────────

  return {
    sunoAudioRef,
    hasSuno,
    isMuted,
    toggleMute,
    handleVideoPlay,
    handleVideoPause,
    handleTimeUpdate,
    handleSunoError,
    resetSuno,
  }
}
