import { useRef, useEffect, useCallback, useState, type RefObject } from 'react'

const INTRO_TTS_END     = 2.0  // seconds — intro TTS done; safe to start Suno
const FADE_IN_DURATION  = 1.0  // seconds — fade-in ramp
const FADE_OUT_DURATION = 2.0  // seconds — fade-out ramp before loop point

/**
 * Manages Suno audio overlay on video playback.
 *
 * Dynamic muting approach: handleTimeUpdate owns video.muted so the bookend
 * TTS (baked into the video's ACE-Step audio) plays for the first 2 seconds,
 * then the video is muted and the Suno track takes over.
 *
 * Zone boundaries:
 *   Zone 1 — Intro TTS  [0 → INTRO_TTS_END]:        video unmuted, Suno reset
 *   Zone 2 — Fade-in    [INTRO_TTS_END → +1s]:       video muted, Suno 0→1
 *   Zone 3 — Full Suno  [+1s → (duration - 2s)]:     video muted, Suno at 1
 *   Zone 4 — Fade-out   [(duration - 2s) → end]:     video muted, rAF 1→0
 * On loop, Zone 1 unconditionally resets audio.currentTime to 0.
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
  // rAF handle for the Zone 4 fade-out loop — null when no fade is running.
  const fadeRafRef = useRef<number | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [hasError, setHasError] = useState(false)

  const hasSuno = !!sunoAudioUrl && !hasError

  // ─── Smooth fade-out via requestAnimationFrame (~60fps) ─────────────────────

  const startFadeOut = useCallback((audio: HTMLAudioElement, durationMs: number) => {
    if (fadeRafRef.current !== null) {
      cancelAnimationFrame(fadeRafRef.current)
      fadeRafRef.current = null
    }
    const startVolume = audio.volume
    const startTime = performance.now()
    const tick = () => {
      const elapsed  = performance.now() - startTime
      const progress = Math.min(elapsed / durationMs, 1.0)
      // Quadratic ease-out: natural-sounding fade (fast start, slow finish)
      audio.volume = startVolume * (1 - progress) * (1 - progress)
      if (progress < 1.0 && !audio.paused) {
        fadeRafRef.current = requestAnimationFrame(tick)
      } else {
        audio.volume = 0
        audio.pause()
        fadeRafRef.current = null
      }
    }
    fadeRafRef.current = requestAnimationFrame(tick)
  }, [])

  // ─── Reset ──────────────────────────────────────────────────────────────────

  const resetSuno = useCallback(() => {
    if (fadeRafRef.current !== null) {
      cancelAnimationFrame(fadeRafRef.current)
      fadeRafRef.current = null
    }
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

  // Pause Suno audio and cancel rAF on unmount
  useEffect(() => {
    return () => {
      sunoAudioRef.current?.pause()
      if (fadeRafRef.current !== null) {
        cancelAnimationFrame(fadeRafRef.current)
        fadeRafRef.current = null
      }
    }
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
      // Restore dynamic state: video muted whenever Suno has taken over
      const t = vid.currentTime
      vid.muted = t >= INTRO_TTS_END
    }
  }, [videoRef])

  // ─── Time update — the core of dynamic muting ───────────────────────────────
  //
  // Fires ~4× per second while video is playing. Owns video.muted and Suno
  // play/pause. Zone boundaries are computed dynamically from video.duration
  // so they adapt to any video length without code changes.

  const handleTimeUpdate = useCallback(() => {
    const vid   = videoRef.current
    const audio = sunoAudioRef.current
    if (!hasSuno || !vid || !audio) return

    const videoDuration = vid.duration
    const hasDuration   = !!videoDuration && isFinite(videoDuration) && videoDuration > 0
    const FADE_IN_START  = INTRO_TTS_END
    const FADE_IN_END    = INTRO_TTS_END + FADE_IN_DURATION
    // Fall back to 23.0 if duration not yet known (video still loading)
    const FADE_OUT_START = hasDuration ? videoDuration - FADE_OUT_DURATION : 23.0

    const { currentTime } = vid

    if (currentTime < FADE_IN_START) {
      // ── Zone 1: Intro TTS (0 – 2.0s) ─────────────────────────────────────
      // ALWAYS reset — fixes loop restart bug: audio may be paused at ~end
      // from Zone 4 fade-out, so a conditional would skip the currentTime reset.
      if (fadeRafRef.current !== null) {
        cancelAnimationFrame(fadeRafRef.current)
        fadeRafRef.current = null
      }
      audio.pause()
      audio.currentTime = 0
      audio.volume = 0
      if (!userMutedRef.current) vid.muted = false

    } else if (currentTime < FADE_IN_END) {
      // ── Zone 2: Fade-in (2.0 – 3.0s) ────────────────────────────────────
      if (!userMutedRef.current) vid.muted = true
      const progress = (currentTime - FADE_IN_START) / FADE_IN_DURATION
      audio.volume = progress
      if (audio.paused && !audio.ended && !vid.paused) {
        audio.play().catch(() => {})
      }

    } else if (currentTime < FADE_OUT_START) {
      // ── Zone 3: Full Suno (3.0 – FADE_OUT_START) ─────────────────────────
      // Second bookend TTS is baked into the video but video stays muted —
      // it is never heard. On loop, Zone 1 unmutes the video for the intro TTS.
      if (!userMutedRef.current) vid.muted = true
      audio.volume = 1.0
      if (audio.paused && !audio.ended && !vid.paused) {
        audio.play().catch(() => {})
      }

    } else {
      // ── Zone 4: Fade-out (FADE_OUT_START → end of video) ─────────────────
      // Video stays muted — no Zone 5. Start rAF fade once per cycle;
      // the null guard prevents re-triggering on each timeupdate call.
      if (!userMutedRef.current) vid.muted = true
      if (fadeRafRef.current === null && !audio.paused) {
        startFadeOut(audio, FADE_OUT_DURATION * 1000)
      }
    }
  }, [hasSuno, videoRef, startFadeOut])

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
  // Unused when the video element has the `loop` attribute (ended never fires).

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

  // ─── Load success ────────────────────────────────────────────────────────────

  const handleSunoLoad = useCallback(() => {
    console.info('[Suno] Audio loaded for word:', resetKey, 'URL:', sunoAudioUrl?.slice(-40))
  }, [resetKey, sunoAudioUrl])

  // ─── Error fallback ─────────────────────────────────────────────────────────

  const handleSunoError = useCallback(() => {
    setHasError(true)
    // Cancel any running fade — the audio element is dead
    if (fadeRafRef.current !== null) {
      cancelAnimationFrame(fadeRafRef.current)
      fadeRafRef.current = null
    }
    // Pause the broken audio element
    const audio = sunoAudioRef.current
    if (audio) {
      audio.pause()
      audio.volume = 0
    }
    // Do NOT unmute the video here — let the next render cycle handle it.
    // When hasSuno flips to false on re-render:
    //   - skipMuteControl becomes false
    //   - useVideoVolume effect takes over vid.muted/vid.volume
    //   - handleTimeUpdate detaches (no more zone logic)
    console.warn('[Suno] Audio failed to load — falling back to ACE-Step')
  }, [sunoAudioRef])

  return {
    sunoAudioRef,
    hasSuno,
    isMuted,
    toggleMute,
    handleVideoPlay,
    handleVideoPause,
    handleVideoEnded,
    handleTimeUpdate,
    handleSunoLoad,
    handleSunoError,
    resetSuno,
  }
}
