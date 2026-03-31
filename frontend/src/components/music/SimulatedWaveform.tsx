import { useRef, useEffect, useCallback } from 'react'

interface SimulatedWaveformProps {
  /** Seed string (word ID) for deterministic bar heights */
  seed: string
  /** Progress 0–1 */
  progress: number
  /** Called with seek ratio 0–1 when user clicks/drags */
  onSeek: (ratio: number) => void
  className?: string
}

// Simple seeded PRNG (mulberry32-style, seed from string)
function makeRng(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return () => {
    h |= 0
    h = (h + 0x6d2b79f5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const BAR_COUNT = 80
const BAR_GAP = 2
const DOT_RADIUS = 1.5
const DOT_SPACING = 4

export function SimulatedWaveform({ seed, progress, onSeek, className }: SimulatedWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const barsRef = useRef<number[]>([])

  // Generate bars once per seed
  if (barsRef.current.length === 0 || barsRef.current.length !== BAR_COUNT) {
    const rng = makeRng(seed || 'default')
    barsRef.current = Array.from({ length: BAR_COUNT }, () => {
      // Mix of high and low bars with some smoothing feel
      const base = rng()
      const bump = rng()
      return Math.max(0.08, Math.min(1, base * 0.7 + bump * 0.3))
    })
  }

  useEffect(() => {
    // Regenerate bars when seed changes
    const rng = makeRng(seed || 'default')
    barsRef.current = Array.from({ length: BAR_COUNT }, () => {
      const base = rng()
      const bump = rng()
      return Math.max(0.08, Math.min(1, base * 0.7 + bump * 0.3))
    })
  }, [seed])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, w, h)

    const bars = barsRef.current
    const totalGap = BAR_GAP * (BAR_COUNT - 1)
    const colW = Math.max(1, (w - totalGap) / BAR_COUNT)
    const playedUntil = progress * BAR_COUNT
    const centerY = h / 2

    for (let i = 0; i < BAR_COUNT; i++) {
      const barH = bars[i] * h
      const colX = i * (colW + BAR_GAP) + colW / 2

      const isPlayed = i < playedUntil
      const isPartial = i === Math.floor(playedUntil) && playedUntil < BAR_COUNT

      // Compute dot grid for this column
      const numDots = Math.max(1, Math.round(barH / DOT_SPACING))
      const span = (numDots - 1) * DOT_SPACING
      const topY = centerY - span / 2

      if (isPartial) {
        // Partial column: dots below midpoint are played, above are unplayed
        const frac = playedUntil - Math.floor(playedUntil)
        const playedDots = Math.round(frac * numDots)
        for (let d = 0; d < numDots; d++) {
          ctx.fillStyle = d < playedDots ? 'var(--accent, #06b6d4)' : 'rgba(255,255,255,0.15)'
          ctx.beginPath()
          ctx.arc(colX, topY + d * DOT_SPACING, DOT_RADIUS, 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        ctx.fillStyle = isPlayed ? 'var(--accent, #06b6d4)' : 'rgba(255,255,255,0.15)'
        for (let d = 0; d < numDots; d++) {
          ctx.beginPath()
          ctx.arc(colX, topY + d * DOT_SPACING, DOT_RADIUS, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }, [progress, seed])

  useEffect(() => {
    draw()
  }, [draw])

  // Redraw on resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(() => draw())
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [draw])

  const getSeekRatio = useCallback((clientX: number): number => {
    const canvas = canvasRef.current
    if (!canvas) return 0
    const rect = canvas.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  const isDraggingRef = useRef(false)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId)
      isDraggingRef.current = true
      onSeek(getSeekRatio(e.clientX))
    },
    [onSeek, getSeekRatio],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDraggingRef.current) return
      onSeek(getSeekRatio(e.clientX))
    },
    [onSeek, getSeekRatio],
  )

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`cursor-pointer touch-none ${className ?? ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  )
}
