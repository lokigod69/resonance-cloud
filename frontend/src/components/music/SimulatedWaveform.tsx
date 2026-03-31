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
    const barW = Math.max(1, (w - totalGap) / BAR_COUNT)
    const playedUntil = progress * BAR_COUNT

    for (let i = 0; i < BAR_COUNT; i++) {
      const barH = bars[i] * h
      const x = i * (barW + BAR_GAP)
      const y = (h - barH) / 2

      const played = i < playedUntil
      const partial = i >= Math.floor(playedUntil) && i < Math.ceil(playedUntil)

      if (partial) {
        // Partially played bar: split fill
        const frac = playedUntil - Math.floor(playedUntil)
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.fillRect(x, y, barW, barH)
        ctx.fillStyle = 'var(--accent, #06b6d4)'
        ctx.fillRect(x, y, barW * frac, barH)
      } else {
        ctx.fillStyle = played ? 'var(--accent, #06b6d4)' : 'rgba(255,255,255,0.15)'
        ctx.fillRect(x, y, barW, barH)
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
