import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { WAVE_FOCAL_FRACTION, screenYForWave, worldXForScreenX } from '@/lib/waveField'
import {
  nextStreamLane,
  poolIndexAt,
  seededUnit,
  streamDepthAt,
  streamOpacityAt,
  streamScaleAt,
  streamScreenXAt,
  streamSpawnIntervalMs,
  streamStillProgressSlots,
  type StreamLayout,
  type StreamWord,
} from '@/lib/wordStream'

// WordStream — new words drifting in on the swell
// (docs/Product/FABLE_WORD_STREAM_PLAN.md §2).
//
// Each word is born near the horizon in a world-X lane and travels toward the
// viewer; its screen position is the canvas projection of (lane, z) with the
// shared wave clock for Y, so it genuinely rides the surface at its current
// depth. One rAF drives every transform from refs — no React state per frame,
// only the transform strings are allocated. Spawns and removals are the only
// state changes.
//
// Time is STREAM time: it accrues only while the water is running (visible,
// in view, not paused behind the sheet). Pausing freezes the DRIFT, never the
// ride: the loop keeps sampling the wave clock so a word behind an open sheet
// still sits on the moving surface (never fight the wave), and a background
// tab never dumps thirty seconds of drift on return.
//
// The parent owns the pool and the cursor; this component walks the pool as a
// ring, skipping words the parent reports unavailable (kept / passed / newly
// held), and reports its ring index after every spawn so the cursor persists.

export type StreamRetireReason = 'kept' | 'passed'

type AliveWord = {
  key: string
  word: StreamWord
  lane: number
  /** Stream-time birth in ms (negative for the initial fill). */
  bornAt: number
  /** Reduced motion only: the fixed depth slot this word keeps for life. */
  stillSlot: number
}

type WordStreamProps = {
  pool: StreamWord[]
  /** Ring index to resume from (today's persisted cursor). */
  startCursor: number
  isAvailable: (word: StreamWord) => boolean
  layout: StreamLayout
  langCode: string | undefined
  clockRef: { current: number }
  positionsRef?: { current: Map<string, { x: number; y: number }> }
  /** Freezes the drift (stream time) — the words keep riding the swell. */
  paused: boolean
  reduceMotion: boolean
  /** Words to take off the water with an exit — kept pops, passed sinks. The
   * parent prunes entries once `onAliveChange` no longer lists them. */
  retired: ReadonlyMap<string, StreamRetireReason>
  onTap: (word: StreamWord) => void
  /** The ring index after each spawn — the parent persists it for resume. */
  onCursorChange?: (index: number) => void
  /** Words on the water in spawn order — nearest first. */
  onAliveChange?: (words: StreamWord[]) => void
  wordAria: (word: StreamWord) => string
  seed: number
}

const LABEL_SHADOW = '0 2px 14px rgba(5,2,8,0.6)'
const MAX_FRAME_DELTA_MS = 100
const STILL_ROTATE_MS = 12_000

export default function WordStream({
  pool,
  startCursor,
  isAvailable,
  layout,
  langCode,
  clockRef,
  positionsRef,
  paused,
  reduceMotion,
  retired,
  onTap,
  onCursorChange,
  onAliveChange,
  wordAria,
  seed,
}: WordStreamProps) {
  const [alive, setAlive] = useState<AliveWord[]>([])
  const aliveRef = useRef<AliveWord[]>([])
  const indexRef = useRef(startCursor)
  const laneRef = useRef(-1)
  const spawnCountRef = useRef(0)
  const streamTimeRef = useRef(0)
  const lastSpawnAtRef = useRef(-Infinity)
  const elByKey = useRef<Map<string, HTMLElement>>(new Map())
  // Label width at scale 1, measured once per word — the horizontal clamp
  // reads it every frame without touching layout.
  const widthByKey = useRef<Map<string, number>>(new Map())
  const containerRef = useRef<HTMLDivElement | null>(null)

  const isAvailableRef = useRef(isAvailable)
  isAvailableRef.current = isAvailable
  const onCursorChangeRef = useRef(onCursorChange)
  onCursorChangeRef.current = onCursorChange
  const poolRef = useRef(pool)
  poolRef.current = pool
  const pausedRef = useRef(paused)
  pausedRef.current = paused
  const keyboardFocusRef = useRef(false)

  const lifetime = layout.lifetimeMs
  const spawnInterval = useMemo(() => streamSpawnIntervalMs(layout), [layout])
  // Reduced motion holds fewer words: four fixed depths on a phone sit ~40 px
  // apart vertically, less than a label is tall, and three lanes are only
  // ~55 px apart at mid depth — three words keep every label clear.
  const budget = reduceMotion && layout.lanes.length <= 3 ? Math.min(layout.maxAlive, 3) : layout.maxAlive

  const commitAlive = useCallback((next: AliveWord[]) => {
    aliveRef.current = next
    setAlive(next)
  }, [])

  // Next available word in ring order — bounded by one full lap.
  const takeNextWord = useCallback((): StreamWord | null => {
    const current = poolRef.current
    if (current.length === 0) return null
    const onWater = new Set(aliveRef.current.map((entry) => entry.word.lemmaKey))
    let found: StreamWord | null = null
    for (let tries = 0; tries < current.length; tries++) {
      const word = current[poolIndexAt(indexRef.current, current.length)]
      indexRef.current += 1
      if (onWater.has(word.lemmaKey) || !isAvailableRef.current(word)) continue
      found = word
      break
    }
    onCursorChangeRef.current?.(indexRef.current)
    return found
  }, [])

  // Reduced motion: the free depth slot with the LOWEST index (nearest) —
  // sticky per word, like the buoys' slot reconcile.
  const freeStillSlot = useCallback((): number => {
    const used = new Set(aliveRef.current.map((entry) => entry.stillSlot))
    for (let slot = 0; slot < budget; slot++) if (!used.has(slot)) return slot
    return budget - 1
  }, [budget])

  const spawn = useCallback((bornAt: number): boolean => {
    if (aliveRef.current.length >= budget) return false
    const word = takeNextWord()
    if (!word) return false
    const lane = nextStreamLane(laneRef.current, layout.lanes.length, seededUnit(seed, `lane:${spawnCountRef.current}`))
    laneRef.current = lane
    spawnCountRef.current += 1
    lastSpawnAtRef.current = bornAt
    commitAlive([...aliveRef.current, { key: word.conceptId, word, lane, bornAt, stillSlot: freeStillSlot() }])
    return true
  }, [commitAlive, freeStillSlot, layout.lanes.length, budget, seed, takeNextWord])

  // Initial fill: the water is populated on arrival — words already staggered
  // along the run instead of a six-second wait for the first one.
  const filledRef = useRef(false)
  useEffect(() => {
    if (filledRef.current || pool.length === 0) return
    filledRef.current = true
    for (let i = 0; i < budget; i++) {
      // Use the live spawn path so each selection excludes words already
      // placed, including when fewer candidates remain than the slot budget.
      if (!spawn(reduceMotion ? 0 : -(budget - 1 - i) * spawnInterval)) break
    }
    lastSpawnAtRef.current = 0
  }, [budget, pool.length, reduceMotion, spawn, spawnInterval])

  // Retired words leave the water with their exit; the parent already counted
  // them and prunes its map once `onAliveChange` no longer lists them. Under
  // reduced motion there is no frame loop to refill, so the water is topped
  // up here — a keep must never drain the sea.
  useEffect(() => {
    if (retired.size === 0) return
    if (!aliveRef.current.some((entry) => retired.has(entry.key))) return
    commitAlive(aliveRef.current.filter((entry) => !retired.has(entry.key)))
    if (reduceMotion) {
      while (aliveRef.current.length < budget && spawn(0)) { /* refill */ }
    }
  }, [commitAlive, budget, reduceMotion, retired, spawn])

  useEffect(() => {
    if (reduceMotion) return // the collision pass reports only visible words
    onAliveChange?.(alive.map((entry) => entry.word))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onAliveChange, reduceMotion, alive.map((entry) => entry.key).join('|')])

  // ── Placement ────────────────────────────────────────────────────────────
  // The outer element carries translate only; the scale rides on a CSS
  // variable the label reads, so the button's 44 pt hit box never shrinks.
  const placeEntry = useCallback((entry: AliveWord, progress: number, w: number, h: number, t: number) => {
    const el = elByKey.current.get(entry.key)
    if (!el) return null
    el.style.visibility = ''
    el.inert = false
    const z = streamDepthAt(progress)
    const focal = h * WAVE_FOCAL_FRACTION
    const scale = streamScaleAt(progress)
    // Clamp into the viewport: an outer lane at the near edge fans a long
    // compound past the screen edge on a phone. Width is measured once.
    let width = widthByKey.current.get(entry.key)
    if (width === undefined) {
      width = el.offsetWidth
      widthByKey.current.set(entry.key, width)
    }
    const half = (width * scale) / 2 + 8
    const unclampedX = streamScreenXAt(layout, entry.lane, progress, w, focal)
    const sx = half * 2 >= w ? w / 2 : Math.min(w - half, Math.max(half, unclampedX))
    // Sample the sea at the displayed X, including after an edge clamp.
    const worldX = worldXForScreenX(sx, z, w, h)
    const y = screenYForWave(worldX, z, t, w, h)
    el.style.transform = `translate3d(${sx.toFixed(2)}px, ${y.toFixed(2)}px, 0) translate(-50%, -100%)`
    el.style.setProperty('--stream-scale', scale.toFixed(3))
    el.style.opacity = streamOpacityAt(progress).toFixed(3)
    if (positionsRef) {
      const pos = positionsRef.current.get(entry.key)
      if (pos) {
        pos.x = sx / w
        pos.y = y / h
      } else {
        positionsRef.current.set(entry.key, { x: sx / w, y: y / h })
      }
    }
    return { el, sx, y, halfWidth: half, height: 48 * scale }
  }, [layout, positionsRef])

  // Reduced motion: fixed depths (sticky per word), re-placed after every
  // spawn/removal and on resize; no frame loop.
  useEffect(() => {
    if (!reduceMotion) return
    const slots = streamStillProgressSlots(budget)
    // A single snapshot on the swell: fixed depths alone cannot keep labels
    // apart (the wave lifts a near word by up to ~90 px), so overlapping
    // labels hide, nearest first kept — the buoys' count-reduction rule.
    const place = () => {
      const w = document.documentElement.clientWidth
      const h = document.documentElement.clientHeight
      const kept: Array<{ x0: number; x1: number; y0: number; y1: number }> = []
      const visibleWords: StreamWord[] = []
      const ordered = [...aliveRef.current].sort((a, b) => a.stillSlot - b.stillSlot)
      for (const entry of ordered) {
        const geometry = placeEntry(entry, slots[entry.stillSlot] ?? 0.5, w, h, clockRef.current)
        if (!geometry) continue
        const box = { x0: geometry.sx - geometry.halfWidth, x1: geometry.sx + geometry.halfWidth, y0: geometry.y - geometry.height, y1: geometry.y }
        const collides = kept.some((other) => box.x0 < other.x1 && box.x1 > other.x0 && box.y0 < other.y1 && box.y1 > other.y0)
        if (collides) {
          geometry.el.style.opacity = '0'
          geometry.el.style.visibility = 'hidden'
          geometry.el.inert = true
        } else {
          geometry.el.style.visibility = ''
          geometry.el.inert = false
          kept.push(box)
          visibleWords.push(entry.word)
        }
      }
      onAliveChange?.(visibleWords)
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [alive, clockRef, budget, onAliveChange, placeEntry, reduceMotion])

  // Reduced motion: a crossfade rotation every 12 s. Neither `alive` nor
  // `paused` is a dependency — a keep or an open sheet must not restart the
  // rotation clock.
  useEffect(() => {
    if (!reduceMotion) return
    const timer = window.setInterval(() => {
      if (pausedRef.current || keyboardFocusRef.current || document.hidden) return
      const [nearest] = aliveRef.current
      if (!nearest) {
        spawn(0)
        return
      }
      commitAlive(aliveRef.current.filter((entry) => entry.key !== nearest.key))
      spawn(0)
    }, STILL_ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [commitAlive, reduceMotion, spawn])

  // The loop: advance stream time (frozen while paused), retire drifted words,
  // spawn on schedule, place everything on the live swell. Hidden or
  // out-of-view stops the loop itself.
  useEffect(() => {
    if (reduceMotion) return
    let raf = 0
    let inView = true
    let lastTs = 0

    const frame = (ts: number) => {
      const driftPaused = pausedRef.current || keyboardFocusRef.current
      const delta = lastTs && !driftPaused ? Math.min(MAX_FRAME_DELTA_MS, ts - lastTs) : 0
      lastTs = ts
      streamTimeRef.current += delta
      const now = streamTimeRef.current
      const w = document.documentElement.clientWidth
      const h = document.documentElement.clientHeight
      const t = clockRef.current

      let drifted: AliveWord[] | null = null
      for (const entry of aliveRef.current) {
        const progress = (now - entry.bornAt) / lifetime
        if (progress >= 1) {
          (drifted ??= []).push(entry)
          continue
        }
        placeEntry(entry, progress, w, h, t)
      }
      if (drifted) {
        const gone = new Set(drifted.map((entry) => entry.key))
        commitAlive(aliveRef.current.filter((entry) => !gone.has(entry.key)))
      }
      if (!driftPaused && aliveRef.current.length < budget && now - lastSpawnAtRef.current >= spawnInterval) {
        if (!spawn(now)) lastSpawnAtRef.current = now // nothing available — retry after an interval
      }
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (raf || !inView || document.hidden) return
      lastTs = 0
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    }
    const onVisibility = () => (document.hidden ? stop() : start())

    const observer = typeof IntersectionObserver !== 'undefined' && containerRef.current
      ? new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting
          if (inView) start()
          else stop()
        })
      : null
    if (containerRef.current && observer) observer.observe(containerRef.current)

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      observer?.disconnect()
    }
  }, [clockRef, commitAlive, budget, lifetime, placeEntry, reduceMotion, spawn, spawnInterval])

  // Prune positions and cached widths for words no longer on the water.
  useEffect(() => {
    const live = new Set(alive.map((entry) => entry.key))
    for (const key of Array.from(widthByKey.current.keys())) {
      if (!live.has(key)) widthByKey.current.delete(key)
    }
    if (!positionsRef) return
    for (const key of Array.from(positionsRef.current.keys())) {
      if (!live.has(key)) positionsRef.current.delete(key)
    }
  }, [alive, positionsRef])

  // DOM order = depth order, farthest first (the buoys' rule: tab order
  // matches space). Newest spawns are farthest.
  const ordered = useMemo(() => [...alive].sort((a, b) => b.bornAt - a.bornAt), [alive])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      onFocusCapture={(event) => { keyboardFocusRef.current = event.target.matches(':focus-visible') }}
      onBlurCapture={() => { keyboardFocusRef.current = false }}
    >
      <AnimatePresence>
        {ordered.map((entry) => {
          const reason = retired.get(entry.key)
          return (
            <div
              key={entry.key}
              ref={(el) => {
                if (el) elByKey.current.set(entry.key, el)
                else elByKey.current.delete(entry.key)
              }}
              className="absolute left-0 top-0 will-change-transform"
              style={{ opacity: 0 }}
            >
              <motion.button
                type="button"
                onClick={() => onTap(entry.word)}
                aria-label={wordAria(entry.word)}
                // Reduced motion: opacity only — no spring, no pop, no sink.
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
                animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                exit={reduceMotion || !reason
                  ? { opacity: 0 }
                  : reason === 'kept'
                    ? { opacity: 0, scale: 1.35 }
                    : { opacity: 0, y: 12 }}
                transition={reduceMotion ? { duration: 0.25 } : { type: 'spring', stiffness: 260, damping: 22 }}
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                className="pointer-events-auto flex min-h-11 min-w-11 cursor-pointer flex-col items-center justify-end gap-0.5 px-2 pb-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <span
                  className="flex flex-col items-center leading-tight"
                  style={{ textShadow: LABEL_SHADOW, transform: 'scale(var(--stream-scale, 1))', transformOrigin: 'center bottom' }}
                >
                  <span
                    className="whitespace-nowrap font-display text-[15px] font-bold text-[var(--text-primary)] lg:text-[18px]"
                    lang={langCode}
                    dir="auto"
                  >
                    {entry.word.targetTerm}
                  </span>
                  <span className="whitespace-nowrap text-[13px] text-[var(--text-secondary)] lg:text-[14px]" lang={entry.word.helperLanguageCode} dir="auto">
                    {entry.word.helperTerm}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[var(--accent)]"
                  style={{ boxShadow: '0 0 12px 3px color-mix(in srgb, var(--accent) 55%, transparent)', transform: 'scale(var(--stream-scale, 1))' }}
                />
              </motion.button>
            </div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
