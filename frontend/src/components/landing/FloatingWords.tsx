import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { DRIFT_PHRASES } from './landingData'
import { waveHeight, waveSlope, WAVE_AMP_SUM, worldXFromPercent } from '@/lib/waveField'

// FloatingWords — multilingual words riding the hero swell as buoys.
//
// Unlike the old drift layer, these sample the exact wave field the canvas
// paints: each word owns a (worldX, z, depth) and bobs/tilts with the water
// beneath it. Opacity breathes on a slow CSS loop; transforms run in one rAF
// that pauses when the hero scrolls away.

type Slot = {
  left: number // percent
  top: number // percent
  size: string
  peak: number // breathing peak opacity
  z: number
  depth: number // 0..1 nearness — nearer words ride higher
  delay: number // breathing phase offset, seconds
}

const DESKTOP_SLOTS: Slot[] = [
  { left: 10, top: 24, size: 'text-lg', peak: 0.5, z: 6, depth: 0.85, delay: 0 },
  { left: 82, top: 20, size: 'text-base', peak: 0.42, z: 11, depth: 0.6, delay: 2.1 },
  { left: 22, top: 62, size: 'text-2xl', peak: 0.55, z: 4, depth: 1, delay: 4.4 },
  { left: 70, top: 68, size: 'text-xl', peak: 0.5, z: 5, depth: 0.95, delay: 1.2 },
  { left: 48, top: 16, size: 'text-sm', peak: 0.34, z: 16, depth: 0.4, delay: 5.6 },
  { left: 88, top: 48, size: 'text-lg', peak: 0.46, z: 8, depth: 0.75, delay: 3.3 },
  { left: 6, top: 44, size: 'text-base', peak: 0.4, z: 12, depth: 0.55, delay: 6.8 },
  { left: 34, top: 82, size: 'text-lg', peak: 0.48, z: 4.5, depth: 0.9, delay: 8 },
  { left: 62, top: 38, size: 'text-sm', peak: 0.32, z: 18, depth: 0.35, delay: 9.4 },
]

// Mobile slots hug the corners: the centered headline/CTA column owns the
// middle of a small screen, so buoys stay out of its way.
const MOBILE_SLOTS: Slot[] = [
  { left: 13, top: 13, size: 'text-base', peak: 0.46, z: 6, depth: 0.85, delay: 0 },
  { left: 80, top: 18, size: 'text-sm', peak: 0.38, z: 11, depth: 0.6, delay: 2.8 },
  { left: 12, top: 86, size: 'text-lg', peak: 0.5, z: 4, depth: 1, delay: 5.2 },
  { left: 83, top: 90, size: 'text-base', peak: 0.44, z: 5, depth: 0.9, delay: 7.5 },
]

const RIDE_PX = 14
const TILT_MAX_DEG = 6

function useIsCompact() {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = (event: MediaQueryListEvent) => setCompact(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  return compact
}

export default function FloatingWords() {
  const reducedMotion = useReducedMotion()
  const compact = useIsCompact()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([])

  const slots = compact ? MOBILE_SLOTS : DESKTOP_SLOTS
  const words = DRIFT_PHRASES.slice(0, slots.length)

  useEffect(() => {
    if (reducedMotion) return
    const container = containerRef.current
    if (!container) return

    let raf = 0
    let running = false
    const start = performance.now()

    const frame = () => {
      // Same time base scale as the brand ocean (t advances ~1/sec from 30).
      const t = 30 + (performance.now() - start) / 1000
      for (let i = 0; i < slots.length; i++) {
        const el = wordRefs.current[i]
        if (!el) continue
        const slot = slots[i]
        const wx = worldXFromPercent(slot.left)
        const norm = waveHeight(wx, slot.z, t) / WAVE_AMP_SUM
        const y = -norm * RIDE_PX * (0.55 + slot.depth * 0.9)
        const tilt = Math.max(-TILT_MAX_DEG, Math.min(TILT_MAX_DEG, waveSlope(wx, slot.z, t) * 5))
        el.style.transform = `translate(-50%, -50%) translateY(${y.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)`
      }
      raf = requestAnimationFrame(frame)
    }

    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      running = false
    }
    const startLoop = () => {
      if (running) return
      running = true
      raf = requestAnimationFrame(frame)
    }

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting && !document.hidden ? startLoop() : stop()),
      { threshold: 0 },
    )
    observer.observe(container)
    const onVisibility = () => (document.hidden ? stop() : startLoop())
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reducedMotion, slots])

  return (
    <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0">
      <style>
        {`
          @keyframes lw-buoy-breathe {
            0%, 100% { opacity: var(--buoy-min); }
            50% { opacity: var(--buoy-peak); }
          }
        `}
      </style>
      {words.map((phrase, i) => {
        const slot = slots[i]
        return (
          <span
            key={phrase.text}
            ref={(node) => {
              wordRefs.current[i] = node
            }}
            lang={phrase.lang}
            className={`absolute font-light text-white select-none ${slot.size}`}
            style={{
              left: `${slot.left}%`,
              top: `${slot.top}%`,
              transform: 'translate(-50%, -50%)',
              opacity: reducedMotion ? slot.peak : undefined,
              textShadow: '0 2px 14px rgba(5,2,8,0.6)',
              ...(reducedMotion
                ? {}
                : ({
                    '--buoy-min': `${Math.max(0.16, slot.peak - 0.24)}`,
                    '--buoy-peak': `${slot.peak}`,
                    animation: `lw-buoy-breathe 12s ease-in-out ${slot.delay}s infinite`,
                  } as React.CSSProperties)),
            }}
          >
            {phrase.text}
          </span>
        )
      })}
    </div>
  )
}
