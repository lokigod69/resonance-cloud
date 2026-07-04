import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from 'react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useViewport, type CanvasViewport } from '@/hooks/useViewport'
import { useTranslation } from '@/hooks/useTranslation'
import { usePronunciation } from '@/hooks/usePronunciation'
import { syncCanvasCardTop, useCanvasSafeAreaCacheReset } from '@/lib/canvasPositioning'
import { resolveCardLearningMetadata, type WordLike } from '@/lib/wordDisplayMetadata'
import { getCardFullUrl } from '@/lib/imageUrls'
import { waveHeight, WAVE_AMP_SUM, worldXFromPercent } from '@/lib/waveField'
import { LingwaveWaves, type WaveRipple } from '@/components/branding/LingwaveWaves'
import type { CanvasModeProps } from './types'
import { CanvasToolbar } from './CanvasToolbar'
import { CANVAS_TOOLBAR_THEMES } from './canvasToolbarThemes'
import { ImagelessCard } from '@/components/study/ImagelessCard'

// Wave — the Lingwave brand mode. Words float as glass buoys over the same
// luminous ocean that greets users on the login page (LingwaveWaves): plum
// troughs, rose mid-water, vermillion swells, gold crests. Mastering a word
// turns it into a gold crest; missing one washes it back into the sea.

type LaneColumn = 'left' | 'right'
type CanvasPosition = { x: number; y: number; laneColumn?: LaneColumn }

type WaveWordState = {
  id: string
  x: number
  y: number
  layout: CanvasViewport
  laneColumn: LaneColumn | null
  drift: number
  hue: number
  // z + depth drive how each buoy rides the swell: z de-phases neighbours so
  // they don't bob in unison; depth is a 0..1 nearness factor for parallax.
  z: number
  depth: number
  mastered: boolean
  washing: boolean
  imageFailed: boolean
  word: CanvasModeProps['words'][number]
}

type SprayParticle = {
  id: number
  x: number
  y: number
  size: number
  speed: number
  brightness: number
  phase: number
  golden: boolean
  foam: boolean
}

// A passing swell raised by tapping the open sea; it lifts words as its front
// rolls through them, then dissipates.
type Swell = {
  x: number
  y: number
  spawnTime: number
}

type AudioKind = 'hover' | 'reveal' | 'pass' | 'fail'

const AMBIENT_SPRAY_COUNT = 38
const AMBIENT_FOAM_COUNT = 9
const TOOLBAR_CARD_CLEARANCE_PX = 64
const WAVE_LANE_CARD_EDGE_CLAMP_PX = 90
// Buoy ride: peak vertical travel (px) of a word sitting on a crest vs a trough.
const WAVE_RIDE_PX = 16
// Tap-swell propagation.
const SWELL_DURATION_MS = 1900
const SWELL_SPEED_PCT_PER_SECOND = 46
const SWELL_THICKNESS_PCT = 6
const SWELL_MAX_LIFT_PX = 14
// Cosmos palette accents, one per buoy (plum → rose → vermillion → gold → foam)
const HUE_COLORS = [
  'rgba(196, 168, 240, 0.92)',
  'rgba(235, 142, 188, 0.92)',
  'rgba(250, 140, 92, 0.92)',
  'rgba(247, 200, 67, 0.92)',
  'rgba(255, 234, 214, 0.92)',
]

function getBounds() {
  return {
    minX: 12,
    maxX: 88,
    minY: 10,
    maxY: 85,
    spacingX: 18,
    spacingY: 12,
    minDistX: 16,
    minDistY: 10,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function deterministicOffset(index: number, salt: number, range: number) {
  const value = Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453
  return (value - Math.floor(value) - 0.5) * 2 * range
}

function generateLanePositions(count: number): CanvasPosition[] {
  const leftCount = Math.ceil(count / 2)
  const rightCount = Math.floor(count / 2)

  return Array.from({ length: count }, (_, index) => {
    const laneColumn: LaneColumn = index % 2 === 0 ? 'left' : 'right'
    const laneIndex = Math.floor(index / 2)
    const laneCount = laneColumn === 'left' ? leftCount : rightCount
    const centerX = laneColumn === 'left' ? 25 : 75
    const baseY = laneCount <= 1 ? 50 : 10 + (laneIndex / (laneCount - 1)) * 80

    return {
      x: centerX + deterministicOffset(index, 1, 10),
      y: clamp(baseY + deterministicOffset(index, 2, 2), 10, 90),
      laneColumn,
    }
  })
}

function getDriftBounds(layout: CanvasViewport, laneColumn: LaneColumn | null, x: number) {
  if (layout === 'lane') {
    const column = laneColumn ?? (x < 50 ? 'left' : 'right')
    return {
      minX: column === 'left' ? 15 : 65,
      maxX: column === 'left' ? 35 : 85,
      minY: 4,
      maxY: 92,
    }
  }

  return { minX: 3, maxX: 97, minY: 4, maxY: 92 }
}

function generateNonOverlappingPositions(
  count: number,
  existingPositions: Array<{ x: number; y: number }> = [],
): CanvasPosition[] {
  const positions: CanvasPosition[] = []
  const { minX, maxX, minY, maxY, spacingX, spacingY } = getBounds()
  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const allPositions = [...existingPositions]

  function hasCollision(x: number, y: number) {
    return allPositions.some((p) => {
      const hDist = Math.abs(p.x - x)
      const vDist = Math.abs(p.y - y)
      return hDist < spacingX && vDist < spacingY
    })
  }

  function inBounds(x: number, y: number) {
    return x >= minX && x <= maxX && y >= minY && y <= maxY
  }

  for (let i = 0; i < count; i++) {
    let placed = false
    let x = centerX
    let y = centerY

    if (i === 0) {
      x = centerX + (Math.random() - 0.5) * 5
      y = centerY + (Math.random() - 0.5) * 5
      if (!hasCollision(x, y) && inBounds(x, y)) placed = true
    }

    if (!placed) {
      for (let layer = 1; layer <= 15 && !placed; layer++) {
        const layerOffsetX = layer * spacingX * 0.7
        const layerOffsetY = layer * spacingY * 0.7
        const candidates: Array<{ x: number; y: number }> = []

        for (let dx = -layer; dx <= layer; dx++) {
          candidates.push({ x: centerX + dx * spacingX * 0.7, y: centerY - layerOffsetY })
          candidates.push({ x: centerX + dx * spacingX * 0.7, y: centerY + layerOffsetY })
        }

        for (let dy = -layer + 1; dy < layer; dy++) {
          candidates.push({ x: centerX - layerOffsetX, y: centerY + dy * spacingY * 0.7 })
          candidates.push({ x: centerX + layerOffsetX, y: centerY + dy * spacingY * 0.7 })
        }

        for (let j = candidates.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1))
          ;[candidates[j], candidates[k]] = [candidates[k], candidates[j]]
        }

        for (const candidate of candidates) {
          const testX = candidate.x + (Math.random() - 0.5) * spacingX * 0.25
          const testY = candidate.y + (Math.random() - 0.5) * spacingY * 0.25
          if (inBounds(testX, testY) && !hasCollision(testX, testY)) {
            x = testX
            y = testY
            placed = true
            break
          }
        }
      }
    }

    if (!placed) {
      for (let attempt = 0; attempt < 100; attempt++) {
        x = minX + Math.random() * (maxX - minX)
        y = minY + Math.random() * (maxY - minY)
        if (!hasCollision(x, y)) break
      }
    }

    positions.push({ x, y })
    allPositions.push({ x, y })
  }

  return positions
}

function createSpray(golden = false, x?: number, y?: number): SprayParticle {
  return {
    id: Math.random(),
    x: x !== undefined ? x : Math.random() * 100,
    y: y !== undefined ? y : Math.random() * 100 + 20,
    size: 1 + Math.random() * 2.5,
    speed: 0.008 + Math.random() * 0.03,
    brightness: golden ? 0.9 : 0.12 + Math.random() * 0.3,
    phase: Math.random() * Math.PI * 2,
    golden,
    foam: false,
  }
}

// Foam sits low and wide, drifting sideways near the waterline for body.
function createFoam(): SprayParticle {
  return {
    id: Math.random(),
    x: Math.random() * 100,
    y: 62 + Math.random() * 46,
    size: 3 + Math.random() * 5,
    speed: 0.004 + Math.random() * 0.012,
    brightness: 0.08 + Math.random() * 0.16,
    phase: Math.random() * Math.PI * 2,
    golden: Math.random() < 0.25,
    foam: true,
  }
}

function createWordStates(
  words: CanvasModeProps['words'],
  imageFailures: Set<string>,
  layout: CanvasViewport,
  masteredWordIds: ReadonlySet<string>,
  existingStates: WaveWordState[] = [],
) {
  const existingById = new Map(existingStates.map((state) => [state.id, state]))
  const positions = layout === 'lane'
    ? generateLanePositions(words.length)
    : generateNonOverlappingPositions(words.length)

  return words.map((word, index) => {
    const existing = existingById.get(word.id)
    const preservePosition = existing?.layout === layout
    return {
      id: word.id,
      x: preservePosition ? existing.x : positions[index]?.x ?? 50,
      y: preservePosition ? existing.y : positions[index]?.y ?? 50,
      layout,
      laneColumn: layout === 'lane' ? positions[index]?.laneColumn ?? null : null,
      drift: existing?.drift ?? Math.random() * Math.PI * 2,
      hue: existing?.hue ?? index % HUE_COLORS.length,
      z: existing?.z ?? 4 + index * 3.1,
      depth: existing?.depth ?? Math.random(),
      mastered: existing?.mastered || masteredWordIds.has(word.id),
      washing: false,
      imageFailed: imageFailures.has(word.id),
      word,
    }
  })
}

function getImageUrl(word: CanvasModeProps['words'][number] | null | undefined) {
  const record = word as (Record<string, unknown> | null | undefined)
  const imageUrls = record?.image_urls
  if (Array.isArray(imageUrls)) {
    const first = imageUrls.find((url): url is string => typeof url === 'string' && url.trim().length > 0)
    if (first) return getCardFullUrl(first)
  }

  for (const key of ['image_url', 'thumbnail_url', 'thumbnail_url_b']) {
    const value = record?.[key]
    if (typeof value === 'string' && value.trim().length > 0) return getCardFullUrl(value)
  }

  return null
}

function getStringField(word: CanvasModeProps['words'][number], keys: string[]) {
  const record = word as Record<string, unknown>
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return null
}

function useToolbarClearancePx(toolbarRef: RefObject<HTMLDivElement | null>) {
  const [toolbarClearancePx, setToolbarClearancePx] = useState(0)

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined

    const updateToolbarClearance = () => {
      const toolbarBottom = toolbarRef.current?.getBoundingClientRect().bottom ?? 0
      setToolbarClearancePx(Math.ceil(toolbarBottom + TOOLBAR_CARD_CLEARANCE_PX))
    }

    updateToolbarClearance()

    const toolbar = toolbarRef.current
    const resizeObserver = toolbar && 'ResizeObserver' in window
      ? new ResizeObserver(updateToolbarClearance)
      : null
    if (toolbar) resizeObserver?.observe(toolbar)

    window.addEventListener('resize', updateToolbarClearance)
    window.addEventListener('orientationchange', updateToolbarClearance)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateToolbarClearance)
      window.removeEventListener('orientationchange', updateToolbarClearance)
    }
  }, [toolbarRef])

  return toolbarClearancePx
}

function useLaneTopOffsetPx(
  worldRef: RefObject<HTMLDivElement | null>,
  words: WaveWordState[],
  layout: CanvasViewport,
  toolbarClearancePx: number,
) {
  const [laneTopOffsetPx, setLaneTopOffsetPx] = useState(0)

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || layout !== 'lane') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- preserve existing lane reset behavior.
      setLaneTopOffsetPx(0)
      return undefined
    }

    const updateLaneTopOffset = () => {
      const worldHeight = worldRef.current?.getBoundingClientRect().height ?? window.innerHeight
      const firstLaneY = Math.min(...words.filter((word) => word.layout === 'lane').map((word) => word.y))
      if (!Number.isFinite(firstLaneY) || worldHeight <= 0) {
        setLaneTopOffsetPx(0)
        return
      }

      setLaneTopOffsetPx(Math.max(0, Math.ceil(toolbarClearancePx - (firstLaneY / 100) * worldHeight)))
    }

    updateLaneTopOffset()

    const world = worldRef.current
    const resizeObserver = world && 'ResizeObserver' in window
      ? new ResizeObserver(updateLaneTopOffset)
      : null
    if (world) resizeObserver?.observe(world)

    window.addEventListener('resize', updateLaneTopOffset)
    window.addEventListener('orientationchange', updateLaneTopOffset)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateLaneTopOffset)
      window.removeEventListener('orientationchange', updateLaneTopOffset)
    }
  }, [layout, toolbarClearancePx, words, worldRef])

  return laneTopOffsetPx
}

function getToolbarAwareTop(
  y: number,
  toolbarClearancePx: number,
  laneTopOffsetPx: number,
  layout: CanvasViewport,
) {
  if (layout === 'lane') {
    return laneTopOffsetPx > 0 ? `calc(${y}% + ${laneTopOffsetPx}px)` : `${y}%`
  }

  return toolbarClearancePx > 0 ? `max(${y}%, ${toolbarClearancePx}px)` : `${y}%`
}

// Keep cards on-screen in the mobile lane layout, mirroring Zen's clamp.
function getCardAwareLeft(x: number, layout: CanvasViewport) {
  return layout === 'lane'
    ? `clamp(${WAVE_LANE_CARD_EDGE_CLAMP_PX}px, ${x}%, calc(100% - ${WAVE_LANE_CARD_EDGE_CLAMP_PX}px))`
    : `${x}%`
}

// Phrase rule: single short headwords stay tight and nowrap; phrases or long
// tokens wrap on word boundaries in a wider glass card.
function phraseClassName(text: string) {
  const isPhrase = /\s/.test(text) || text.length > 18
  return isPhrase
    ? 'whitespace-normal max-w-[min(280px,65vw)] text-[clamp(0.78rem,3vw,1.05rem)] break-words'
    : 'whitespace-nowrap max-w-[min(200px,55vw)]'
}

export default function WaveCanvas({
  words,
  masteredWordIds,
  showImages,
  deckType,
  sessionComplete,
  direction,
  autoReveal,
  languagePair,
  canToggleDirection,
  canToggleImages,
  currentPage,
  totalPages,
  activeMode,
  onPass,
  onFail,
  onPrevPage,
  onNextPage,
  onSwitchMode,
  onToggleImages,
  onToggleDirection,
  onToggleAutoReveal,
  onExit,
  onContinue,
}: CanvasModeProps) {
  const { playWord } = usePronunciation()
  const viewport = useViewport()
  const [renderWords, setRenderWords] = useState<WaveWordState[]>(() => createWordStates(words, new Set(), viewport, masteredWordIds))
  const [particles, setParticles] = useState<SprayParticle[]>(() => [
    ...Array.from({ length: AMBIENT_SPRAY_COUNT }, () => createSpray()),
    ...Array.from({ length: AMBIENT_FOAM_COUNT }, () => createFoam()),
  ])
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [imageFailures, setImageFailures] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const worldRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const wordStatesRef = useRef<WaveWordState[]>(renderWords)
  const wordElementsRef = useRef(new Map<string, HTMLDivElement>())
  const particlesRef = useRef<SprayParticle[]>(particles)
  const particleElementsRef = useRef(new Map<number, HTMLDivElement>())
  const swellsRef = useRef<Swell[]>([])
  // Tap ripples fed to the brand ocean so the visible wave lines roll outward.
  const ripplesRef = useRef<WaveRipple[]>([])
  const frameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const reducedMotionRef = useRef(false)
  const timersRef = useRef<number[]>([])

  const selectedState = renderWords.find((w) => w.id === revealedId) ?? null
  const selectedLearning = selectedState
    ? resolveCardLearningMetadata(selectedState.word as WordLike)
    : null
  const selectedImage = selectedState && !selectedState.imageFailed ? getImageUrl(selectedState.word) : null
  const toolbarClearancePx = useToolbarClearancePx(toolbarRef)
  const laneTopOffsetPx = useLaneTopOffsetPx(worldRef, renderWords, viewport, toolbarClearancePx)
  useCanvasSafeAreaCacheReset()
  const masteredCount = renderWords.filter((w) => w.mastered).length
  const progress = words.length > 0 ? masteredCount / words.length : 0

  // The dawn brightens as the session progresses.
  const dawnStyle = useMemo<CSSProperties>(() => ({
    top: '30%',
    height: '22%',
    opacity: 0.08 + Math.sqrt(progress) * 0.4,
    background: 'radial-gradient(ellipse at 50% 60%, rgba(247,200,67,0.5), rgba(242,79,19,0.18) 45%, transparent 72%)',
    filter: 'blur(26px)',
  }), [progress])

  const playSound = useCallback((kind: AudioKind) => {
    if (reducedMotionRef.current || typeof window === 'undefined') return
    try {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) return
      const ctx = audioContextRef.current ?? new AudioCtor()
      audioContextRef.current = ctx

      const gain = ctx.createGain()
      gain.connect(ctx.destination)

      if (kind === 'hover') {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(660, ctx.currentTime)
        gain.gain.setValueAtTime(0.025, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07)
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 0.07)
      } else if (kind === 'reveal') {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(392, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(523, ctx.currentTime + 0.14)
        gain.gain.setValueAtTime(0.04, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14)
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 0.14)
      } else if (kind === 'pass') {
        // Rising swell: D5 → A5, soft sine pair like water catching light.
        gain.gain.setValueAtTime(0.06, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        for (const [index, freq] of [587, 880].entries()) {
          const osc = ctx.createOscillator()
          osc.type = 'sine'
          const startAt = ctx.currentTime + index * 0.09
          osc.frequency.setValueAtTime(freq, startAt)
          osc.connect(gain)
          osc.start(startAt)
          osc.stop(startAt + 0.22)
        }
      } else {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(330, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(165, ctx.currentTime + 0.3)
        gain.gain.setValueAtTime(0.06, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
      }
    } catch {
      // Audio is decorative; blocked autoplay or missing APIs should not affect study.
    }
  }, [])

  const setWordElement = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      wordElementsRef.current.set(id, node)
    } else {
      wordElementsRef.current.delete(id)
    }
  }, [])

  const setParticleElement = useCallback((id: number, node: HTMLDivElement | null) => {
    if (node) {
      particleElementsRef.current.set(id, node)
    } else {
      particleElementsRef.current.delete(id)
    }
  }, [])

  const addSprayBurst = useCallback((x: number, y: number, count: number, goldenRatio = 0.5) => {
    const next = [...particlesRef.current]
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const spread = 2 + Math.random() * 7
      next.push(createSpray(
        Math.random() < goldenRatio,
        x + Math.cos(angle) * spread,
        y + Math.sin(angle) * spread,
      ))
    }
    particlesRef.current = next
    setParticles([...next])
  }, [])

  useEffect(() => {
    wordStatesRef.current = createWordStates(words, imageFailures, viewport, masteredWordIds, wordStatesRef.current)

    const timer = window.setTimeout(() => {
      setRevealedId((current) => words.some((word) => word.id === current) ? current : null)
      setRenderWords([...wordStatesRef.current])
    }, 0)

    return () => window.clearTimeout(timer)
  }, [imageFailures, masteredWordIds, viewport, words])

  useEffect(() => {
    reducedMotionRef.current = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  useEffect(() => {
    if (sessionComplete) return undefined

    function loop(now: number) {
      const reducedMotion = reducedMotionRef.current
      const t = now / 1000
      const { minDistX, minDistY } = getBounds()

      // Retire swells whose front has rolled off the field.
      swellsRef.current = swellsRef.current.filter((sw) => now - sw.spawnTime <= SWELL_DURATION_MS)

      // Vertical travel (px) + buoy tilt (deg) for a word riding the swell,
      // coherent with the brand ocean and lifted by any passing tap-swell.
      const computeRide = (word: WaveWordState) => {
        const wx = worldXFromPercent(word.x)
        const norm = waveHeight(wx, word.z, t) / WAVE_AMP_SUM
        const amp = WAVE_RIDE_PX * (0.55 + word.depth * 0.9)
        let translateY = -norm * amp
        const slope = waveHeight(wx + 0.4, word.z, t) - waveHeight(wx - 0.4, word.z, t)
        const tilt = clamp(slope * 6, -7, 7)

        for (const sw of swellsRef.current) {
          const elapsed = now - sw.spawnTime
          const radius = (elapsed / 1000) * SWELL_SPEED_PCT_PER_SECOND
          const dx = word.x - sw.x
          const dy = word.y - sw.y
          const frontDelta = Math.abs(Math.sqrt(dx * dx + dy * dy) - radius)
          if (frontDelta < SWELL_THICKNESS_PCT) {
            const falloff = 1 - frontDelta / SWELL_THICKNESS_PCT
            const fade = Math.max(0, 1 - elapsed / SWELL_DURATION_MS)
            translateY -= SWELL_MAX_LIFT_PX * falloff * falloff * fade
          }
        }

        return { translateY, tilt }
      }

      for (const word of wordStatesRef.current) {
        const el = wordElementsRef.current.get(word.id)
        if (!el) continue

        // Washing-away words hand their transform to the CSS .wave-washing class.
        if (word.washing) {
          el.style.left = getCardAwareLeft(word.x, word.layout)
          syncCanvasCardTop(el, getToolbarAwareTop(word.y, toolbarClearancePx, laneTopOffsetPx, word.layout))
          continue
        }

        // Only live (unmastered) words drift and resolve collisions; mastered
        // crests hold their place but still ride the swell.
        if (!word.mastered) {
          let newX = word.x + Math.sin(word.drift) * 0.02
          let newY = word.y + Math.cos(word.drift * 0.8) * 0.015

          // Continuous separation: runs every frame so words never drift into
          // overlap (settled gold crests act as fixed obstacles), but force is
          // applied only where cards actually overlap, so there's no idle jitter.
          let repelX = 0
          let repelY = 0

          for (const other of wordStatesRef.current) {
            if (other.id === word.id || other.washing) continue
            const dx = newX - other.x
            const dy = newY - other.y
            const distX = Math.abs(dx)
            const distY = Math.abs(dy)

            if (distX < minDistX && distY < minDistY) {
              const overlapX = minDistX - distX
              const overlapY = minDistY - distY
              if (distX > 0.1) repelX += (dx > 0 ? 1 : -1) * overlapX * 0.03
              if (distY > 0.1) repelY += (dy > 0 ? 1 : -1) * overlapY * 0.03
            }
          }

          newX += repelX
          newY += repelY

          const bounds = getDriftBounds(word.layout, word.laneColumn, word.x)
          word.x = clamp(newX, bounds.minX, bounds.maxX)
          word.y = clamp(newY, bounds.minY, bounds.maxY)
          word.drift += 0.005
        }

        el.style.left = getCardAwareLeft(word.x, word.layout)
        if (reducedMotion) {
          el.style.transform = 'translate(-50%, -50%)'
        } else {
          const { translateY, tilt } = computeRide(word)
          el.style.transform = `translate(-50%, -50%) translateY(${translateY.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)`
        }
        syncCanvasCardTop(el, getToolbarAwareTop(word.y, toolbarClearancePx, laneTopOffsetPx, word.layout))
      }

      if (!reducedMotion) {
        for (const particle of particlesRef.current) {
          if (particle.foam) {
            // Foam loiters near the waterline, sliding sideways more than it rises.
            particle.y -= particle.speed
            particle.x += Math.sin(particle.phase) * 0.05
            particle.phase += 0.01
            if (particle.y < 54) {
              particle.y = 108
              particle.x = Math.random() * 100
            }
          } else {
            particle.y -= particle.speed
            particle.x += Math.sin(particle.phase) * 0.018
            particle.phase += 0.018
            if (particle.y < -8) {
              particle.y = 108
              particle.x = Math.random() * 100
            }
          }

          const el = particleElementsRef.current.get(particle.id)
          if (el) {
            el.style.left = `${particle.x}%`
            el.style.top = `${particle.y}%`
          }
        }
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [laneTopOffsetPx, sessionComplete, toolbarClearancePx])

  useEffect(() => () => {
    for (const timer of timersRef.current) window.clearTimeout(timer)
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(() => {})
    }
  }, [])

  const handleBackgroundClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || (event.target as HTMLElement).closest('button, [data-toolbar], .wave-word-inner')) return
    if (reducedMotionRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    // Word swell uses world-% coords; the loop lifts words as the front passes.
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top + containerRef.current.scrollTop) / containerRef.current.scrollHeight) * 100
    swellsRef.current.push({ x, y, spawnTime: performance.now() })
    // Background ripple uses viewport fractions (the ocean canvas is fixed to the
    // viewport): the tap rolls a visible wave outward through the contour lines.
    ripplesRef.current.push({
      x: event.clientX / window.innerWidth,
      y: event.clientY / window.innerHeight,
      start: performance.now(),
    })
  }

  const handleSelectWord = (state: WaveWordState, event: ReactMouseEvent) => {
    event.stopPropagation()
    if (state.washing || sessionComplete) return
    playSound('reveal')
    setRevealedId(state.id)
  }

  const handlePass = () => {
    const target = revealedId ? wordStatesRef.current.find((word) => word.id === revealedId) : null
    if (!target || target.mastered) {
      setRevealedId(null)
      return
    }

    playSound('pass')
    target.mastered = true
    addSprayBurst(target.x, target.y, 14, 0.7)
    onPass(target.id)
    setRevealedId(null)
    setRenderWords([...wordStatesRef.current])
  }

  const handleFail = () => {
    const target = revealedId ? wordStatesRef.current.find((word) => word.id === revealedId) : null
    if (!target) return
    playSound('fail')
    target.washing = true
    onFail(target.id)
    setRevealedId(null)
    setRenderWords([...wordStatesRef.current])

    const timer = window.setTimeout(() => {
      const others = wordStatesRef.current
        .filter((word) => word.id !== target.id)
        .map((word) => ({ x: word.x, y: word.y }))
      const [position] = viewport === 'lane'
        ? generateLanePositions(wordStatesRef.current.findIndex((word) => word.id === target.id) + 1).slice(-1)
        : generateNonOverlappingPositions(1, others)
      target.x = position?.x ?? target.x
      target.y = position?.y ?? target.y
      target.layout = viewport
      target.laneColumn = viewport === 'lane' ? position?.laneColumn ?? target.laneColumn : null
      target.drift = Math.random() * Math.PI * 2
      target.washing = false
      setRenderWords([...wordStatesRef.current])
    }, 1100)
    timersRef.current.push(timer)
  }

  const handleImageError = (id: string) => {
    const state = wordStatesRef.current.find((word) => word.id === id)
    if (state) state.imageFailed = true
    setImageFailures((prev) => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setRenderWords([...wordStatesRef.current])
  }

  if (sessionComplete) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a060e]">
        <WaveStyle />
        <LingwaveWaves />
        <div className="relative text-center">
          <h1 className="wave-gold-gradient mb-4 text-5xl font-light tracking-widest md:text-6xl">
            Tide Turned
          </h1>
          <button
            onClick={onContinue}
            className="mt-8 rounded-lg border border-[#f24f13]/50 px-8 py-3 tracking-widest text-[#f7c843] transition-colors hover:border-[#f7c843] hover:bg-[#f24f13]/10"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onClick={handleBackgroundClick}
      className="fixed inset-0 z-40 h-[100dvh] max-h-[100dvh] select-none overflow-y-auto bg-[#0a060e] text-[#f4e8dc] md:overflow-hidden"
    >
      <WaveStyle />
      {/* Brand ocean stays pinned to the viewport while words scroll above it. */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <LingwaveWaves ripplesRef={ripplesRef} />
        <div className="absolute inset-x-0" style={dawnStyle} />
      </div>

      <div ref={worldRef} className="relative min-h-[150dvh] overflow-hidden md:h-full md:min-h-full">
        <div className="pointer-events-none absolute inset-0 z-0">
          {particles.map((particle) => {
            // Spray glints gold/vermillion; foam is a soft pale-rose haze on the water.
            const color = particle.foam
              ? (particle.golden ? 'rgba(247,200,67,0.5)' : 'rgba(235,142,188,0.4)')
              : (particle.golden ? '#f7c843' : '#f24f13')
            return (
              <div
                key={particle.id}
                ref={(node) => setParticleElement(particle.id, node)}
                className="absolute rounded-full"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  opacity: particle.brightness,
                  backgroundColor: color,
                  boxShadow: particle.foam
                    ? `0 0 ${particle.size * 3}px ${color}`
                    : `0 0 ${particle.size * 4}px ${color}`,
                  filter: particle.foam ? 'blur(1.5px)' : undefined,
                }}
              />
            )
          })}
        </div>

        <CanvasToolbar
          toolbarRef={toolbarRef}
          theme={CANVAS_TOOLBAR_THEMES.wave}
          activeMode={activeMode}
          showImages={showImages}
          direction={direction}
          autoReveal={autoReveal}
          languagePair={languagePair}
          canToggleDirection={canToggleDirection}
          canToggleImages={canToggleImages}
          currentPage={currentPage}
          totalPages={totalPages}
          masteredCount={masteredCount}
          totalWords={words.length}
          onSwitchMode={onSwitchMode}
          onToggleImages={onToggleImages}
          onToggleDirection={onToggleDirection}
          onToggleAutoReveal={onToggleAutoReveal}
          onPrevPage={onPrevPage}
          onNextPage={onNextPage}
          onExit={onExit}
        />

        <div className="absolute inset-0 z-10">
          {renderWords.map((state) => {
            const imageUrl = !state.imageFailed ? getImageUrl(state.word) : null
            const isImagelessDeck = deckType === 'card_text'
            const showImageCard = !isImagelessDeck && showImages && !!imageUrl
            const text = state.word.text ?? state.word.word
            const innerClassName = [
              'wave-word-inner transition-[opacity,transform,filter] duration-1000',
              state.washing ? 'wave-washing' : 'opacity-100',
              state.mastered ? 'wave-card-mastered' : 'wave-card-unmastered',
            ].join(' ')

            return (
              <div
                key={state.id}
                ref={(node) => {
                  setWordElement(state.id, node)
                  if (node) syncCanvasCardTop(node, getToolbarAwareTop(state.y, toolbarClearancePx, laneTopOffsetPx, state.layout))
                }}
                className="absolute"
                style={{
                  left: getCardAwareLeft(state.x, state.layout),
                  top: getToolbarAwareTop(state.y, toolbarClearancePx, laneTopOffsetPx, state.layout),
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <button
                  type="button"
                  onClick={(event) => handleSelectWord(state, event)}
                  onMouseEnter={() => playSound('hover')}
                  className={innerClassName}
                  style={!state.mastered ? { color: HUE_COLORS[state.hue] } : undefined}
                >
                  {isImagelessDeck ? (
                    <ImagelessCard
                      word={state.word.word}
                      translation={state.word.translation ?? ''}
                      ipa={state.word.ipa ?? null}
                      revealed={false}
                      className="w-36 rounded-lg md:w-44"
                    />
                  ) : showImageCard ? (
                    <img
                      src={imageUrl}
                      alt={text}
                      onError={() => handleImageError(state.id)}
                      className="h-20 w-20 rounded-lg border border-[#f24f13]/30 object-cover opacity-85 md:h-24 md:w-24"
                    />
                  ) : (
                    <span className={`wave-card-text ${phraseClassName(text)}`}>
                      {text}
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {selectedState && (
          <RevealModal
            state={selectedState}
            learning={selectedLearning}
            imageUrl={selectedImage}
            direction={direction}
            onClose={() => setRevealedId(null)}
            onImageError={() => handleImageError(selectedState.id)}
            onSpeak={() => { void playWord(selectedState.word) }}
            autoReveal={autoReveal}
            onPass={handlePass}
            onFail={handleFail}
          />
        )}
      </div>
    </div>
  )
}

interface RevealModalProps {
  state: WaveWordState
  learning: ReturnType<typeof resolveCardLearningMetadata> | null
  imageUrl: string | null
  direction: CanvasModeProps['direction']
  onClose: () => void
  onImageError: () => void
  onSpeak: () => void
  autoReveal: CanvasModeProps['autoReveal']
  onPass: () => void
  onFail: () => void
}

function RevealModal({
  state,
  learning,
  imageUrl,
  direction,
  onClose,
  onImageError,
  onSpeak,
  autoReveal,
  onPass,
  onFail,
}: RevealModalProps) {
  const { t } = useTranslation()
  const word = state.word
  const promptFace = word.promptFace ?? word.word
  const answerFace = word.answerFace ?? word.translation ?? word.word
  const phonetic = getStringField(word, ['phonetic', 'ipa'])
  const usage = learning?.usageExample
  const hasRichData = !!learning?.mnemonic || !!learning?.etymology || !!usage
  const [answerRevealed, setAnswerRevealed] = useState(autoReveal === 'on')
  const [imageLoaded, setImageLoaded] = useState(false)
  const canGrade = autoReveal === 'on' || answerRevealed
  useBodyScrollLock(true)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- preserve existing reveal reset behavior.
    setAnswerRevealed(autoReveal === 'on')
  }, [autoReveal, word.id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset skeleton when modal opens with a new image.
    setImageLoaded(false)
  }, [imageUrl])

  const revealAnswer = () => {
    if (!canGrade) setAnswerRevealed(true)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        paddingTop: 'max(1rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
      }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-[#0a060e]/95 backdrop-blur-[2px]" />
      <div
        data-phase-g-modal
        className="wave-modal-enter relative mx-auto flex w-full max-h-[85vh] flex-col overflow-x-hidden"
        style={{ maxWidth: 'min(calc(100vw - 32px), 600px)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-2 top-2 z-20 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[#f24f13]/30 bg-[#0a060e]/85 text-xl text-[#d6a060]/70 hover:text-[#f7c843]"
          onClick={onClose}
          aria-label={t('study.canvas.close')}
        >
          ✕
        </button>

        <div
          className="flex max-h-[85vh] min-h-0 flex-col overflow-hidden rounded-xl border border-[#f24f13]/35 bg-gradient-to-b from-[#1c0f22] to-[#0a060e] text-center shadow-[0_0_100px_rgba(242,79,19,0.16)]"
          style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}
        >
          <div
            data-phase-g-modal-header
            className="sticky top-0 z-10 flex-shrink-0 bg-[#1c0f22] px-6 pb-3 pt-12 md:px-10"
          >
            <button
              type="button"
              onClick={onSpeak}
              className="mb-3 border-none bg-transparent text-4xl font-light tracking-wider text-[#ffe9d6] drop-shadow-[0_0_16px_rgba(242,79,19,0.45)] transition-transform hover:scale-105 md:text-5xl lg:text-6xl"
            >
              {promptFace}
            </button>

            {direction === 'target-visible' && phonetic && (
              <p className="mb-3 text-center font-sans text-sm tracking-widest text-[#eb8ebc]/60">
                {phonetic}
              </p>
            )}
          </div>

          <div
            data-phase-g-modal-main
            data-body-scroll-lock-scrollable="true"
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-3 md:px-10"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div
              className={!canGrade ? 'wave-answer-guard wave-answer-blurred mb-6' : 'wave-answer-guard mb-6'}
              onClick={revealAnswer}
            >
              {direction === 'base-visible' && phonetic && (
                <p className="wave-answer-content mb-3 text-center font-sans text-sm tracking-widest text-[#eb8ebc]/60">
                  {phonetic}
                </p>
              )}
              <p className="wave-answer-content text-xl font-light leading-relaxed text-[#f4e8dc] md:text-2xl">
                {answerFace}
              </p>
            </div>

            {imageUrl && (
              <div className="mb-6 flex justify-center">
                <div className="relative aspect-video w-[140px] overflow-hidden rounded-lg border border-[#f24f13]/30 md:w-[160px]">
                  <div
                    className={`absolute inset-0 animate-pulse bg-[#1c0f22] transition-opacity duration-300 ${imageLoaded ? 'opacity-0' : 'opacity-100'}`}
                    aria-hidden="true"
                  />
                  <img
                    src={imageUrl}
                    alt={word.word}
                    onLoad={() => setImageLoaded(true)}
                    onError={onImageError}
                    className={`relative h-full w-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-80 hover:opacity-100' : 'opacity-0'}`}
                  />
                </div>
              </div>
            )}

            {hasRichData && (
              <div
                className={!canGrade ? 'wave-answer-guard wave-answer-blurred mt-6 text-left' : 'wave-answer-guard mt-6 text-left'}
                onClick={revealAnswer}
              >
                <div className="wave-answer-content">
                  {learning?.mnemonic && (
                    <div className="border-t border-[#f24f13]/25 pt-4">
                      <p className="mb-2 text-[10px] uppercase tracking-widest text-[#f7c843]/80">
                        {t('study.canvas.mnemonic')}
                      </p>
                      <p className="text-base leading-relaxed text-[#f4e8dc]/90">
                        {learning.mnemonic}
                      </p>
                    </div>
                  )}

                  {learning?.etymology && (
                    <div className="mt-4 border-t border-[#f24f13]/25 pt-4">
                      <p className="mb-2 text-[10px] uppercase tracking-widest text-[#c4a8f0]/70">
                        {t('study.canvas.etymology')}
                      </p>
                      <p className="text-base italic leading-relaxed text-[#f4e8dc]/70">
                        {learning.etymology}
                      </p>
                    </div>
                  )}

                  {usage && (
                    <div className="mt-4 border-t border-[#f24f13]/25 pt-4">
                      <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#eb8ebc]/70">
                        {t('study.canvas.usage')}
                      </p>
                      {usage.target && (
                        <p className="text-lg italic leading-relaxed text-[#ffd9a8]/85">
                          {usage.target}
                        </p>
                      )}
                      {usage.base && (
                        <p className="mt-1 text-base italic leading-relaxed text-[#f4e8dc]/65">
                          {usage.base}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div
            data-phase-g-modal-footer
            className="sticky bottom-0 z-10 flex-shrink-0 border-t border-[#f24f13]/25 bg-[#0a060e] px-6 pb-4 pt-5 md:px-10"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onFail}
                disabled={!canGrade}
                className={`h-12 rounded-lg border border-[#f24f13]/40 bg-[#f24f13]/10 text-2xl text-[#fa8c5c] drop-shadow-[0_0_8px_rgba(242,79,19,0.5)] hover:border-[#f24f13] hover:bg-[#f24f13]/20 ${!canGrade ? 'pointer-events-none opacity-35' : ''}`}
                aria-label={t('study.reviewLater')}
              >
                ✕
              </button>
              <button
                onClick={onPass}
                disabled={!canGrade}
                className={`h-12 rounded-lg border border-[#f7c843]/40 bg-[#f7c843]/10 text-2xl text-[#f7c843] drop-shadow-[0_0_8px_rgba(247,200,67,0.5)] hover:border-[#f7c843] hover:bg-[#f7c843]/20 ${!canGrade ? 'pointer-events-none opacity-35' : ''}`}
                aria-label={t('study.rememberedAction')}
              >
                ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function WaveStyle() {
  return (
    <style>
      {`
        .wave-word-inner {
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
        }

        .wave-card-text {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0.8rem;
          background: rgba(28, 15, 34, 0.6);
          border: 1px solid rgba(242, 79, 19, 0.28);
          border-radius: 10px;
          backdrop-filter: blur(4px);
          -webkit-backdrop-filter: blur(4px);
          box-shadow: 0 4px 18px rgba(5, 2, 8, 0.45);
          font-size: clamp(0.85rem, 3.5vw, 1.2rem);
          font-weight: 350;
          line-height: 1.3;
          min-height: 44px;
          min-width: 60px;
          text-align: center;
          letter-spacing: 0.02em;
        }

        .wave-card-unmastered {
          text-shadow: 0 0 10px rgba(242, 79, 19, 0.3);
          transition: color 800ms, text-shadow 800ms;
        }

        .wave-card-unmastered:hover .wave-card-text {
          color: #ffe9d6;
          background: rgba(28, 15, 34, 0.8);
          border-color: rgba(247, 200, 67, 0.55);
          box-shadow: 0 4px 22px rgba(5, 2, 8, 0.5), 0 0 18px rgba(242, 79, 19, 0.25);
        }

        .wave-card-unmastered:hover {
          transform: scale(1.05);
        }

        .wave-card-mastered {
          color: #f7c843;
          animation: wave-crest-pulse 3s ease-in-out infinite;
        }

        .wave-card-mastered .wave-card-text {
          color: #f7c843;
          background: rgba(247, 200, 67, 0.12);
          border-color: rgba(247, 200, 67, 0.55);
          text-shadow: 0 0 14px rgba(247, 200, 67, 0.8);
        }

        .wave-washing {
          opacity: 0;
          transform: translateY(26px) scale(0.9);
          filter: blur(6px);
        }

        .wave-gold-gradient {
          background: linear-gradient(100deg, #eb8ebc 0%, #f24f13 35%, #f7c843 60%, #f24f13 85%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: wave-gradient-drift 5s ease-in-out infinite;
        }

        .wave-modal-enter {
          animation: wave-modal-rise 200ms ease-out;
        }

        .wave-answer-guard {
          position: relative;
          transition: transform 200ms ease, box-shadow 200ms ease;
        }

        .wave-answer-blurred {
          cursor: pointer;
        }

        @media (hover: hover) {
          .wave-answer-blurred:hover {
            transform: scale(1.02);
            box-shadow: 0 0 18px rgba(247, 200, 67, 0.22);
          }
        }

        .wave-answer-blurred .wave-answer-content {
          filter: blur(8px);
          user-select: none;
          pointer-events: none;
        }

        .wave-answer-blurred::after {
          content: "";
          position: absolute;
          inset: -0.35rem;
          border-radius: 10px;
          border: 1px solid rgba(242, 79, 19, 0.25);
          background: rgba(184, 68, 122, 0.12);
          pointer-events: none;
        }

        @keyframes wave-crest-pulse {
          0%, 100% {
            filter: brightness(1) drop-shadow(0 0 10px rgba(247, 200, 67, 0.4));
          }
          50% {
            filter: brightness(1.18) drop-shadow(0 0 22px rgba(247, 200, 67, 0.65));
          }
        }

        @keyframes wave-gradient-drift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes wave-modal-rise {
          from {
            opacity: 0;
            transform: translateY(14px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 768px) {
          .wave-card-text {
            max-width: min(180px, 50vw);
            font-size: 0.95rem;
            padding: 0.5rem 0.8rem;
          }
        }

        @media (max-width: 400px) {
          .wave-card-text {
            max-width: min(160px, 45vw);
            font-size: 0.9rem;
            padding: 0.4rem 0.7rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wave-card-mastered,
          .wave-gold-gradient,
          .wave-modal-enter {
            animation: none !important;
          }
        }
      `}
    </style>
  )
}
