import { useRef, useEffect, useCallback, useState, type RefObject } from 'react'

const SUNO_FADE_IN_START = 2.0    // seconds — Suno begins fading in, video mutes
const SUNO_FADE_IN_END = 3.0      // seconds — Suno at full volume
const SUNO_FADE_OUT_START = 22.5  // seconds — Suno begins fading out
const SUNO_FADE_OUT_END = 24.0    // seconds — Suno silent, end TTS bookend plays

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
      const t = vid.currentTime
      vid.muted = t >= SUNO_FADE_IN_START && t < SUNO_FADE_OUT_END
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

    const { currentTime } = vid

    if (currentTime < SUNO_FADE_IN_START) {
      // ── Pre-Suno TTS zone (0 – 2.0s) ──────────────────────────────────────
      // Opening bookend TTS is audible; Suno is silent and reset.
      if (!userMutedRef.current) vid.muted = false
      if (!audio.paused) {
        audio.pause()
        audio.currentTime = 0
      }
      audio.volume = 0

    } else if (currentTime < SUNO_FADE_IN_END) {
      // ── Fade-in zone (2.0 – 3.0s) ─────────────────────────────────────────
      // Video audio mutes; Suno ramps from 0 → 1 (linear).
      if (!userMutedRef.current) vid.muted = true
      const progress = (currentTime - SUNO_FADE_IN_START) / (SUNO_FADE_IN_END - SUNO_FADE_IN_START)
      audio.volume = progress
      if (audio.paused && !audio.ended && !vid.paused) {
        audio.play().catch(() => {})
      }

    } else if (currentTime < SUNO_FADE_OUT_START) {
      // ── Full Suno zone (3.0 – 22.5s) ──────────────────────────────────────
      // Video muted; Suno at full volume.
      if (!userMutedRef.current) vid.muted = true
      audio.volume = 1.0
      if (audio.paused && !audio.ended && !vid.paused) {
        audio.play().catch(() => {})
      }

    } else if (currentTime < SUNO_FADE_OUT_END) {
      // ── Fade-out zone (22.5 – 24.0s) ──────────────────────────────────────
      // Suno fades out via quadratic ease-out (1 → 0).
      if (!userMutedRef.current) vid.muted = true
      const progress = (currentTime - SUNO_FADE_OUT_START) / (SUNO_FADE_OUT_END - SUNO_FADE_OUT_START)
      audio.volume = Math.max(0, 1 - progress * progress)

    } else {
      // ── End TTS zone (24.0s+) ──────────────────────────────────────────────
      // Closing bookend TTS is audible; Suno is silent.
      if (!userMutedRef.current) vid.muted = false
      if (!audio.paused) audio.pause()
      audio.volume = 0
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
