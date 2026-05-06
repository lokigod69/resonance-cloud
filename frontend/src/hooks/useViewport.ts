import { useEffect, useState } from 'react'

export type CanvasViewport = 'lane' | 'cloud'

function getViewport(): CanvasViewport {
  if (typeof window === 'undefined') return 'cloud'
  return window.matchMedia('(max-width: 767px)').matches ? 'lane' : 'cloud'
}

export function useViewport(): CanvasViewport {
  const [viewport, setViewport] = useState<CanvasViewport>(getViewport)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setViewport(media.matches ? 'lane' : 'cloud')

    update()
    media.addEventListener('change', update)
    window.addEventListener('orientationchange', update)

    return () => {
      media.removeEventListener('change', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return viewport
}
