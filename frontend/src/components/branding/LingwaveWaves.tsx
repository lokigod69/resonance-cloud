import { useEffect, useRef } from 'react'

/**
 * LingwaveWaves — animated brand background for auth/marketing surfaces.
 *
 * A perspective-projected field of slow ocean swells rendered as luminous
 * contour lines: plum fog at the horizon, vermillion mid-water, gold crests,
 * sparse longitude seams for mesh depth, and a quiet star field above.
 *
 * Canvas 2D only (no WebGL, no dependencies). DPR is capped, the loop pauses
 * while the tab is hidden, and prefers-reduced-motion gets one still frame.
 */

type RGB = [number, number, number]

// Palette pinned to the cosmos theme (src/themes/cosmos.css)
const BG_TOP: RGB = [10, 6, 14]
const BG_HORIZON: RGB = [28, 15, 34]
const BG_DEEP: RGB = [8, 4, 11]
const SWELL_LOW: RGB = [86, 62, 122] // plum trough (near --m-cool)
const SWELL_MID: RGB = [184, 68, 122] // --m-mid
const SWELL_WARM: RGB = [242, 79, 19] // --accent
const SWELL_CREST: RGB = [247, 200, 67] // --accent-2

const Z_NEAR = 2
const Z_FAR = 46
const ROWS = 64
const ROW_POINTS = 72
const COL_SPACING = 2.6
const COL_STEPS = 36
const MAX_DPR = 1.75
const CAM_HEIGHT = 3.2
const AMP = 1.51 // sum of amplitudes in waveHeight

// Long, layered swells travelling toward the viewer (+t on z-terms).
function waveHeight(x: number, z: number, t: number): number {
  return (
    0.55 * Math.sin(x * 0.18 + z * 0.3 + t * 0.42) +
    0.38 * Math.sin(x * 0.3 - z * 0.16 + t * 0.27) +
    0.28 * Math.sin(x * 0.06 + z * 0.44 + t * 0.36) +
    0.18 * Math.sin(x * 0.52 + z * 0.08 - t * 0.22) +
    0.12 * Math.sin(x * 0.85 + z * 0.65 + t * 0.55)
  )
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function rgba(c: RGB, a: number): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a < 0 ? 0 : a > 1 ? 1 : +a.toFixed(3)})`
}

// Trough → crest color ramp.
function rampColor(hn: number): RGB {
  if (hn < 0.5) return mix(SWELL_LOW, SWELL_MID, hn / 0.5)
  if (hn < 0.8) return mix(SWELL_MID, SWELL_WARM, (hn - 0.5) / 0.3)
  return mix(SWELL_WARM, SWELL_CREST, (hn - 0.8) / 0.2)
}

// Geometric depth spacing: dense rows near the camera, bunching at the horizon.
function depthAt(v: number): number {
  return Z_NEAR * Math.pow(Z_FAR / Z_NEAR, v)
}

type Star = { x: number; y: number; r: number; phase: number; speed: number }

function makeStars(count: number): Star[] {
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.pow(Math.random(), 1.4), // bias toward the top of the sky
      r: 0.4 + Math.random() * 0.9,
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.5,
    })
  }
  return stars
}

function render(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, stars: Star[]) {
  const horizon = h * 0.4
  const focal = h * 0.85
  const cx = w / 2
  const xPad = 24

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, horizon)
  sky.addColorStop(0, rgba(BG_TOP, 1))
  sky.addColorStop(1, rgba(BG_HORIZON, 1))
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, horizon + 1)

  // Sea base
  const sea = ctx.createLinearGradient(0, horizon, 0, h)
  sea.addColorStop(0, rgba(BG_HORIZON, 1))
  sea.addColorStop(1, rgba(BG_DEEP, 1))
  ctx.fillStyle = sea
  ctx.fillRect(0, horizon, w, h - horizon)

  // Stars (slow twinkle)
  for (const s of stars) {
    const a = 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase))
    ctx.fillStyle = rgba([255, 244, 234], a)
    ctx.beginPath()
    ctx.arc(s.x * w, s.y * (horizon - 14), s.r, 0, Math.PI * 2)
    ctx.fill()
  }

  // Horizon glow — a warm dawn behind the wave field
  ctx.save()
  ctx.translate(cx, horizon)
  ctx.scale(1, 0.34)
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.58)
  glow.addColorStop(0, rgba(SWELL_WARM, 0.2))
  glow.addColorStop(0.45, rgba(SWELL_MID, 0.09))
  glow.addColorStop(1, rgba(SWELL_MID, 0))
  ctx.fillStyle = glow
  ctx.fillRect(-w, -w, 2 * w, 2 * w)
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.2)
  core.addColorStop(0, rgba(SWELL_CREST, 0.16))
  core.addColorStop(1, rgba(SWELL_CREST, 0))
  ctx.fillStyle = core
  ctx.fillRect(-w, -w, 2 * w, 2 * w)
  ctx.restore()

  // Thin horizon light
  const hline = ctx.createLinearGradient(0, 0, w, 0)
  hline.addColorStop(0, rgba(SWELL_CREST, 0))
  hline.addColorStop(0.5, rgba(SWELL_CREST, 0.28))
  hline.addColorStop(1, rgba(SWELL_CREST, 0))
  ctx.fillStyle = hline
  ctx.fillRect(0, horizon - 0.75, w, 1.5)

  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // Longitude seams — faint vertical mesh lines converging on the horizon
  const colHalf = Math.min(40, Math.ceil(((w / 2 + xPad) * Z_FAR) / focal / COL_SPACING))
  for (let c = -colHalf; c <= colHalf; c++) {
    const worldX = c * COL_SPACING
    let nearX = 0
    let nearY = 0
    ctx.beginPath()
    for (let s = 0; s <= COL_STEPS; s++) {
      const z = depthAt(s / COL_STEPS)
      const hh = waveHeight(worldX, z, t)
      const sx = cx + (worldX * focal) / z
      const sy = horizon + ((CAM_HEIGHT - hh) * focal) / z
      if (s === 0) {
        nearX = sx
        nearY = sy
        ctx.moveTo(sx, sy)
      } else {
        ctx.lineTo(sx, sy)
      }
    }
    const seam = ctx.createLinearGradient(nearX, nearY, cx + (worldX * focal) / Z_FAR, horizon)
    seam.addColorStop(0, rgba(mix(SWELL_WARM, SWELL_LOW, 0.55), 0.11))
    seam.addColorStop(0.75, rgba(SWELL_LOW, 0.05))
    seam.addColorStop(1, rgba(SWELL_LOW, 0))
    ctx.strokeStyle = seam
    ctx.lineWidth = 0.8
    ctx.stroke()
  }

  // Swell contours, far → near so close water paints over distant water
  const sparkles: { x: number; y: number; s: number }[] = []
  const left = -xPad
  const right = w + xPad
  const sxs: number[] = []
  const sys: number[] = []
  const hns: number[] = []
  for (let i = ROWS - 1; i >= 0; i--) {
    const v = i / (ROWS - 1)
    const z = depthAt(v)
    const fogT = (z - Z_NEAR) / (Z_FAR - Z_NEAR)
    const fade = Math.pow(1 - fogT, 1.25)
    const dissolve = Math.min(1, (1 - fogT) * 6) // melt into the horizon glow
    const rowAlpha = (0.08 + 0.6 * fade) * dissolve
    if (rowAlpha < 0.012) continue

    for (let k = 0; k < ROW_POINTS; k++) {
      const sx = left + ((right - left) * k) / (ROW_POINTS - 1)
      const worldX = ((sx - cx) * z) / focal
      const hh = waveHeight(worldX, z, t)
      sxs[k] = sx
      sys[k] = horizon + ((CAM_HEIGHT - hh) * focal) / z
      hns[k] = (hh / AMP + 1) / 2
    }

    const grad = ctx.createLinearGradient(left, 0, right, 0)
    for (let k = 0; k < ROW_POINTS; k += 6) {
      const hn = hns[k]
      const col = mix(rampColor(hn), SWELL_LOW, fogT * 0.7)
      grad.addColorStop(k / (ROW_POINTS - 1), rgba(col, rowAlpha * (0.5 + 0.5 * hn)))
    }

    ctx.beginPath()
    ctx.moveTo(sxs[0], sys[0])
    for (let k = 1; k < ROW_POINTS; k++) ctx.lineTo(sxs[k], sys[k])
    ctx.strokeStyle = grad
    ctx.lineWidth = 0.5 + 1.3 * fade
    ctx.stroke()

    // Collect gold glints on near crests
    if (fade > 0.55 && sparkles.length < 22) {
      for (let k = 2; k < ROW_POINTS - 2; k += 2) {
        if (hns[k] > 0.88 && hns[k] >= hns[k - 2] && hns[k] >= hns[k + 2]) {
          sparkles.push({ x: sxs[k], y: sys[k], s: ((hns[k] - 0.88) / 0.12) * fade })
          if (sparkles.length >= 22) break
        }
      }
    }
  }

  // Crest glints
  ctx.globalCompositeOperation = 'lighter'
  for (const sp of sparkles) {
    const r = 4 + sp.s * 10
    const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, r)
    g.addColorStop(0, rgba(SWELL_CREST, 0.4 * sp.s))
    g.addColorStop(1, rgba(SWELL_CREST, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'

  // Vignette to seat the glass card
  const vig = ctx.createRadialGradient(
    cx,
    h * 0.55,
    Math.min(w, h) * 0.42,
    cx,
    h * 0.55,
    Math.hypot(w, h) * 0.62,
  )
  vig.addColorStop(0, 'rgba(5,2,8,0)')
  vig.addColorStop(1, 'rgba(5,2,8,0.5)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, w, h)
}

export function LingwaveWaves({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const stars = makeStars(110)
    let raf = 0
    let last = performance.now()
    let t = 30 // start mid-swell instead of a flat sea
    let width = 0
    let height = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (reduceMotion) render(ctx, width, height, t, stars)
    }

    const frame = (now: number) => {
      t += Math.min(0.05, (now - last) / 1000)
      last = now
      render(ctx, width, height, t, stars)
      raf = requestAnimationFrame(frame)
    }

    const start = () => {
      if (raf || reduceMotion) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const onVisibility = () => (document.hidden ? stop() : start())

    resize()
    start()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  )
}
