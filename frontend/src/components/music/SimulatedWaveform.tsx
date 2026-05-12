import { useRef, useEffect, useCallback, useMemo, type CSSProperties, type PointerEvent } from 'react'

interface SimulatedWaveformProps {
  /** Seed string (word ID) for deterministic bar heights */
  seed: string
  /** Progress 0–1 */
  progress: number
  /** Called with seek ratio 0–1 when user clicks/drags */
  onSeek: (ratio: number) => void
  className?: string
  variant?: 'dotted' | 'line'
  disabled?: boolean
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

function makeBars(seed: string): number[] {
  const rng = makeRng(seed || 'default')
  return Array.from({ length: BAR_COUNT }, () => {
    const base = rng()
    const bump = rng()
    return Math.max(0.08, Math.min(1, base * 0.7 + bump * 0.3))
  })
}

export function SimulatedWaveform({
  seed,
  progress,
  onSeek,
  className,
  variant = 'dotted',
  disabled = false,
}: SimulatedWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const bars = useMemo(() => makeBars(seed), [seed])

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
  }, [bars, progress])

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

  const getCanvasSeekRatio = useCallback((clientX: number): number => {
    const canvas = canvasRef.current
    if (!canvas) return 0
    const rect = canvas.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  const getTrackSeekRatio = useCallback((clientX: number): number => {
    const track = trackRef.current
    if (!track) return 0
    const rect = track.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  }, [])

  const handlePointerDown = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return
      e.currentTarget.setPointerCapture(e.pointerId)
      isDraggingRef.current = true
      onSeek(getCanvasSeekRatio(e.clientX))
    },
    [disabled, onSeek, getCanvasSeekRatio],
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return
      if (!isDraggingRef.current) return
      onSeek(getCanvasSeekRatio(e.clientX))
    },
    [disabled, onSeek, getCanvasSeekRatio],
  )

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
  }, [])

  const handleLinePointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return
      e.currentTarget.setPointerCapture(e.pointerId)
      isDraggingRef.current = true
      onSeek(getTrackSeekRatio(e.clientX))
    },
    [disabled, onSeek, getTrackSeekRatio],
  )

  const handleLinePointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled) return
      if (!isDraggingRef.current) return
      onSeek(getTrackSeekRatio(e.clientX))
    },
    [disabled, onSeek, getTrackSeekRatio],
  )

  const safeProgress = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0))

  if (variant === 'line') {
    return (
      <div
        ref={trackRef}
        className={`relative flex h-full min-h-8 items-center ${disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'} touch-none ${className ?? ''}`}
        onPointerDown={handleLinePointerDown}
        onPointerMove={handleLinePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(safeProgress * 100)}
        aria-disabled={disabled}
      >
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex h-6 -translate-y-1/2 items-center justify-between overflow-hidden">
          {bars.map((height, index) => (
            <span
              key={index}
              className="w-px rounded-full bg-foreground/10"
              style={{ height: `${Math.max(4, height * 18)}px` }}
            />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-foreground/20" />
        <div
          className="pointer-events-none absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-[var(--media-player-accent,var(--accent,#06b6d4))]"
          style={{ width: `${safeProgress * 100}%` }}
        />
        <div
          className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-[var(--media-player-accent,var(--accent,#06b6d4))] shadow-[0_2px_8px_rgba(0,0,0,0.32)]"
          style={{ left: `${safeProgress * 100}%` } as CSSProperties}
        />
      </div>
    )
  }

  return (
    <canvas
      ref={canvasRef}
      className={`${disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'} touch-none ${className ?? ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    />
  )
}
