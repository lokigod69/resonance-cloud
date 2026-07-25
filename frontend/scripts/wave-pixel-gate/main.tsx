/* eslint-disable */
// wave-pixel-gate — deterministic pixel-identity harness for LingwaveWaves.
//
// Compares the HEAD version of the component (LingwaveWavesOld.tsx, extracted
// via `git show`) against the working-tree version, frame for frame, under a
// fully stubbed clock / RNG / rAF environment.
//
// IMPORTANT: this module has NO static imports. Every stub below must be in
// place before any component (or React) module is evaluated, so all imports
// are dynamic and happen at the bottom of `main()`.

const W = 390
const H = 844
const FRAMES = 60
const DT_MS = 16.67
const BASE_TIME = 1000

// ---------------------------------------------------------------------------
// (i) seeded LCG replacing Math.random
// ---------------------------------------------------------------------------
const SEED = 0x2545f491 >>> 0
let rngState = SEED
function resetSeed() {
  rngState = SEED
}
Math.random = function seededRandom() {
  rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0
  return rngState / 4294967296
}
;(window as any).resetSeed = resetSeed

// ---------------------------------------------------------------------------
// (ii) controlled virtual performance.now
// ---------------------------------------------------------------------------
let vnow = BASE_TIME
;(performance as any).now = function virtualNow() {
  return vnow
}

// Precomputed timestamp ladder — replayed byte-identically for every run so
// the float accumulation of 16.67ms steps can never differ between runs.
const TIMESTAMPS: number[] = (() => {
  const out: number[] = []
  let v = BASE_TIME
  for (let i = 0; i < FRAMES; i++) {
    v += DT_MS
    out.push(v)
  }
  return out
})()

// ---------------------------------------------------------------------------
// (iii) manual requestAnimationFrame queue
// ---------------------------------------------------------------------------
type RafEntry = { id: number; cb: FrameRequestCallback }
let rafQueue: RafEntry[] = []
let nextRafId = 1
window.requestAnimationFrame = function stubRaf(cb: FrameRequestCallback) {
  const id = nextRafId++
  rafQueue.push({ id, cb })
  return id
} as any
window.cancelAnimationFrame = function stubCancelRaf(id: number) {
  rafQueue = rafQueue.filter((e) => e.id !== id)
} as any

function stepFrameTo(ts: number) {
  vnow = ts
  const batch = rafQueue
  rafQueue = []
  for (const entry of batch) entry.cb(vnow)
}
function resetClock() {
  vnow = BASE_TIME
  rafQueue = []
}

// ---------------------------------------------------------------------------
// (iv) controllable prefers-reduced-motion
// ---------------------------------------------------------------------------
let reduceMotion = false
window.matchMedia = function stubMatchMedia(query: string) {
  return {
    matches: query.includes('prefers-reduced-motion') ? reduceMotion : false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() {
      return false
    },
  }
} as any

// ---------------------------------------------------------------------------
// (v) devicePixelRatio pinned to 1
// ---------------------------------------------------------------------------
Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 1 })

// ---------------------------------------------------------------------------
// IntersectionObserver — fires synchronously as "in view" so the rAF loop starts
// ---------------------------------------------------------------------------
class IntersectionObserverStub {
  root: Element | null = null
  rootMargin = '0px'
  thresholds: number[] = [0]
  private cb: (entries: any[], observer: any) => void
  constructor(cb: (entries: any[], observer: any) => void) {
    this.cb = cb
  }
  observe(target: Element) {
    this.cb([{ isIntersecting: true, intersectionRatio: 1, target }], this)
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
;(window as any).IntersectionObserver = IntersectionObserverStub

// document must never look hidden (would stop the loop)
try {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
} catch {}

// ---------------------------------------------------------------------------
// Hashing — 64-bit-ish FNV-1a pair over the dataURL string
// ---------------------------------------------------------------------------
function hashString(str: string): string {
  let h1 = 0x811c9dc5 >>> 0
  let h2 = 0x9e3779b9 >>> 0
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0
    h2 = (h2 ^ (h2 >>> 13)) >>> 0
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')
}

// ---------------------------------------------------------------------------
// Mount / step / capture
// ---------------------------------------------------------------------------
type Capture = { hashes: string[]; lengths: number[] }

async function tick(times = 1) {
  for (let i = 0; i < times; i++) await new Promise((r) => setTimeout(r, 0))
}

async function mountAndCapture(
  React: any,
  createRoot: any,
  Component: any,
  props: Record<string, unknown>,
  reduced: boolean,
  label: string,
): Promise<Capture> {
  reduceMotion = reduced
  resetSeed()
  resetClock()

  const stage = document.getElementById('stage')!
  const host = document.createElement('div')
  host.style.cssText = `position:relative;width:${W}px;height:${H}px;`
  stage.appendChild(host)

  console.log(`[gate] mount ${label} dawn=${String(props.dawn)} reduced=${reduced}`)
  const root = createRoot(host)
  root.render(React.createElement(Component, props))

  // Wait for the mount effect to have run resize() (canvas backing store sized).
  let canvas: HTMLCanvasElement | null = null
  for (let i = 0; i < 400; i++) {
    await tick(1)
    canvas = host.querySelector('canvas')
    if (canvas && canvas.width === W && canvas.height === H) break
  }
  if (!canvas) throw new Error('no canvas mounted')
  if (canvas.width !== W || canvas.height !== H) {
    throw new Error(`canvas never sized: ${canvas.width}x${canvas.height} (client ${canvas.clientWidth}x${canvas.clientHeight})`)
  }

  const hashes: string[] = []
  const lengths: number[] = []
  const capture = () => {
    const url = canvas!.toDataURL('image/png')
    hashes.push(hashString(url))
    lengths.push(url.length)
  }

  if (reduced) {
    if (rafQueue.length) throw new Error('reduced-motion run scheduled a rAF callback')
    capture()
  } else {
    if (!rafQueue.length) throw new Error('animated run never scheduled a rAF callback')
    for (let i = 0; i < FRAMES; i++) {
      stepFrameTo(TIMESTAMPS[i])
      capture()
    }
  }

  root.unmount()
  host.remove()
  rafQueue = []
  console.log(`[gate] done ${label}: ${hashes.length} frame(s), first=${hashes[0]}`)
  return { hashes, lengths }
}

function distinctFrames(c: Capture): number {
  return new Set(c.hashes).size
}

function firstMismatch(a: Capture, b: Capture): number | null {
  const n = Math.min(a.hashes.length, b.hashes.length)
  for (let i = 0; i < n; i++) {
    if (a.hashes[i] !== b.hashes[i] || a.lengths[i] !== b.lengths[i]) return i
  }
  if (a.hashes.length !== b.hashes.length) return n
  return null
}

// ---------------------------------------------------------------------------
type CaseResult = {
  dawn: number
  mode: string
  framesCompared: number
  firstMismatchFrame: number | null
  note?: string
}

async function main() {
  const resultEl = document.getElementById('result')!
  const cases: CaseResult[] = []
  let pass = true

  try {
    const React = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { LingwaveWavesOld } = await import('./LingwaveWavesOld')
    const { LingwaveWaves } = await import('@/components/branding/LingwaveWaves')

    console.log('[gate] modules loaded')

    // --- control: the harness proving itself deterministic (OLD vs OLD) -----
    {
      const a = await mountAndCapture(React, createRoot, LingwaveWavesOld, { dawn: 0.35 }, false, 'ctrl-A')
      const b = await mountAndCapture(React, createRoot, LingwaveWavesOld, { dawn: 0.35 }, false, 'ctrl-B')
      const mm = firstMismatch(a, b)
      if (mm !== null) pass = false
      cases.push({
        dawn: 0.35,
        mode: 'control-old-vs-old',
        framesCompared: a.hashes.length,
        firstMismatchFrame: mm,
        note: 'harness self-determinism check; a mismatch here invalidates every other case',
      })
    }

    // --- animated cases ------------------------------------------------------
    const animatedByDawn: Record<string, Capture> = {}
    for (const dawn of [0, 0.35, 1]) {
      const oldCap = await mountAndCapture(React, createRoot, LingwaveWavesOld, { dawn }, false, `old-d${dawn}`)
      const clockRef = { current: 0 }
      const newCap = await mountAndCapture(React, createRoot, LingwaveWaves, { dawn, clockRef }, false, `new-d${dawn}`)
      animatedByDawn[`old-${dawn}`] = oldCap
      animatedByDawn[`new-${dawn}`] = newCap
      const mm = firstMismatch(oldCap, newCap)
      // The sea must actually be moving, or 60 "identical" frames prove nothing.
      const moving = distinctFrames(oldCap) === 60 && distinctFrames(newCap) === 60
      if (mm !== null || !moving) pass = false
      cases.push({
        dawn,
        mode: 'animated-60f',
        framesCompared: Math.min(oldCap.hashes.length, newCap.hashes.length),
        firstMismatchFrame: mm,
        note: `clockRef.current=${clockRef.current}; distinctFrames old=${distinctFrames(oldCap)} new=${distinctFrames(newCap)} ${moving ? 'OK' : 'FAIL(frames not advancing)'}`,
      })
    }

    // --- negative control: the comparator must have teeth --------------------
    // Different dawn values MUST hash differently at frame 0. If this "passes"
    // (i.e. finds no mismatch), the whole gate is comparing nothing.
    {
      const mm = firstMismatch(animatedByDawn['old-0'], animatedByDawn['new-1'])
      const detects = mm === 0
      if (!detects) pass = false
      cases.push({
        dawn: -1,
        mode: 'sensitivity-old-d0-vs-new-d1',
        framesCompared: 60,
        firstMismatchFrame: mm,
        note: `negative control: expected firstMismatchFrame===0, got ${mm} — ${detects ? 'OK' : 'FAIL(comparator is blind)'}`,
      })
    }

    // --- reduced motion ------------------------------------------------------
    {
      const dawn = 0.35
      const oldCap = await mountAndCapture(React, createRoot, LingwaveWavesOld, { dawn }, true, 'old-rm')
      const clockRef = { current: 0 }
      const newCap = await mountAndCapture(React, createRoot, LingwaveWaves, { dawn, clockRef }, true, 'new-rm')
      const mm = firstMismatch(oldCap, newCap)
      const clockOk = clockRef.current === 30
      if (mm !== null || !clockOk) pass = false
      cases.push({
        dawn,
        mode: 'reduced-motion-still',
        framesCompared: Math.min(oldCap.hashes.length, newCap.hashes.length),
        firstMismatchFrame: mm,
        note: `clockRef.current=${clockRef.current} expected=30 ${clockOk ? 'OK' : 'FAIL'}`,
      })
    }
  } catch (err: any) {
    pass = false
    cases.push({
      dawn: -1,
      mode: 'harness-error',
      framesCompared: 0,
      firstMismatchFrame: 0,
      note: String(err && err.stack ? err.stack : err),
    })
  }

  const blob = JSON.stringify({ pass, cases }, null, 2)
  resultEl.textContent = blob
  document.title = pass ? 'wave-pixel-gate: PASS' : 'wave-pixel-gate: FAIL'
  ;(window as any).__WAVE_PIXEL_GATE__ = blob
}

main()
