import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

type Preset = 'rose' | 'starburst' | 'spiral' | 'spirograph' | 'heart'
const ALL_PRESETS: Preset[] = ['rose', 'starburst', 'spiral', 'spirograph', 'heart']

export interface ParticleSpinnerProps {
  /** Which curve preset to render */
  preset?: Preset
  /** Canvas size in CSS pixels (default 120) */
  size?: number
  /** Pick a random preset on mount */
  random?: boolean
  /** Optional className for the canvas element */
  className?: string
}

function parseCSSColor(raw: string): { r: number; g: number; b: number } | null {
  if (!raw) return null
  // Direct hex
  const hex = raw.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const n = parseInt(hex[1], 16)
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
  }
  // Direct rgb()
  const rgb = raw.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/)
  if (rgb) return { r: +rgb[1], g: +rgb[2], b: +rgb[3] }
  // oklch, hsl, or other formats — let the browser resolve it
  try {
    const temp = document.createElement('div')
    temp.style.color = raw
    temp.style.display = 'none'
    document.body.appendChild(temp)
    try {
      const computed = getComputedStyle(temp).color
      const m = computed.match(/(\d+),\s*(\d+),\s*(\d+)/)
      if (m) return { r: +m[1], g: +m[2], b: +m[3] }
    } finally {
      document.body.removeChild(temp)
    }
  } catch { /* ignore */ }
  return null
}

function getThemeColor(): { r: number; g: number; b: number } {
  try {
    const style = getComputedStyle(document.documentElement)
    const accent = style.getPropertyValue('--color-accent').trim()
    const parsed = parseCSSColor(accent)
    if (parsed) return parsed
  } catch { /* ignore */ }
  return { r: 200, g: 210, b: 230 }
}

function getThemeBackground(): { r: number; g: number; b: number } {
  try {
    const style = getComputedStyle(document.documentElement)
    const bg = style.getPropertyValue('--background').trim()
    const parsed = parseCSSColor(bg)
    if (parsed) return parsed
  } catch { /* ignore */ }
  return { r: 0, g: 0, b: 0 }
}

type PlotFn = (p: number, ds: number) => readonly [number, number]

function buildPresets(size: number): Record<Preset, { fn: PlotFn; scale: number }> {
  // ─── Rose / Starburst ────────────────────────────────────────────────────
  const roseA = 23
  const roseABoost = 11.7
  const roseBreathBase = 0.01
  const roseBreathBoost = 0.01

  function makeRose(k: number): PlotFn {
    return (p, ds) => {
      const t = Math.PI * 2 * p
      const a = roseA + (ds / 11.4) * roseABoost
      const breath = roseBreathBase + (ds / 1.4) * roseBreathBoost
      const r = a * breath * Math.cos(t * k)
      return [Math.cos(t) * r, Math.sin(t) * r] as const
    }
  }

  // ─── Modulated Spiral ────────────────────────────────────────────────────
  function spiralFn(p: number, ds: number): readonly [number, number] {
    const t = Math.PI * 2 * p
    const angle = t * 6
    const pulse = 0.9 + ds * 0.3
    const rMod = Math.cos(t * 15)
    const radius = 0.9 + (1 - rMod) * pulse
    const angMod = Math.cos(t * 42) * 0.5
    const sc = 0.12 + ds * 0.05
    return [Math.cos(angle + angMod) * radius * sc, Math.sin(angle + angMod) * radius * sc] as const
  }

  // ─── Spirograph ──────────────────────────────────────────────────────────
  function spirographFn(p: number, ds: number): readonly [number, number] {
    const t = Math.PI * 2 * p
    const R = 3, r = 0.2
    const d = 0.6 + ds * 0.25
    const diff = R - r
    const ratio = diff / r
    const bx = diff * Math.cos(t) + d * Math.cos(t * ratio)
    const by = diff * Math.sin(t) - d * Math.sin(t * ratio)
    const sc = 0.10001 + ds * 0.001
    return [bx * sc, by * sc] as const
  }

  // ─── Heart Wave ──────────────────────────────────────────────────────────
  function heartFn(p: number): readonly [number, number] {
    const x = -1 + p * 2
    const sr = Math.max(0, 1 - x * x)
    const wave = 1.2 * Math.sqrt(sr) * Math.sin(x * 12 * Math.PI)
    const curve = Math.pow(Math.abs(x), 2 / 3)
    const y = curve + wave
    return [x * 0.4, (-0.5 + y) * 0.4] as const
  }

  return {
    rose:       { fn: makeRose(8),  scale: size * 0.38 },
    starburst:  { fn: makeRose(66), scale: size * 0.38 },
    spiral:     { fn: spiralFn,     scale: size * 0.86 },
    spirograph: { fn: spirographFn, scale: size * 1.16 },
    heart:      { fn: heartFn,      scale: size * 0.67 },
  }
}

export function ParticleSpinner({ preset, size = 120, random = false, className }: ParticleSpinnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // Stable random preset — picked once on mount, never changes
  const stableRandom = useRef<Preset>(ALL_PRESETS[Math.floor(Math.random() * ALL_PRESETS.length)])
  const activePreset: Preset = preset ?? (random ? stableRandom.current : 'rose')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctxOrNull = canvas.getContext('2d')
    if (!ctxOrNull) return
    const ctx = ctxOrNull

    // HiDPI canvas
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const presets = buildPresets(size)
    const { fn: plotFn, scale } = presets[activePreset]
    const tc = getThemeColor()
    const bg = getThemeBackground()
    const isLight = bg.r + bg.g + bg.b > 384
    const N = size >= 200 ? 3000 : 2000
    const cx = size / 2
    const cy = size / 2

    let time = 0
    let rafId: number

    function draw() {
      // Breathing scale — very subtle, drives the detailScale parameter
      const ds = 0.7 + Math.sin(time * 3) * 0.02

      // ── Fade trail: semi-transparent overlay converges canvas to theme background ──
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = `rgba(${bg.r},${bg.g},${bg.b},0.12)`
      ctx.fillRect(0, 0, size, size)

      // ── Pass 1: full-curve background glow (very dim, same color each frame) ──
      // On light themes, additive blending saturates to white — use source-over instead
      ctx.globalCompositeOperation = isLight ? 'source-over' : 'lighter'
      ctx.fillStyle = isLight
        ? `rgba(${tc.r},${tc.g},${tc.b},0.06)`
        : `rgba(${tc.r},${tc.g},${tc.b},0.04)`
      for (let i = 0; i < N; i++) {
        const p = i / N
        const [x, y] = plotFn(p, ds)
        ctx.fillRect(cx + x * scale - 0.5, cy - y * scale - 0.5, 1, 1)
      }

      // ── Pass 2: bright sweeping trail ──
      const head = (time / 4) % 1
      const tLen = 0.3
      for (let i = 0; i < N; i++) {
        const p = i / N
        const ag = (p - head + 1) % 1  // distance behind trail head
        if (ag > tLen) continue
        const bright = 1 - ag / tLen   // 1.0 at head, 0.0 at tail
        const [x, y] = plotFn(p, ds)
        const alpha = 0.1 + bright * 0.7
        const sz = 0.8 + bright * 1.5
        // On light themes, draw dark trail instead of white (which would be invisible)
        ctx.fillStyle = isLight
          ? `rgba(${tc.r},${tc.g},${tc.b},${alpha})`
          : `rgba(255,255,255,${alpha})`
        ctx.fillRect(cx + x * scale - sz / 2, cy - y * scale - sz / 2, sz, sz)
      }

      ctx.globalCompositeOperation = 'source-over'
      time += 0.016
      rafId = requestAnimationFrame(draw)
    }

    rafId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafId)
  }, [activePreset, size])  

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, maxWidth: '80vw', maxHeight: '80vw' }}
      className={cn(className)}
    />
  )
}
