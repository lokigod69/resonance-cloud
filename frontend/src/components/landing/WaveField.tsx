import { useEffect, useRef } from 'react'
import { LingwaveWaves, type WaveRipple, type WaveWind } from '@/components/branding/LingwaveWaves'

// WaveField — the landing's living water.
//
// Wraps the brand ocean and wires it to the page: the pointer is a breeze that
// leans the swell (windRef), moving leaves a quiet wake, tapping rolls a full
// wavetrain, and scrolling the first viewport raises the sea (energyRef).
// All listeners are window-level and mapped into the canvas' own space (the
// canvas spans the first page-viewport), so no element needs pointer events.

const WAKE_MIN_INTERVAL_MS = 260
const WAKE_MIN_TRAVEL_PX = 64
const WAKE_AMP = 0.4

export default function WaveField({
  className,
  dawn = 0,
  interactive = true,
}: {
  className?: string
  dawn?: number
  interactive?: boolean
}) {
  const ripplesRef = useRef<WaveRipple[]>([])
  const windRef = useRef<WaveWind>({ x: 0.5, y: 0.5, strength: 0 })
  const energyRef = useRef(0)

  useEffect(() => {
    if (!interactive) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canHover = window.matchMedia('(hover: hover)').matches

    let lastWakeAt = 0
    let lastWakeX = -1e4
    let lastWakeY = -1e4

    // Canvas space: the sea occupies the first viewport-height of the document.
    const toCanvasFrac = (clientX: number, clientY: number) => ({
      x: clientX / window.innerWidth,
      y: (clientY + window.scrollY) / window.innerHeight,
    })

    const onScroll = () => {
      energyRef.current = Math.min(1, Math.max(0, window.scrollY / window.innerHeight))
      if (window.scrollY > window.innerHeight * 0.9) windRef.current.strength = 0
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!canHover) return
      const { x, y } = toCanvasFrac(event.clientX, event.clientY)
      if (y > 1) {
        windRef.current.strength = 0
        return
      }
      windRef.current.x = x
      windRef.current.y = y
      windRef.current.strength = 1

      const now = performance.now()
      const dx = event.clientX - lastWakeX
      const dy = event.clientY - lastWakeY
      if (now - lastWakeAt >= WAKE_MIN_INTERVAL_MS && dx * dx + dy * dy >= WAKE_MIN_TRAVEL_PX * WAKE_MIN_TRAVEL_PX) {
        lastWakeAt = now
        lastWakeX = event.clientX
        lastWakeY = event.clientY
        ripplesRef.current = [...ripplesRef.current.slice(-7), { x, y, start: now, amp: WAKE_AMP }]
      }
    }

    const onPointerDown = (event: PointerEvent) => {
      const { x, y } = toCanvasFrac(event.clientX, event.clientY)
      if (y > 1) return
      ripplesRef.current = [...ripplesRef.current.slice(-7), { x, y, start: performance.now() }]
    }

    const onPointerLeave = () => {
      windRef.current.strength = 0
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    document.documentElement.addEventListener('pointerleave', onPointerLeave)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      document.documentElement.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [interactive])

  return (
    <LingwaveWaves
      className={className}
      ripplesRef={ripplesRef}
      windRef={windRef}
      energyRef={energyRef}
      dawn={dawn}
    />
  )
}
