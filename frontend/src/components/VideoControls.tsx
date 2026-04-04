import { useState, useEffect, useRef, useCallback, type RefObject } from 'react'
import { Play, Pause } from 'lucide-react'
import { VolumeControl } from './VolumeControl'
import { FullscreenButton } from './FullscreenButton'

type Visibility = 'hover' | { autoHide: number }

interface VideoControlsProps {
  /** Is the video currently playing? */
  isPlaying: boolean
  /** Toggle play/pause callback */
  onTogglePlay: () => void
  /** Volume (0-1) */
  volume: number
  /** Is video muted? */
  isMuted: boolean
  /** Set volume callback */
  onVolumeChange: (v: number) => void
  /** Toggle mute callback */
  onToggleMute: () => void
  /** Ref to the element to fullscreen (video or container) */
  fullscreenRef: RefObject<HTMLVideoElement | HTMLDivElement | null>
  /**
   * Controls visibility behavior:
   * - 'hover': show on parent hover via group-hover (default)
   * - { autoHide: ms }: show on interaction, hide after ms of inactivity
   */
  visibility?: Visibility
  /** Extra class names for the overlay container */
  className?: string
  /** Class for the play/pause and fullscreen buttons */
  buttonClassName?: string
  /** Icon size for volume and fullscreen buttons */
  iconSize?: number
  /** When true, skips rendering the top-left VolumeControl so the caller can render it externally */
  renderVolumeExternal?: boolean
}

export function VideoControls({
  isPlaying,
  onTogglePlay,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  fullscreenRef,
  visibility = 'hover',
  className = '',
  buttonClassName = 'p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors',
  iconSize = 16,
  renderVolumeExternal = false,
}: VideoControlsProps) {
  // Auto-hide logic for non-hover mode
  const [showControls, setShowControls] = useState(true)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetAutoHide = useCallback(() => {
    if (typeof visibility === 'object') {
      setShowControls(true)
      if (hideTimer.current) clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => setShowControls(false), visibility.autoHide)
    }
  }, [visibility])

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [])

  // For hover mode, visibility is controlled by CSS (group-hover on parent)
  // For autoHide mode, visibility is controlled by showControls state
  const isAutoHide = typeof visibility === 'object'
  const visibilityClasses = isAutoHide
    ? `transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`
    : 'opacity-100 md:opacity-0 md:group-hover/video:opacity-100 transition-opacity'

  return (
    <>
      {/* Mute/Volume — top-left, slider extends rightward */}
      {!renderVolumeExternal && (
        <div
          className={`absolute top-3 left-3 z-10 ${visibilityClasses} ${className}`}
          onPointerMove={isAutoHide ? resetAutoHide : undefined}
          onClick={isAutoHide ? resetAutoHide : undefined}
        >
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
            iconSize={iconSize}
            buttonClassName={buttonClassName}
            popDirection="right"
          />
        </div>
      )}

      {/* Bottom bar: play + fullscreen */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-10 flex items-center gap-2 p-3 bg-gradient-to-t from-black/70 to-transparent ${visibilityClasses} ${className}`}
        onPointerMove={isAutoHide ? resetAutoHide : undefined}
        onClick={isAutoHide ? resetAutoHide : undefined}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay() }}
          className={buttonClassName}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause style={{ width: iconSize, height: iconSize }} /> : <Play style={{ width: iconSize, height: iconSize }} />}
        </button>
        <FullscreenButton
          targetRef={fullscreenRef}
          iconSize={iconSize}
          className={`${buttonClassName} ml-auto`}
        />
      </div>
    </>
  )
}
