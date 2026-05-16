import { useState, useEffect, useCallback, type RefObject } from 'react'
import { Maximize, Minimize } from 'lucide-react'

// Non-standard iOS Safari video fullscreen API. Not in lib.dom.d.ts.
interface IOSSafariVideoElement {
  webkitEnterFullscreen: () => void
}

interface FullscreenButtonProps {
  targetRef: RefObject<HTMLVideoElement | HTMLDivElement | null>
  className?: string
  iconSize?: number
}

export function FullscreenButton({
  targetRef,
  className = 'p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors',
  iconSize = 16,
}: FullscreenButtonProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  const toggleFullscreen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const el = targetRef.current
    if (!el) return

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {})
    } else if ('webkitEnterFullscreen' in el && typeof (el as Partial<IOSSafariVideoElement>).webkitEnterFullscreen === 'function') {
      // iOS Safari fallback for video elements
      ;(el as IOSSafariVideoElement).webkitEnterFullscreen()
    }
  }, [targetRef])

  const Icon = isFullscreen ? Minimize : Maximize

  return (
    <button
      onClick={toggleFullscreen}
      className={className}
      title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
    >
      <Icon style={{ width: iconSize, height: iconSize }} />
    </button>
  )
}
