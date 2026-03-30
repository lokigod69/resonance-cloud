import { useState, useCallback, type RefObject } from 'react'

/**
 * Manages play/pause/replay state for a single <video> element.
 * Compose with useVideoVolume for volume control.
 */
export function useVideoPlayback(
  videoRef: RefObject<HTMLVideoElement | null>,
  autoPlay = true,
) {
  const [isPlaying, setIsPlaying] = useState(autoPlay)

  const togglePlay = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    if (vid.paused) {
      vid.play().catch(() => {})
      setIsPlaying(true)
    } else {
      vid.pause()
      setIsPlaying(false)
    }
  }, [videoRef])

  const replay = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.currentTime = 0
    vid.play().catch(() => {})
    setIsPlaying(true)
  }, [videoRef])

  // Video event handlers to keep state in sync with native controls
  const onPlay = useCallback(() => setIsPlaying(true), [])
  const onPause = useCallback(() => setIsPlaying(false), [])

  return { isPlaying, setIsPlaying, togglePlay, replay, onPlay, onPause }
}
