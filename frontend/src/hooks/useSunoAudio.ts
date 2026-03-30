import { useRef, useEffect, useCallback, useState, type RefObject } from 'react'

const SUNO_AUDIO_START_DELAY = 3  // seconds: bookend TTS before Suno starts
const FADE_DURATION = 2           // seconds: fade Suno out before video end

/**
 * Manages Suno audio overlay on video playback.
 *
 * Dynamic muting approach: handleTimeUpdate owns video.muted so the bookend
 * TTS (baked into the video's ACE-Step audio) plays for the first 3 seconds,
 * then the video is muted and the Suno track takes over.
 *
 * @param sunoAudioUrl - The Suno audio URL, or null if not available
 * @param resetKey     - A key that resets Suno state when it changes (wordId,
 *                       or `${wordId}-${videoKey}` when replay remounts video)
 * @param videoRef     - Ref to the video element for timing / mute control
 */
export function useSunoAudio(
  sunoAudioUrl: string | null,
  resetKey: string,
  videoRef: RefObject<HTMLVideoElement | null>,
) {
  const sunoAudioRef = useRef<HTMLAudioElement | null>(null)
  // Tracks whether the user explicitly muted via the mute button.
  // When true, handleTimeUpdate keeps everything silent (both video and Suno).
  const userMutedRef = useRef(false)
  const [isMuted, setIsMuted] = useState(false)
  const [hasError, setHasError] = useState(false)

  const hasSuno = !!sunoAudioUrl && !hasError

  // ─── Reset ──────────────────────────────────────────────────────────────────

  const resetSuno = useCallback(() => {
    const audio = sunoAudioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.volume = 1.0
      audio.muted = false
    }
    // Restore video audio for TTS (start of video is always TTS zone)
    const vid = videoRef.current
    if (vid) vid.muted = false
  }, [videoRef])

  // Reset when word (or video replay key) changes
  useEffect(() => {
    resetSuno()
    setHasError(false)
    userMutedRef.current = false
    setIsMuted(false)
  }, [resetKey, resetSuno])

  // Pause Suno audio on unmount
  useEffect(() => {
    return () => { sunoAudioRef.current?.pause() }
  }, [])

  // ─── Mute button ────────────────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    const nowMuted = !userMutedRef.current
    userMutedRef.current = nowMuted
    setIsMuted(nowMuted)

    const audio = sunoAudioRef.current
    if (audio) audio.muted = nowMuted

    const vid = videoRef.current
    if (!vid) return
    if (nowMuted) {
      // Silence everything
      vid.muted = true
    } else {
      // Restore dynamic state based on current position
      vid.muted = vid.currentTime >= SUNO_AUDIO_START_DELAY
    }
  }, [videoRef])

  // ─── Time update — the core of dynamic muting ───────────────────────────────
  //
  // Fires ~4× per second while video is playing. Owns video.muted and Suno
  // play/pause so the transition from TTS zone → Suno zone is seamless.

  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current
    const audio = sunoAudioRef.current
    if (!hasSuno || !vid || !audio) return

    const { currentTime, duration } = vid

    if (currentTime < SUNO_AUDIO_START_DELAY) {
      // ── Bookend TTS zone ──────────────────────────────────────────────────
      // Video audio (ACE-Step pronunciation) should be heard; Suno is silent.
      if (!userMutedRef.current) vid.muted = false
      if (!audio.paused) {
        audio.pause()
        audio.currentTime = 0
      }
      audio.volume = 1.0  // reset so it's ready when Suno zone begins
    } else {
      // ── Suno zone ─────────────────────────────────────────────────────────
      // Mute video ACE-Step audio; let Suno track play.
      if (!userMutedRef.current) {
        vid.muted = true
        if (audio.paused) {
          audio.play().catch(() => {})
        }
      }

      // Quadratic fade-out in last FADE_DURATION seconds
      const timeRemaining = Number.isFinite(duration) ? duration - currentTime : Infinity
      if (timeRemaining <= FADE_DURATION) {
        const progress = 1 - timeRemaining / FADE_DURATION  // 0 → 1
        audio.volume = Math.max(0, 1 - progress * progress)
      } else {
        audio.volume = 1.0
      }
    }
  }, [hasSuno, videoRef])

  // ─── Pause ──────────────────────────────────────────────────────────────────

  const handleVideoPause = useCallback(() => {
    if (!hasSuno) return
    sunoAudioRef.current?.pause()
  }, [hasSuno])

  // ─── Play ────────────────────────────────────────────────────────────────────
  // handleTimeUpdate manages Suno start/mute dynamically, so this is a no-op.
  // Kept in the API so integration files don't need to change their onPlay handlers.
  const handleVideoPlay = useCallback(() => {}, [])

  // ─── Ended (non-looped fallback) ─────────────────────────────────────────────

  const handleVideoEnded = useCallback(() => {
    const audio = sunoAudioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.volume = 1.0
    }
    const vid = videoRef.current
    if (vid) vid.muted = false
  }, [videoRef])

  // ─── Error fallback ─────────────────────────────────────────────────────────

  const handleSunoError = useCallback(() => {
    setHasError(true)
    // Unmute video so user still hears something
    const vid = videoRef.current
    if (vid) vid.muted = false
  }, [videoRef])

  return {
    sunoAudioRef,
    hasSuno,
    isMuted,
    toggleMute,
    handleVideoPlay,
    handleVideoPause,
    handleVideoEnded,
    handleTimeUpdate,
    handleSunoError,
    resetSuno,
  }
}
