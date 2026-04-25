import { useState, useRef, useCallback, useEffect } from 'react'
import { Volume2, Volume1, VolumeX } from 'lucide-react'

interface VolumeControlProps {
  volume: number
  isMuted: boolean
  onVolumeChange: (v: number) => void
  onToggleMute: () => void
  className?: string
  buttonClassName?: string
  iconSize?: number
  popDirection?: 'left' | 'up' | 'right'
}

const isTouchDevice = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

export function VolumeControl({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  className = '',
  buttonClassName = 'p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors',
  iconSize = 16,
  popDirection = 'left',
}: VolumeControlProps) {
  const [showSlider, setShowSlider] = useState(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const groupRef = useRef<HTMLDivElement>(null)

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }, [])

  const startHideTimer = useCallback(() => {
    if (isTouchDevice()) return // On mobile, don't auto-hide
    clearHideTimer()
    hideTimer.current = setTimeout(() => setShowSlider(false), 2000)
  }, [clearHideTimer])

  const handleMouseEnter = useCallback(() => {
    if (isTouchDevice()) return
    clearHideTimer()
    setShowSlider(true)
  }, [clearHideTimer])

  const handleMouseLeave = useCallback(() => {
    if (isTouchDevice()) return
    startHideTimer()
  }, [startHideTimer])

  const handleMuteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleMute()
    if (isTouchDevice()) {
      setShowSlider(prev => !prev)
    }
  }, [onToggleMute])

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onVolumeChange(parseFloat(e.target.value))
    startHideTimer()
  }, [onVolumeChange, startHideTimer])

  // Close slider on outside tap (mobile)
  useEffect(() => {
    if (!showSlider || !isTouchDevice()) return
    const handleTouch = (e: TouchEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) {
        setShowSlider(false)
      }
    }
    document.addEventListener('touchstart', handleTouch)
    return () => document.removeEventListener('touchstart', handleTouch)
  }, [showSlider])

  useEffect(() => {
    return () => clearHideTimer()
  }, [clearHideTimer])

  const displayVolume = isMuted ? 0 : volume
  const VolumeIcon = displayVolume === 0 ? VolumeX : displayVolume <= 0.5 ? Volume1 : Volume2

  return (
    <div
      ref={groupRef}
      className={`relative flex items-center gap-1 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Slider: absolutely positioned out of flex flow */}
      <div
        className="absolute overflow-hidden transition-all duration-200"
        style={popDirection === 'up' ? {
          width: showSlider ? 80 : 0,
          opacity: showSlider ? 1 : 0,
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: showSlider ? 'auto' : 'none',
        } : popDirection === 'right' ? {
          width: showSlider ? 80 : 0,
          opacity: showSlider ? 1 : 0,
          left: 'calc(100% + 0.5rem)',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: showSlider ? 'auto' : 'none',
        } : {
          width: showSlider ? 80 : 0,
          opacity: showSlider ? 1 : 0,
          right: 'calc(100% + 0.5rem)',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: showSlider ? 'auto' : 'none',
        }}
        onClick={e => e.stopPropagation()}
        onPointerDown={e => e.stopPropagation()}
        onTouchStart={e => e.stopPropagation()}
      >
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={displayVolume}
          onChange={handleSliderChange}
          className="volume-slider w-full cursor-pointer"
          style={{ touchAction: 'pan-x' }}
        />
      </div>

      <button
        onClick={handleMuteClick}
        className={buttonClassName}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        <VolumeIcon style={{ width: iconSize, height: iconSize }} />
      </button>
    </div>
  )
}
