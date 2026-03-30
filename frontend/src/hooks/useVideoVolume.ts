import { useState, useCallback, useRef, useEffect, type RefObject } from 'react'

export function useVideoVolume(
  videoRef: RefObject<HTMLVideoElement | null>,
  initialMuted = true,
) {
  const [volume, setVolumeState] = useState(1)
  const [isMuted, setIsMuted] = useState(initialMuted)
  const lastVolume = useRef(1)

  // Sync state to video element
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.volume = volume
    vid.muted = isMuted
  }, [videoRef, volume, isMuted])

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setVolumeState(clamped)
    if (clamped > 0) lastVolume.current = clamped
    setIsMuted(clamped === 0)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      if (prev) {
        // Unmuting — restore previous volume (or default to 1)
        const restore = lastVolume.current > 0 ? lastVolume.current : 1
        setVolumeState(restore)
        return false
      } else {
        // Muting — save current volume
        lastVolume.current = volume > 0 ? volume : 1
        return true
      }
    })
  }, [volume])

  return { volume, isMuted, setVolume, toggleMute }
}
