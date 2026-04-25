import { useState, useRef, useCallback, useEffect, type CSSProperties } from 'react'
import { Volume2, Volume1, VolumeX } from 'lucide-react'
import { PLAYER_SLIDER_CLASS } from '@/lib/playerStyles'

interface VolumeControlProps {
  volume: number
  isMuted: boolean
  onVolumeChange: (v: number) => void
  onToggleMute: () => void
  className?: string
  buttonClassName?: string
  iconSize?: number
  popDirection?: 'left' | 'up' | 'right'
  sliderAlign?: 'start' | 'center' | 'end'
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
  sliderAlign = 'center',
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

  const handleFocusCapture = useCallback(() => {
    clearHideTimer()
    setShowSlider(true)
  }, [clearHideTimer])

  const handleBlurCapture = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return
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
  const sliderHorizontalStyle = (() => {
    if (popDirection !== 'up') return {}
    if (sliderAlign === 'start') return { left: 0, transform: undefined }
    if (sliderAlign === 'end') return { right: 0, transform: undefined }
    return { left: '50%', transform: 'translateX(-50%)' }
  })()

  const sliderStyle: CSSProperties = popDirection === 'up' ? {
    width: showSlider ? 80 : 0,
    opacity: showSlider ? 1 : 0,
    bottom: 'calc(100% + 6px)',
    pointerEvents: showSlider ? 'auto' : 'none',
    ...sliderHorizontalStyle,
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
  }

  return (
    <div
      ref={groupRef}
      className={`relative flex items-center gap-1 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={handleFocusCapture}
      onBlurCapture={handleBlurCapture}
    >
      <button
        onClick={handleMuteClick}
        className={buttonClassName}
        title={isMuted ? 'Unmute' : 'Mute'}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
        aria-expanded={showSlider}
      >
        <VolumeIcon style={{ width: iconSize, height: iconSize }} />
      </button>

      {/* Slider: absolutely positioned out of flex flow */}
      <div
        className="absolute overflow-hidden transition-all duration-200"
        style={sliderStyle}
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
          className={PLAYER_SLIDER_CLASS}
          style={{ touchAction: 'pan-x' }}
          tabIndex={showSlider ? 0 : -1}
          aria-hidden={!showSlider}
          aria-label="Volume"
        />
      </div>
    </div>
  )
}
