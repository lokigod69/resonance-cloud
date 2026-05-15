import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from 'react'
import { DoorOpen } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useViewport, type CanvasViewport } from '@/hooks/useViewport'
import { useTranslation } from '@/hooks/useTranslation'
import { usePronunciation } from '@/hooks/usePronunciation'
import { syncCanvasCardTop, useCanvasSafeAreaCacheReset } from '@/lib/canvasPositioning'
import { resolveCardLearningMetadata, type WordLike } from '@/lib/wordDisplayMetadata'
import { getCardFullUrl } from '@/lib/imageUrls'
import { CANVAS_MODES, type CanvasMode, type CanvasModeProps } from './types'

type LaneColumn = 'left' | 'right'
type CanvasPosition = { x: number; y: number; laneColumn?: LaneColumn }

type EmberWordState = {
  id: string
  x: number
  y: number
  layout: CanvasViewport
  laneColumn: LaneColumn | null
  drift: number
  hue: number
  mastered: boolean
  burning: boolean
  imageFailed: boolean
  word: CanvasModeProps['words'][number]
}

type EmberParticle = {
  id: number
  x: number
  y: number
  size: number
  speed: number
  brightness: number
  phase: number
  golden: boolean
  permanent: boolean
}

type AudioKind = 'hover' | 'reveal' | 'pass' | 'fail'

const INITIAL_EMBER_COUNT = 150
const PHYSICS_FRAMES = 300
const TOOLBAR_CARD_CLEARANCE_PX = 64
const HUE_COLORS = [
  'rgba(255, 160, 100, 0.85)',
  'rgba(255, 190, 120, 0.85)',
  'rgba(255, 130, 100, 0.85)',
  'rgba(255, 200, 140, 0.85)',
  'rgba(255, 145, 85, 0.85)',
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
      if (!hasCollision(x, y) && inBounds(x, y)) {
        placed = true
      }
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
          const jitterX = (Math.random() - 0.5) * spacingX * 0.25
          const jitterY = (Math.random() - 0.5) * spacingY * 0.25
          const testX = candidate.x + jitterX
          const testY = candidate.y + jitterY

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

function createParticle(golden = false, x?: number, y?: number, permanent = false): EmberParticle {
  return {
    id: Math.random(),
    x: x !== undefined ? x : Math.random() * 100,
    y: y !== undefined ? y : Math.random() * 100 + 20,
    size: 1 + Math.random() * 3,
    speed: permanent ? 0.002 : 0.01 + Math.random() * 0.04,
    brightness: golden ? 1 : 0.1 + Math.random() * 0.4,
    phase: Math.random() * Math.PI * 2,
    golden,
    permanent,
  }
}

function createWordStates(
  words: CanvasModeProps['words'],
  imageFailures: Set<string>,
  layout: CanvasViewport,
  masteredWordIds: ReadonlySet<string>,
  existingStates: EmberWordState[] = [],
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
      mastered: existing?.mastered || masteredWordIds.has(word.id),
      burning: false,
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
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
  words: EmberWordState[],
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

// Phrase rule: single short headwords stay tight and nowrap; phrases or long tokens
// wrap on word boundaries in a wider warm card so compound vocabulary stays readable.
function phraseClassName(text: string) {
  const isPhrase = /\s/.test(text) || text.length > 18
  return isPhrase
    ? 'whitespace-normal max-w-[min(280px,65vw)] text-[clamp(0.78rem,3vw,1.05rem)] break-words'
    : 'whitespace-nowrap max-w-[min(200px,55vw)]'
}

export default function EmberCanvas({
  words,
  masteredWordIds,
  showImages,
  sessionComplete,
  direction,
  autoReveal,
  languagePair,
  canToggleDirection,
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
  const [renderWords, setRenderWords] = useState<EmberWordState[]>(() => createWordStates(words, new Set(), viewport, masteredWordIds))
  const [particles, setParticles] = useState<EmberParticle[]>(
    () => Array.from({ length: INITIAL_EMBER_COUNT }, () => createParticle()),
  )
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [imageFailures, setImageFailures] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const worldRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const wordStatesRef = useRef<EmberWordState[]>(renderWords)
  const wordElementsRef = useRef(new Map<string, HTMLDivElement>())
  const particlesRef = useRef<EmberParticle[]>(particles)
  const particleElementsRef = useRef(new Map<number, HTMLDivElement>())
  const frameRef = useRef<number | null>(null)
  const physicsFrameRef = useRef(0)
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
  const passedOnPage = renderWords.filter((w) => w.mastered).length
  const progress = words.length > 0 ? passedOnPage / words.length : 0
  const warmthRoot = Math.sqrt(progress)

  const warmthStyle = useMemo<CSSProperties>(() => ({
    height: `${10 + warmthRoot * 20}%`,
    opacity: 0.2 + warmthRoot * 0.35,
    background: 'linear-gradient(to top, rgba(255,69,0,0.4), transparent)',
    filter: 'blur(30px)',
  }), [warmthRoot])

  const playSound = useCallback((kind: AudioKind) => {
    if (reducedMotionRef.current || typeof window === 'undefined') return
    try {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) return
      const ctx = audioContextRef.current ?? new AudioCtor()
      audioContextRef.current = ctx

      if (kind === 'hover') {
        const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.05)), ctx.sampleRate)
        const channel = buffer.getChannelData(0)
        for (let i = 0; i < channel.length; i++) {
          channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length)
        }
        const source = ctx.createBufferSource()
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.05, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
        source.buffer = buffer
        source.connect(gain)
        gain.connect(ctx.destination)
        source.start()
        source.stop(ctx.currentTime + 0.05)
        return
      }

      const gain = ctx.createGain()
      gain.connect(ctx.destination)

      if (kind === 'reveal') {
        const osc = ctx.createOscillator()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(196, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(164, ctx.currentTime + 0.12)
        gain.gain.setValueAtTime(0.035, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 0.12)
      } else if (kind === 'pass') {
        for (const freq of [440, 660]) {
          const osc = ctx.createOscillator()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime)
          osc.connect(gain)
          osc.start()
          osc.stop(ctx.currentTime + 0.15)
        }
        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
      } else {
        const osc = ctx.createOscillator()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(110, ctx.currentTime)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
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

  const syncParticles = useCallback((next: EmberParticle[]) => {
    particlesRef.current = next
    setParticles([...next])
  }, [])

  const addParticles = useCallback((count: number, options: { x?: number; y?: number; golden?: boolean; goldenRatio?: number; burst?: boolean } = {}) => {
    const next = [...particlesRef.current]
    for (let i = 0; i < count; i++) {
      if (options.burst && options.x !== undefined && options.y !== undefined) {
        const angle = Math.random() * Math.PI * 2
        const spread = 2 + Math.random() * 8
        const golden = options.goldenRatio !== undefined ? Math.random() < options.goldenRatio : !!options.golden
        next.push(createParticle(
          golden,
          options.x + Math.cos(angle) * spread,
          options.y + Math.sin(angle) * spread,
          Math.random() < 0.4,
        ))
      } else {
        next.push(createParticle(!!options.golden, options.x, options.y, false))
      }
    }
    syncParticles(next)
  }, [syncParticles])

  useEffect(() => {
    wordStatesRef.current = createWordStates(words, imageFailures, viewport, masteredWordIds, wordStatesRef.current)
    physicsFrameRef.current = 0

    const timer = window.setTimeout(() => {
      setRevealedId((current) => words.some((word) => word.id === current) ? current : null)
      setRenderWords([...wordStatesRef.current])
    }, 0)

    return () => window.clearTimeout(timer)
  }, [imageFailures, masteredWordIds, viewport, words])

  useEffect(() => {
    reducedMotionRef.current = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (typeof document !== 'undefined' && !document.getElementById('ember-font-link')) {
      const link = document.createElement('link')
      link.id = 'ember-font-link'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&display=swap'
      document.head.appendChild(link)
    }
  }, [])

  useEffect(() => {
    if (sessionComplete) return undefined

    function loop() {
      const { minDistX, minDistY } = getBounds()
      physicsFrameRef.current += 1
      const physicsActive = physicsFrameRef.current <= PHYSICS_FRAMES

      for (const word of wordStatesRef.current) {
        if (word.mastered || word.burning) {
          const el = wordElementsRef.current.get(word.id)
          if (el) {
            el.style.left = `${word.x}%`
            syncCanvasCardTop(el, getToolbarAwareTop(word.y, toolbarClearancePx, laneTopOffsetPx, word.layout))
          }
          continue
        }

        let newX = word.x + Math.sin(word.drift) * 0.02
        let newY = word.y + Math.cos(word.drift) * 0.01

        if (physicsActive) {
          let repelX = 0
          let repelY = 0

          for (const other of wordStatesRef.current) {
            if (other.id === word.id || other.mastered || other.burning) continue
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
        }

        const bounds = getDriftBounds(word.layout, word.laneColumn, word.x)
        word.x = clamp(newX, bounds.minX, bounds.maxX)
        word.y = clamp(newY, bounds.minY, bounds.maxY)
        word.drift += 0.005

        const el = wordElementsRef.current.get(word.id)
        if (el) {
          el.style.left = `${word.x}%`
          syncCanvasCardTop(el, getToolbarAwareTop(word.y, toolbarClearancePx, laneTopOffsetPx, word.layout))
        }
      }

      for (const particle of particlesRef.current) {
        particle.y -= particle.speed
        particle.x += Math.sin(particle.phase) * 0.02
        particle.phase += 0.02
        if (particle.y < -10) {
          particle.y = 110
          particle.x = Math.random() * 100
        }

        const el = particleElementsRef.current.get(particle.id)
        if (el) {
          el.style.left = `${particle.x}%`
          el.style.top = `${particle.y}%`
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
    if (!containerRef.current || (event.target as HTMLElement).closest('button, [data-toolbar], .ember-word-inner')) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top + containerRef.current.scrollTop) / containerRef.current.scrollHeight) * 100
    addParticles(12, { x, y, burst: true })
  }

  const handleSelectWord = (state: EmberWordState, event: ReactMouseEvent) => {
    event.stopPropagation()
    if (state.burning || sessionComplete) return
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
    addParticles(15, { x: target.x, y: target.y, burst: true, goldenRatio: 0.5 })
    onPass(target.id)
    setRevealedId(null)
    setRenderWords([...wordStatesRef.current])
  }

  const handleFail = () => {
    const target = revealedId ? wordStatesRef.current.find((word) => word.id === revealedId) : null
    if (!target) return
    playSound('fail')
    target.burning = true
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
      target.burning = false
      setRenderWords([...wordStatesRef.current])
    }, 1200)
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-[2px]">
        <EmberStyle />
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl text-yellow-500 font-ember tracking-widest mb-4 drop-shadow-[0_0_20px_gold] animate-pulse">
            GARDEN COMPLETE
          </h1>
          <button
            onClick={onContinue}
            className="mt-8 px-8 py-3 text-orange-500 border border-orange-500/50 hover:bg-orange-500/10 rounded font-ember tracking-widest"
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
      className="fixed inset-0 z-40 h-[100dvh] max-h-[100dvh] bg-[#050505] overflow-y-auto md:overflow-hidden font-ember text-gray-300 cursor-crosshair select-none"
    >
      <EmberStyle />
      <div ref={worldRef} className="relative min-h-[150dvh] md:min-h-full md:h-full overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-0" style={warmthStyle} />

        <div className="pointer-events-none absolute inset-0 z-0">
          {particles.map((particle) => {
            const color = particle.golden ? '#ffd700' : '#ff4500'
            return (
              <div
                key={particle.id}
                ref={(node) => setParticleElement(particle.id, node)}
                className="absolute rounded-full transition-opacity"
                style={{
                  left: `${particle.x}%`,
                  top: `${particle.y}%`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`,
                  opacity: particle.brightness,
                  backgroundColor: color,
                  boxShadow: `0 0 ${particle.size * 4}px ${color}`,
                }}
              />
            )
          })}
        </div>

        <Toolbar
          toolbarRef={toolbarRef}
          activeMode={activeMode}
          showImages={showImages}
          direction={direction}
          autoReveal={autoReveal}
          languagePair={languagePair}
          canToggleDirection={canToggleDirection}
          currentPage={currentPage}
          totalPages={totalPages}
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
            const showImageCard = showImages && !!imageUrl
            const text = state.word.text ?? state.word.word
            const innerClassName = [
              'ember-word-inner transition-[opacity,transform,filter] duration-1000',
              state.burning ? 'opacity-0 scale-150 blur-md' : 'opacity-100 scale-100 blur-0',
              state.mastered ? 'ember-card-mastered' : 'ember-card-unmastered',
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
                  left: `${state.x}%`,
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
                  {showImageCard ? (
                    <img
                      src={imageUrl}
                      alt={text}
                      onError={() => handleImageError(state.id)}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border border-orange-900/30 opacity-85"
                    />
                  ) : (
                    <span className={`ember-card-text ${phraseClassName(text)}`}>
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

interface ToolbarProps {
  toolbarRef: RefObject<HTMLDivElement | null>
  activeMode: CanvasMode
  showImages: boolean
  direction: CanvasModeProps['direction']
  autoReveal: CanvasModeProps['autoReveal']
  languagePair: CanvasModeProps['languagePair']
  canToggleDirection: boolean
  currentPage: number
  totalPages: number
  onSwitchMode: (mode: CanvasMode) => void
  onToggleImages: () => void
  onToggleDirection: () => void
  onToggleAutoReveal: () => void
  onPrevPage: () => void
  onNextPage: () => void
  onExit: () => void
}

function Toolbar({
  toolbarRef,
  activeMode,
  showImages,
  direction,
  autoReveal,
  languagePair,
  canToggleDirection,
  currentPage,
  totalPages,
  onSwitchMode,
  onToggleImages,
  onToggleDirection,
  onToggleAutoReveal,
  onPrevPage,
  onNextPage,
  onExit,
}: ToolbarProps) {
  const { t } = useTranslation()
  const exitLabel = t('study.canvas.exit')
  const visibleCode = direction === 'target-visible' ? languagePair.targetCode : languagePair.baseCode
  const hiddenCode = direction === 'target-visible' ? languagePair.baseCode : languagePair.targetCode

  // Top padding respects the iOS notch; right-anchored Exit is the primary egress.
  return (
    <div
      ref={toolbarRef}
      data-toolbar
      className="sticky top-0 md:absolute md:top-0 left-0 right-0 z-40 flex items-start gap-2 pb-2 sm:gap-3 sm:pb-3 bg-black/40 border-b border-orange-900/30"
      style={{
        paddingTop: 'max(0.5rem, calc(env(safe-area-inset-top, 0px) + 0.25rem))',
        paddingLeft: 'max(0.75rem, calc(env(safe-area-inset-left, 0px) + 0.75rem))',
        paddingRight: 'max(0.75rem, calc(env(safe-area-inset-right, 0px) + 0.75rem))',
      }}
    >
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex flex-wrap gap-1">
          {CANVAS_MODES.map((mode) => (
            <button
              key={mode}
              onClick={(event) => {
                event.stopPropagation()
                onSwitchMode(mode)
              }}
              disabled={mode === activeMode}
              className={`h-9 px-3 text-xs uppercase tracking-widest border bg-black/50 rounded transition-colors ${
                mode === activeMode
                  ? 'text-orange-500 border-orange-500 cursor-default'
                  : 'text-orange-900 border-orange-900/30 hover:text-orange-500 hover:border-orange-500'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-start gap-2">
          {canToggleDirection && (
            <button
              onClick={(event) => {
                event.stopPropagation()
                onToggleDirection()
              }}
              className="h-9 px-3 text-xs uppercase tracking-widest text-orange-900 hover:text-orange-500 border border-orange-900/30 hover:border-orange-500 bg-black/50 rounded"
              title={t('study.canvas.swapPromptAnswer')}
            >
              <span className="text-orange-500">{visibleCode}</span>
              <span className="mx-1 text-orange-900">→</span>
              <span>{hiddenCode}</span>
            </button>
          )}

          <label
            className="h-9 px-3 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-orange-900 hover:text-orange-500 border border-orange-900/30 hover:border-orange-500 bg-black/50 rounded cursor-pointer"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={autoReveal === 'off'}
              onChange={onToggleAutoReveal}
              className="accent-orange-500"
            />
            {t('study.canvas.hideAnswer')}
          </label>

          <button
            onClick={(event) => {
              event.stopPropagation()
              onToggleImages()
            }}
            className="h-9 px-3 text-xs uppercase tracking-widest text-orange-900 hover:text-orange-500 border border-orange-900/30 hover:border-orange-500 bg-black/50 rounded"
            title={showImages ? t('study.canvas.showText') : t('study.canvas.showImages')}
          >
            {showImages ? 'Aa' : 'Img'}
          </button>

          {totalPages > 1 && (
            <>
              <span className="px-2 text-xs text-orange-500/60 tracking-widest whitespace-nowrap">
                {t('study.canvas.pageOf', { current: currentPage + 1, total: totalPages })}
              </span>
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  onPrevPage()
                }}
                disabled={currentPage === 0}
                className="w-9 h-9 text-orange-900 hover:text-orange-500 border border-orange-900/30 hover:border-orange-500 bg-black/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={t('study.canvas.previousPage')}
              >
                ‹
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation()
                  onNextPage()
                }}
                disabled={currentPage >= totalPages - 1}
                className="w-9 h-9 text-orange-900 hover:text-orange-500 border border-orange-900/30 hover:border-orange-500 bg-black/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={t('study.canvas.nextPage')}
              >
                ›
              </button>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onExit()
        }}
        aria-label={exitLabel}
        title={exitLabel}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-orange-300/70 bg-orange-500/10 text-orange-200 shadow-[0_0_10px_rgba(255,107,53,0.18)] transition-colors hover:border-orange-300 hover:bg-orange-500/20 hover:text-orange-100 hover:shadow-[0_0_18px_rgba(255,107,53,0.4)]"
      >
        <DoorOpen size={20} aria-hidden="true" />
      </button>
    </div>
  )
}

interface RevealModalProps {
  state: EmberWordState
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
      <div className="absolute inset-0 bg-black/95 backdrop-blur-[2px]" />
      <div
        data-phase-g-modal
        className="relative flex flex-col w-full mx-auto max-h-[85vh] overflow-x-hidden ember-modal-enter"
        style={{ maxWidth: 'min(calc(100vw - 32px), 600px)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 z-20 text-gray-600 cursor-pointer hover:text-white bg-black/80 border border-orange-900/30 rounded-full w-10 h-10 flex items-center justify-center text-xl"
          onClick={onClose}
          aria-label={t('study.canvas.close')}
        >
          ✕
        </button>

        <div
          className="bg-gradient-to-b from-[#121212] to-black border border-orange-900/40 rounded-xl text-center shadow-[0_0_100px_rgba(255,69,0,0.15)] flex max-h-[85vh] min-h-0 flex-col overflow-hidden"
          style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}
        >
          <div
            data-phase-g-modal-header
            className="sticky top-0 z-10 flex-shrink-0 bg-[#121212] px-6 pb-3 pt-12 md:px-10"
          >
            <button
              type="button"
              onClick={onSpeak}
              className="text-4xl md:text-5xl lg:text-6xl text-orange-100 font-ember tracking-wider drop-shadow-[0_0_15px_rgba(255,100,0,0.4)] cursor-pointer hover:scale-105 transition-transform bg-transparent border-none mb-3"
            >
              {promptFace}
            </button>

            {direction === 'target-visible' && phonetic && (
              <p className="text-orange-500/50 text-sm mb-3 font-sans tracking-widest text-center">
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
              className={!canGrade ? 'ember-answer-guard ember-answer-blurred mb-6' : 'ember-answer-guard mb-6'}
              onClick={revealAnswer}
            >
              {direction === 'base-visible' && phonetic && (
                <p className="ember-answer-content text-orange-500/50 text-sm mb-3 font-sans tracking-widest text-center">
                  {phonetic}
                </p>
              )}
              <p className="ember-answer-content text-xl md:text-2xl text-gray-200 leading-relaxed font-light font-ember">
                {answerFace}
              </p>
            </div>

            {imageUrl && (
              <div className="mb-6 flex justify-center">
                <div className="relative w-[140px] md:w-[160px] aspect-video overflow-hidden rounded-lg border border-orange-900/30">
                  <div
                    className={`absolute inset-0 animate-pulse bg-orange-950/40 transition-opacity duration-300 ${imageLoaded ? 'opacity-0' : 'opacity-100'}`}
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
                className={!canGrade ? 'ember-answer-guard ember-answer-blurred mt-6 text-left' : 'ember-answer-guard mt-6 text-left'}
                onClick={revealAnswer}
              >
                <div className="ember-answer-content">
                {learning?.mnemonic && (
                  <div className="border-t border-orange-900/30 pt-4">
                    <p className="text-[10px] tracking-widest text-orange-500 uppercase mb-2">
                      {t('study.canvas.mnemonic')}
                    </p>
                    <p className="text-base text-gray-300 font-ember leading-relaxed">
                      {learning.mnemonic}
                    </p>
                  </div>
                )}

                {learning?.etymology && (
                  <div className="border-t border-orange-900/30 pt-4 mt-4">
                    <p className="text-[10px] tracking-widest text-gray-500 uppercase mb-2">
                      {t('study.canvas.etymology')}
                    </p>
                    <p className="text-base italic text-gray-400 leading-relaxed">
                      {learning.etymology}
                    </p>
                  </div>
                )}

                {usage && (
                  <div className="border-t border-orange-900/30 pt-4 mt-4">
                    <p className="text-[10px] tracking-[0.2em] text-orange-500/60 uppercase mb-2">
                      {t('study.canvas.usage')}
                    </p>
                    {usage.target && (
                      <p className="text-lg italic text-orange-200/80 leading-relaxed">
                        {usage.target}
                      </p>
                    )}
                    {usage.base && (
                      <p className="text-base italic text-gray-400 leading-relaxed mt-1">
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
            className="sticky bottom-0 z-10 flex-shrink-0 border-t border-orange-900/30 bg-black px-6 pb-4 pt-5 md:px-10"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onFail}
                disabled={!canGrade}
                className={`h-12 rounded border bg-orange-900/10 border-orange-600/30 hover:bg-orange-500/20 hover:border-orange-500 text-orange-500 text-2xl drop-shadow-[0_0_8px_rgba(255,69,0,0.6)] hover:drop-shadow-[0_0_12px_rgba(255,69,0,0.8)] ${!canGrade ? 'opacity-35 pointer-events-none' : ''}`}
                aria-label={t('study.reviewLater')}
              >
                ✕
              </button>
              <button
                onClick={onPass}
                disabled={!canGrade}
                className={`h-12 rounded border bg-yellow-900/10 border-yellow-600/30 hover:bg-yellow-500/20 hover:border-yellow-500 text-yellow-500 text-2xl drop-shadow-[0_0_8px_rgba(255,215,0,0.6)] hover:drop-shadow-[0_0_12px_rgba(255,215,0,0.8)] ${!canGrade ? 'opacity-35 pointer-events-none' : ''}`}
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

function EmberStyle() {
  return (
    <style>
      {`
        .font-ember {
          font-family: "Cormorant Garamond", "Georgia", serif;
        }

        .ember-word-inner {
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
        }

        .ember-card-text {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 107, 53, 0.08);
          border: 1px solid rgba(255, 107, 53, 0.2);
          border-radius: 8px;
          font-size: clamp(0.85rem, 3.5vw, 1.2rem);
          line-height: 1.3;
          min-height: 44px;
          min-width: 60px;
          text-align: center;
        }

        .ember-card-unmastered {
          text-shadow: 0 0 8px rgba(255, 100, 50, 0.4);
          transition: color 1000ms, text-shadow 1000ms;
        }

        .ember-card-unmastered:hover .ember-card-text {
          color: rgba(255, 220, 180, 1);
          background: rgba(255, 107, 53, 0.2);
          border-color: rgba(255, 107, 53, 0.5);
          text-shadow: 0 0 12px rgba(255, 100, 50, 0.6);
        }

        .ember-card-unmastered:hover {
          transform: scale(1.05);
          filter: brightness(1.15);
        }

        .ember-card-mastered {
          color: #ffd700;
          text-shadow: 0 0 20px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 215, 0, 0.5);
          transform: scale(1.15);
          animation: ember-mastered-pulse 2s ease-in-out infinite;
        }

        .ember-card-mastered .ember-card-text {
          color: #ffd700;
          background: rgba(255, 215, 0, 0.15);
          border-color: rgba(255, 215, 0, 0.5);
        }

        @keyframes ember-mastered-pulse {
          0%, 100% {
            text-shadow: 0 0 20px rgba(255, 215, 0, 1), 0 0 40px rgba(255, 215, 0, 0.5);
            filter: brightness(1);
          }
          50% {
            text-shadow: 0 0 30px rgba(255, 215, 0, 1), 0 0 60px rgba(255, 215, 0, 0.7);
            filter: brightness(1.2);
          }
        }

        .ember-modal-enter {
          animation: ember-modal-scale 160ms ease-out;
        }

        .ember-answer-guard {
          position: relative;
          transition: transform 200ms ease, box-shadow 200ms ease;
        }

        .ember-answer-blurred {
          cursor: pointer;
        }

        @media (hover: hover) {
          .ember-answer-blurred:hover {
            transform: scale(1.02);
            box-shadow: 0 0 18px rgba(255, 107, 53, 0.28);
          }
        }

        .ember-answer-blurred .ember-answer-content {
          filter: blur(8px);
          user-select: none;
          pointer-events: none;
        }

        .ember-answer-blurred::after {
          content: "";
          position: absolute;
          inset: -0.35rem;
          border-radius: 10px;
          border: 1px solid rgba(255, 107, 53, 0.22);
          background: rgba(255, 92, 24, 0.15);
          pointer-events: none;
        }

        @keyframes ember-modal-scale {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 768px) {
          .ember-card-text {
            max-width: min(180px, 50vw);
            font-size: 0.95rem;
            padding: 0.5rem 0.8rem;
            line-height: 1.3;
            min-height: 44px;
          }
        }

        @media (max-width: 400px) {
          .ember-card-text {
            max-width: min(160px, 45vw);
            font-size: 0.9rem;
            padding: 0.4rem 0.7rem;
          }
        }
      `}
    </style>
  )
}
