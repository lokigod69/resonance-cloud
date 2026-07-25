import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { screenYForWave, worldXForScreenX } from '@/lib/waveField'
import type { LemmaState } from '@/hooks/useWordStates'

// TidelineBuoys — labeled word buoys riding the real swell (§6.3).
//
// Slots are (xViewport%, z) pairs; each frame the screen Y comes from the
// shared projection (`screenYForWave`) with the canvas's own clock, so the
// dots genuinely sit on the drawn surface and ride it — no wall-clock drift,
// ever. Ripple displacement is deliberately ignored: ripples perturb the
// drawn contours, not the analytic field (§6.2).
//
// Labels are two lines everywhere — word over gloss, the canonical form. The
// word is never hidden; a gloss that cannot fit its per-script ch budget
// moves into the practice sheet and the buoy shows word-only. When measured
// labels would collide, the VISIBLE COUNT reduces (5→4→3) — never a
// truncation below the budget. DOM order = slot order, so tab order matches
// space.

export type BuoySlot = { x: number; z: number }

// Mobile: five slots spanning z near→far, echoing the lock's stagger.
const MOBILE_SLOTS: BuoySlot[] = [
  { x: 28, z: 30 },
  { x: 71, z: 24 },
  { x: 48, z: 15 },
  { x: 24, z: 10 },
  { x: 70, z: 8.2 },
]

// Desktop: twelve slots in three depth rows (§7).
const DESKTOP_SLOTS: BuoySlot[] = [
  { x: 14, z: 32 },
  { x: 38, z: 30 },
  { x: 62, z: 33 },
  { x: 86, z: 31 },
  { x: 8, z: 18 },
  { x: 33, z: 16 },
  { x: 58, z: 19 },
  { x: 84, z: 17 },
  { x: 14, z: 10 },
  { x: 40, z: 9 },
  { x: 68, z: 10.5 },
  { x: 90, z: 9.4 },
]

const MIN_VISIBLE = 3
const COLLISION_PAD_PX = 10
const LABEL_BAND_PX = 30
// Two labels "share water" when their projected Ys sit within one label band
// for a SUSTAINED fraction of the swell cycle. Brief depth-crossings (the
// lock's own composition is full of them) don't cost a buoy; buoys that ride
// together do.
const SUSTAINED_PROXIMITY = 0.4
const LABEL_SHADOW = '0 2px 14px rgba(5,2,8,0.6)'

// Fraction of the swell cycle two slots spend within one label band of each
// other — sampled from the REAL field, because a worst-case amplitude sum
// wrongly outlaws the lock's stacked columns (same x, very different z),
// whose correlated motion keeps them 50px+ apart at all times. Cached per
// (pair, viewport); recomputed only on resize.
const proximityCache = new Map<string, number>()
function proximityFraction(a: BuoySlot, b: BuoySlot, w: number, h: number): number {
  const key = `${a.x},${a.z}|${b.x},${b.z}|${w}x${h}`
  const hit = proximityCache.get(key)
  if (hit !== undefined) return hit
  const worldXA = worldXForScreenX((a.x / 100) * w, a.z, w, h)
  const worldXB = worldXForScreenX((b.x / 100) * w, b.z, w, h)
  let near = 0
  let total = 0
  for (let t = 0; t < 240; t += 0.5) {
    total++
    const gap = Math.abs(screenYForWave(worldXA, a.z, t, w, h) - screenYForWave(worldXB, b.z, t, w, h))
    if (gap < LABEL_BAND_PX) near++
  }
  const fraction = near / total
  proximityCache.set(key, fraction)
  return fraction
}

/** Per-script gloss width budget in ch (§6.3): CJK 10, Latin 18, else 16. */
function scriptBudgetCh(text: string): number {
  if (/[\u1100-\u11FF\u3040-\u30FF\u3130-\u318F\u4E00-\u9FFF\uAC00-\uD7AF]/.test(text)) return 10
  if (/^[\u0020-\u024F\u1E00-\u1EFF\s\p{P}]*$/u.test(text)) return 18
  return 16
}

function bandFor(z: number): 'far' | 'mid' | 'near' {
  if (z >= 22) return 'far'
  if (z >= 12) return 'mid'
  return 'near'
}

const WORD_CLASS: Record<'far' | 'mid' | 'near', string> = {
  far: 'text-[13px]',
  mid: 'text-[15px]',
  near: 'text-[17px]',
}
const GLOSS_CLASS: Record<'far' | 'mid' | 'near', string> = {
  far: 'text-[11px]',
  mid: 'text-[12px]',
  near: 'text-[13px]',
}

type TidelineBuoysProps = {
  mode: 'due' | 'rest'
  lemmas: LemmaState[]
  /** BCP-47 primary subtag of the target language for `lang` on the word. */
  langCode: string | undefined
  clockRef: { current: number }
  cooldowns: ReadonlyMap<string, number>
  maxCount: number
  onTap: (lemma: LemmaState, cooldown: boolean) => void
  reduceMotion: boolean
  buoyAria: (lemma: LemmaState) => string
  /** Out-param: each buoy's current screen position as viewport fractions —
   * the parent aims tap ripples with it. Mutated in place, never re-created. */
  positionsRef?: { current: Map<string, { x: number; y: number }> }
  /** Reports the collision-resolved visible count so the backlog marker can
   * name the words ACTUALLY off the water, not the slot budget. */
  onVisibleCountChange?: (count: number) => void
}

// Per-band measurements: every candidate label is measured at ALL THREE font
// bands up front, so measurement never depends on slot assignment — a
// measure→count→assignment→measure feedback loop is impossible by shape.
type BandMeasure = { width: number; glossFits: boolean }
type Measured = Record<'far' | 'mid' | 'near', BandMeasure>
const BANDS: Array<'far' | 'mid' | 'near'> = ['far', 'mid', 'near']

export default function TidelineBuoys({
  mode,
  lemmas,
  langCode,
  clockRef,
  cooldowns,
  maxCount,
  onTap,
  reduceMotion,
  buoyAria,
  positionsRef,
  onVisibleCountChange,
}: TidelineBuoysProps) {
  const slots = maxCount > 5 ? DESKTOP_SLOTS : MOBILE_SLOTS
  const candidates = useMemo(() => lemmas.slice(0, Math.min(maxCount, slots.length)), [lemmas, maxCount, slots.length])

  const measureRef = useRef<HTMLDivElement | null>(null)
  const [measured, setMeasured] = useState<Map<string, Measured>>(new Map())
  // Sticky slot assignment (reconcile pattern): a buoy keeps its slot for its
  // whole life; a freed slot goes to the next word washing in.
  const [slotByKey, setSlotByKey] = useState<Map<string, number>>(new Map())
  // documentElement.client* — the canvas's own box (a fixed inset-0 layer)
  // excludes any classic scrollbar, and the projection must read the same box
  // the sea is painted in or desktop buoys sit ~15px off the surface.
  const [viewport, setViewport] = useState(() => ({
    w: document.documentElement.clientWidth,
    h: document.documentElement.clientHeight,
  }))
  const viewportW = viewport.w

  useEffect(() => {
    const onResize = () => setViewport({
      w: document.documentElement.clientWidth,
      h: document.documentElement.clientHeight,
    })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Measure candidate labels in a hidden twin: the word at full width, the
  // gloss clamped to its script budget — overflow there sends the gloss to
  // the sheet, never to an ellipsis. Each label is measured at all three font
  // bands, so the collision pass can read the width for whatever slot a buoy
  // ends up in without ever re-measuring.
  const measureKey = candidates.map((lemma) => lemma.lemmaKey).join('|')
  useLayoutEffect(() => {
    const host = measureRef.current
    if (!host) return
    const next = new Map<string, Measured>()
    for (const child of Array.from(host.children) as HTMLElement[]) {
      const key = child.dataset.key
      const band = child.dataset.band as 'far' | 'mid' | 'near' | undefined
      if (!key || !band) continue
      const word = child.querySelector<HTMLElement>('[data-part="word"]')
      const gloss = child.querySelector<HTMLElement>('[data-part="gloss"]')
      const glossFits = gloss ? gloss.scrollWidth <= gloss.clientWidth + 1 : true
      const width = Math.max(word?.offsetWidth ?? 0, glossFits ? gloss?.offsetWidth ?? 0 : 0)
      const entry = next.get(key) ?? ({} as Measured)
      entry[band] = { width, glossFits }
      next.set(key, entry)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM measurement must land in state; keyed by membership so it cannot loop
    setMeasured(next)
  }, [measureKey, viewportW])

  // Collision resolution: reduce the visible count until no two labels that
  // can meet on screen overlap horizontally (5→4→3, floor 3). "Can meet" is
  // judged from the projection itself — static calm-water Y plus each slot's
  // real bob amplitude — because the swell routinely crosses buoys from
  // different depth rows past each other.
  const visibleCount = useMemo(() => {
    let count = candidates.length
    const positionsFor = (n: number) => {
      const used = new Set<number>()
      const items: Array<{ key: string; slot: BuoySlot; width: number }> = []
      for (const lemma of candidates.slice(0, n)) {
        let index = slotByKey.get(lemma.lemmaKey)
        if (index === undefined || index >= slots.length || used.has(index)) {
          index = 0
          while (used.has(index) && index < slots.length - 1) index++
        }
        used.add(index)
        const slot = slots[index]
        items.push({
          key: lemma.lemmaKey,
          slot,
          width: measured.get(lemma.lemmaKey)?.[bandFor(slot.z)]?.width ?? 0,
        })
      }
      return items
    }
    const h = viewport.h
    const collides = (items: ReturnType<typeof positionsFor>) => {
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i]
          const b = items[j]
          if (proximityFraction(a.slot, b.slot, viewportW, h) < SUSTAINED_PROXIMITY) continue
          const ax = (a.slot.x / 100) * viewportW
          const bx = (b.slot.x / 100) * viewportW
          if (Math.abs(ax - bx) < a.width / 2 + b.width / 2 + COLLISION_PAD_PX) return true
        }
      }
      return false
    }
    while (count > MIN_VISIBLE && collides(positionsFor(count))) count--
    return count
  }, [candidates, measured, slotByKey, slots, viewport.h, viewportW])

  const visible = useMemo(() => candidates.slice(0, visibleCount), [candidates, visibleCount])

  useEffect(() => {
    onVisibleCountChange?.(visible.length)
  }, [onVisibleCountChange, visible.length])

  useEffect(() => {
     
    setSlotByKey((prev) => {
      const liveKeys = new Set(visible.map((lemma) => lemma.lemmaKey))
      let changed = false
      const next = new Map(prev)
      for (const key of Array.from(next.keys())) {
        if (!liveKeys.has(key)) {
          next.delete(key)
          changed = true
        }
      }
      if (positionsRef) {
        for (const key of Array.from(positionsRef.current.keys())) {
          if (!liveKeys.has(key)) positionsRef.current.delete(key)
        }
      }
      const used = new Set(next.values())
      for (const lemma of visible) {
        const cooling = cooldowns.has(lemma.lemmaKey)
        const current = next.get(lemma.lemmaKey)
        if (current !== undefined && !cooling) continue
        if (cooling) {
          // Drift to the farthest free slot (highest z); keep the current slot
          // when nothing farther is free.
          let farthest = -1
          for (let i = 0; i < slots.length; i++) {
            if (used.has(i) && i !== current) continue
            if (farthest === -1 || slots[i].z > slots[farthest].z) farthest = i
          }
          if (farthest !== -1 && farthest !== current && (current === undefined || slots[farthest].z > slots[current].z)) {
            if (current !== undefined) used.delete(current)
            next.set(lemma.lemmaKey, farthest)
            used.add(farthest)
            changed = true
          } else if (current === undefined) {
            let free = 0
            while (used.has(free) && free < slots.length - 1) free++
            next.set(lemma.lemmaKey, free)
            used.add(free)
            changed = true
          }
          continue
        }
        let free = 0
        while (used.has(free) && free < slots.length - 1) free++
        next.set(lemma.lemmaKey, free)
        used.add(free)
        changed = true
      }
      return changed ? next : prev
    })
  }, [visible, cooldowns, positionsRef, slots])

  // One rAF drives every buoy transform from the shared clock; paused while
  // hidden or scrolled away; zero per-frame allocation. Under reduced motion
  // a single pass plants the buoys at their projected positions using the
  // seeded clock value (§12 — never t=0).
  const elByKey = useRef<Map<string, HTMLElement>>(new Map())
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let raf = 0
    let inView = true

    const place = () => {
      const w = document.documentElement.clientWidth
      const h = document.documentElement.clientHeight
      const t = clockRef.current
      elByKey.current.forEach((el, key) => {
        const index = slotByKey.get(key)
        if (index === undefined) return
        const slot = slots[index]
        const worldX = worldXForScreenX((slot.x / 100) * w, slot.z, w, h)
        const y = screenYForWave(worldX, slot.z, t, w, h)
        el.style.transform = `translate3d(-50%, ${y.toFixed(2)}px, 0)`
        if (positionsRef) {
          const pos = positionsRef.current.get(key)
          if (pos) {
            pos.x = slot.x / 100
            pos.y = y / h
          } else {
            positionsRef.current.set(key, { x: slot.x / 100, y: y / h })
          }
        }
      })
    }

    const frame = () => {
      place()
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (raf || reduceMotion || !inView || document.hidden) return
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

    place()
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      observer?.disconnect()
    }
    // `viewport` re-runs the one-shot place() under reduced motion, where no
    // frame loop exists to pick a resize or rotation up (§12).
  }, [clockRef, positionsRef, reduceMotion, slotByKey, slots, viewport])

  const rest = mode === 'rest'

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* Hidden measuring twin — same fonts, gloss clamped to its budget,
          every candidate at every band. */}
      <div ref={measureRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0">
        {candidates.flatMap((lemma) =>
          BANDS.map((band) => (
            <div
              key={`${lemma.lemmaKey}:${band}`}
              data-key={lemma.lemmaKey}
              data-band={band}
              className="absolute left-0 top-0 flex flex-col items-start"
            >
              <span data-part="word" className={`font-display font-bold ${WORD_CLASS[band]} whitespace-nowrap`}>{lemma.displayWord}</span>
              {!rest && lemma.translation ? (
                <span
                  data-part="gloss"
                  className={`${GLOSS_CLASS[band]} block overflow-hidden whitespace-nowrap`}
                  style={{ maxWidth: `${scriptBudgetCh(lemma.translation)}ch` }}
                >
                  {lemma.translation}
                </span>
              ) : null}
            </div>
          )),
        )}
      </div>

      <AnimatePresence>
        {visible
          .map((lemma) => ({ lemma, slotIndex: slotByKey.get(lemma.lemmaKey) }))
          .filter((entry): entry is { lemma: LemmaState; slotIndex: number } => entry.slotIndex !== undefined)
          .sort((a, b) => a.slotIndex - b.slotIndex)
          .map(({ lemma, slotIndex }) => {
            const slot = slots[slotIndex]
            const band = bandFor(slot.z)
            const cooling = cooldowns.has(lemma.lemmaKey)
            const glossFits = measured.get(lemma.lemmaKey)?.[band]?.glossFits ?? true
            const showGloss = !rest && glossFits && Boolean(lemma.translation)
            return (
              <div
                key={lemma.lemmaKey}
                ref={(el) => {
                  if (el) elByKey.current.set(lemma.lemmaKey, el)
                  else elByKey.current.delete(lemma.lemmaKey)
                }}
                className="absolute top-0 will-change-transform"
                style={{ left: `${slot.x}%` }}
              >
                <motion.button
                  type="button"
                  onClick={() => onTap(lemma, cooling)}
                  aria-label={buoyAria(lemma)}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: rest ? 0.55 : cooling ? 0.4 : 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.35 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 22 }}
                  whileTap={{ scale: 0.94 }}
                  className="pointer-events-auto flex min-h-11 min-w-11 -translate-y-full cursor-pointer flex-col items-center gap-0.5 px-2 pb-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
                >
                  <span className="flex flex-col items-center leading-tight" style={{ textShadow: LABEL_SHADOW }}>
                    <span
                      className={`font-display font-bold text-[var(--text-primary)] ${WORD_CLASS[band]} whitespace-nowrap`}
                      lang={langCode}
                      dir="auto"
                    >
                      {lemma.displayWord}
                    </span>
                    {showGloss ? (
                      <span className={`${GLOSS_CLASS[band]} whitespace-nowrap text-[var(--text-secondary)]`}>
                        {lemma.translation}
                      </span>
                    ) : null}
                  </span>
                  {!rest ? (
                    <span
                      aria-hidden="true"
                      className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[var(--accent-2)]"
                      style={{ boxShadow: '0 0 12px 3px color-mix(in srgb, var(--accent-2) 55%, transparent)' }}
                    />
                  ) : null}
                </motion.button>
              </div>
            )
          })}
      </AnimatePresence>
    </div>
  )
}
