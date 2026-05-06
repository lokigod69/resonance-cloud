import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from 'react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useViewport, type CanvasViewport } from '@/hooks/useViewport'
import { resolveCardLearningMetadata, type WordLike } from '@/lib/wordDisplayMetadata'
import { CANVAS_MODES, type CanvasMode, type CanvasModeProps } from './types'

type LaneColumn = 'left' | 'right'
type CanvasPosition = { x: number; y: number; laneColumn?: LaneColumn }

type SyndicateWordState = {
  id: string
  x: number
  y: number
  layout: CanvasViewport
  laneColumn: LaneColumn | null
  vx: number
  vy: number
  settled: number
  hue: number
  glitchX: number
  glitchY: number
  glitchDelay: number
  mastered: boolean
  decrypting: boolean
  imageFailed: boolean
  word: CanvasModeProps['words'][number]
}

type DataDrop = {
  id: number
  column: number
  y: number
  speed: number
  opacity: number
  chars: string[]
}

type GridBurst = {
  id: number
  x: number
  y: number
  paths: string[]
}

type PixelParticle = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  opacity: number
  char: string
  color: string
}

type AudioKind = 'hover' | 'reveal' | 'pass' | 'fail' | 'background'

const DATA_RAIN_CHARSET = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'
const DATA_RAIN_COLUMNS = 25
const PHYSICS_FRICTION = 0.80
const PHYSICS_FORCE = 0.04
const SETTLED_THRESHOLD = 0.12
const SETTLED_FRAMES = 20
const MAX_PHYSICS_FRAMES = 300
const TOOLBAR_CARD_CLEARANCE_PX = 64
const LONG_PHRASE_X_CLAMP_PX = 230
const LANE_TEXT_X_CLAMP_PX = 90
const LANE_IMAGE_X_CLAMP_PX = 112
const PASS_PARTICLE_COLORS = ['#00fff2', '#39ff14', '#ff0040']
const HUES = [
  'rgba(0, 255, 242, 0.9)',
  'rgba(57, 255, 20, 0.85)',
  'rgba(0, 200, 255, 0.9)',
  'rgba(180, 255, 220, 0.85)',
  'rgba(200, 100, 255, 0.85)',
]

function getBounds() {
  return {
    minX: 12,
    maxX: 88,
    minY: 10,
    maxY: 85,
    spacingX: 16,
    spacingY: 10,
    minDistX: 14,
    minDistY: 9,
  }
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
  words: SyndicateWordState[],
  layout: CanvasViewport,
  toolbarClearancePx: number,
) {
  const [laneTopOffsetPx, setLaneTopOffsetPx] = useState(0)

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || layout !== 'lane') {
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

function getSafeClampLength(px: number) {
  return `min(${px}px, calc(50vw - 16px))`
}

function getSyndicateCardAwareLeft(word: SyndicateWordState, showImages: boolean) {
  if (word.layout !== 'lane') return `${word.x}%`

  const text = word.word.text ?? word.word.word
  const imageUrl = !word.imageFailed ? getImageUrl(word.word) : null
  const showImageCard = showImages && !!imageUrl
  const edgeClampPx = showImageCard
    ? LANE_IMAGE_X_CLAMP_PX
    : isLongPhrase(text)
      ? LONG_PHRASE_X_CLAMP_PX
      : LANE_TEXT_X_CLAMP_PX
  const edgeClamp = getSafeClampLength(edgeClampPx)
  return `clamp(${edgeClamp}, ${word.x}%, calc(100% - ${edgeClamp}))`
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

function randomChar() {
  return DATA_RAIN_CHARSET[Math.floor(Math.random() * DATA_RAIN_CHARSET.length)]
}

function withAlpha(color: string, alpha: number) {
  const match = color.match(/rgba?\(([^)]+)\)/)
  if (!match) return color
  const [r, g, b] = match[1].split(',').map((part) => part.trim())
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function createDataDrop(column = Math.floor(Math.random() * DATA_RAIN_COLUMNS), y = -20 - Math.random() * 60): DataDrop {
  const length = 8 + Math.floor(Math.random() * 13)
  return {
    id: Math.random(),
    column,
    y,
    speed: 0.1 + Math.random() * 0.15,
    opacity: 0.15 + Math.random() * 0.2,
    chars: Array.from({ length }, () => randomChar()),
  }
}

function generateLightningPaths() {
  return Array.from({ length: 4 }, () => {
    const startX = 20 + Math.random() * 160
    const startY = 20 + Math.random() * 160
    let d = `M ${startX} ${startY}`
    for (let i = 0; i < 4; i++) {
      d += ` L ${20 + Math.random() * 160} ${20 + Math.random() * 160}`
    }
    return d
  })
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

  const columns = Math.ceil(Math.sqrt(count * 1.6))
  const rows = Math.ceil(count / columns) + 1
  const grid: Array<{ x: number; y: number }> = []

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      grid.push({
        x: minX + ((col + 0.5) / columns) * (maxX - minX),
        y: minY + ((row + 0.5) / rows) * (maxY - minY),
      })
    }
  }

  for (let i = grid.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[grid[i], grid[j]] = [grid[j], grid[i]]
  }

  for (let i = 0; i < count; i++) {
    let placed = false
    let x = centerX
    let y = centerY

    while (grid.length > 0 && !placed) {
      const candidate = grid.shift()
      if (!candidate) break
      const testX = candidate.x + (Math.random() - 0.5) * spacingX * 0.35
      const testY = candidate.y + (Math.random() - 0.5) * spacingY * 0.35
      if (inBounds(testX, testY) && !hasCollision(testX, testY)) {
        x = testX
        y = testY
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

function createWordStates(
  words: CanvasModeProps['words'],
  imageFailures: Set<string>,
  layout: CanvasViewport,
  masteredWordIds: ReadonlySet<string>,
  existingStates: SyndicateWordState[] = [],
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
      vx: existing?.vx ?? 0,
      vy: existing?.vy ?? 0,
      settled: existing?.settled ?? 0,
      hue: existing?.hue ?? Math.floor(Math.random() * HUES.length),
      glitchX: existing?.glitchX ?? (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 5),
      glitchY: existing?.glitchY ?? (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 5),
      glitchDelay: existing?.glitchDelay ?? index * 0.7 + Math.random() * 2,
      mastered: existing?.mastered || masteredWordIds.has(word.id),
      decrypting: false,
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
    if (first) return first
  }

  for (const key of ['image_url', 'thumbnail_url', 'thumbnail_url_b']) {
    const value = record?.[key]
    if (typeof value === 'string' && value.trim().length > 0) return value
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

// Phrase rule: short headwords stay tight and nowrap; multi-word phrases or
// long tokens wrap without adding a card box, preserving the terminal bracket grammar.
function isLongPhrase(text: string) {
  return /\s/.test(text) || text.length > 18
}

function phraseClassName(text: string) {
  if (/\s/.test(text)) return 'syndicate-card-phrase text-[clamp(0.78rem,3vw,1.05rem)]'
  if (text.length > 18) return 'syndicate-card-long-token text-[clamp(0.78rem,3vw,1.05rem)]'
  return 'syndicate-card-token'
}

function speakHeadword(word: CanvasModeProps['words'][number]) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(word.word)
  const lang = getStringField(word, ['target_language', 'language'])
  if (lang) utterance.lang = lang
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

export default function SyndicateCanvas({
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
  const viewport = useViewport()
  const [renderWords, setRenderWords] = useState<SyndicateWordState[]>(() => createWordStates(words, new Set(), viewport, masteredWordIds))
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [imageFailures, setImageFailures] = useState<Set<string>>(new Set())
  const [drops, setDrops] = useState<DataDrop[]>(
    () => Array.from({ length: DATA_RAIN_COLUMNS }, (_, column) => createDataDrop(column, Math.random() * 120)),
  )
  const [bursts, setBursts] = useState<GridBurst[]>([])
  const [particles, setParticles] = useState<PixelParticle[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const worldRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const wordStatesRef = useRef<SyndicateWordState[]>(renderWords)
  const wordElementsRef = useRef(new Map<string, HTMLDivElement>())
  const dropElementsRef = useRef(new Map<number, HTMLDivElement>())
  const particleElementsRef = useRef(new Map<number, HTMLDivElement>())
  const dropsRef = useRef<DataDrop[]>(drops)
  const particlesRef = useRef<PixelParticle[]>(particles)
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

  const gridStyle = useMemo<CSSProperties>(() => ({
    backgroundImage: [
      'linear-gradient(rgba(0,255,242,0.10) 1px, transparent 1px)',
      'linear-gradient(90deg, rgba(0,255,242,0.10) 1px, transparent 1px)',
    ].join(', '),
    backgroundSize: '50px 50px',
  }), [])

  const playSound = useCallback((kind: AudioKind) => {
    if (reducedMotionRef.current || typeof window === 'undefined') return
    try {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) return
      const ctx = audioContextRef.current ?? new AudioCtor()
      audioContextRef.current = ctx

      const playNoise = (duration: number, gainValue: number) => {
        const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate)
        const channel = buffer.getChannelData(0)
        for (let i = 0; i < channel.length; i++) {
          channel[i] = (Math.random() * 2 - 1) * (1 - i / channel.length)
        }
        const source = ctx.createBufferSource()
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(gainValue, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
        source.buffer = buffer
        source.connect(gain)
        gain.connect(ctx.destination)
        source.start()
        source.stop(ctx.currentTime + duration)
      }

      if (kind === 'background') {
        playNoise(0.08, 0.05)
        return
      }

      if (kind === 'hover') {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'square'
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        gain.gain.setValueAtTime(0.04, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.06)
        return
      }

      const gain = ctx.createGain()
      gain.connect(ctx.destination)

      if (kind === 'reveal') {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(400, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15)
        gain.gain.setValueAtTime(0.06, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 0.15)
      } else if (kind === 'pass') {
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        for (const [index, freq] of [1200, 1800].entries()) {
          const osc = ctx.createOscillator()
          osc.type = 'square'
          osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1)
          osc.connect(gain)
          osc.start(ctx.currentTime + index * 0.1)
          osc.stop(ctx.currentTime + (index + 1) * 0.1)
        }
      } else {
        const osc = ctx.createOscillator()
        osc.type = 'square'
        osc.frequency.setValueAtTime(200, ctx.currentTime)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
        playNoise(0.05, 0.03)
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

  const setDropElement = useCallback((id: number, node: HTMLDivElement | null) => {
    if (node) {
      dropElementsRef.current.set(id, node)
    } else {
      dropElementsRef.current.delete(id)
    }
  }, [])

  const setParticleElement = useCallback((id: number, node: HTMLDivElement | null) => {
    if (node) {
      particleElementsRef.current.set(id, node)
    } else {
      particleElementsRef.current.delete(id)
    }
  }, [])

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
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (revealedId) {
        setRevealedId(null)
      } else {
        onExit()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onExit, revealedId])

  useEffect(() => {
    if (sessionComplete) return undefined

    function loop() {
      const { minDistX, minDistY } = getBounds()
      physicsFrameRef.current += 1
      const physicsActive = physicsFrameRef.current <= MAX_PHYSICS_FRAMES

      for (const word of wordStatesRef.current) {
        const el = wordElementsRef.current.get(word.id)

        if (!word.mastered && !word.decrypting && physicsActive && word.settled <= SETTLED_FRAMES) {
          let repelX = 0
          let repelY = 0

          for (const other of wordStatesRef.current) {
            if (other.id === word.id || other.mastered || other.decrypting) continue
            const dx = word.x - other.x
            const dy = word.y - other.y
            const distX = Math.abs(dx)
            const distY = Math.abs(dy)

            if (distX < minDistX && distY < minDistY) {
              const overlapX = minDistX - distX
              const overlapY = minDistY - distY
              if (distX > 0.1) repelX += (dx > 0 ? 1 : -1) * overlapX * PHYSICS_FORCE
              if (distY > 0.1) repelY += (dy > 0 ? 1 : -1) * overlapY * PHYSICS_FORCE
            }
          }

          word.vx = (word.vx + repelX) * PHYSICS_FRICTION
          word.vy = (word.vy + repelY) * PHYSICS_FRICTION
          const speed = Math.sqrt(word.vx * word.vx + word.vy * word.vy)
          word.settled = speed < SETTLED_THRESHOLD ? word.settled + 1 : 0
          const bounds = getDriftBounds(word.layout, word.laneColumn, word.x)
          word.x = clamp(word.x + word.vx, bounds.minX, bounds.maxX)
          word.y = clamp(word.y + word.vy, bounds.minY, bounds.maxY)
        }

        if (el) {
          el.style.left = getSyndicateCardAwareLeft(word, showImages)
          el.style.top = getToolbarAwareTop(word.y, toolbarClearancePx, laneTopOffsetPx, word.layout)
        }
      }

      let nextDrops = dropsRef.current
        .map((drop) => ({ ...drop, y: drop.y + drop.speed }))
        .filter((drop) => drop.y <= 120)

      if (Math.random() < 0.15) {
        nextDrops = [...nextDrops, createDataDrop()]
      }

      const activeColumns = new Set(nextDrops.map((drop) => drop.column))
      for (let column = 0; column < DATA_RAIN_COLUMNS; column++) {
        if (!activeColumns.has(column)) {
          nextDrops.push(createDataDrop(column))
        }
      }

      dropsRef.current = nextDrops
      for (const drop of nextDrops) {
        const el = dropElementsRef.current.get(drop.id)
        if (el) el.style.top = `${drop.y}%`
      }
      setDrops([...nextDrops])

      let particlesChanged = false
      const nextParticles = particlesRef.current
        .map((particle) => {
          particlesChanged = true
          return {
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy,
            vy: particle.vy + 0.1,
            opacity: particle.opacity - 0.02,
          }
        })
        .filter((particle) => particle.opacity > 0)

      particlesRef.current = nextParticles
      for (const particle of nextParticles) {
        const el = particleElementsRef.current.get(particle.id)
        if (el) {
          el.style.left = `${particle.x}px`
          el.style.top = `${particle.y}px`
          el.style.opacity = String(particle.opacity)
        }
      }
      if (particlesChanged) setParticles([...nextParticles])

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [laneTopOffsetPx, sessionComplete, showImages, toolbarClearancePx])

  useEffect(() => () => {
    for (const timer of timersRef.current) window.clearTimeout(timer)
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(() => {})
    }
  }, [])

  const spawnGridBurst = useCallback((x: number, y: number) => {
    const burst = { id: Math.random(), x, y, paths: generateLightningPaths() }
    setBursts((prev) => [...prev, burst])
    playSound('background')

    const timer = window.setTimeout(() => {
      setBursts((prev) => prev.filter((item) => item.id !== burst.id))
    }, 850)
    timersRef.current.push(timer)
  }, [playSound])

  const spawnPixelExplosion = useCallback((state: SyndicateWordState) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const originX = (state.x / 100) * rect.width
    const originY = (state.y / 100) * rect.height - containerRef.current.scrollTop
    const chars = [...state.word.word, '0', '1', '#', '@', '%', '&']

    const created = Array.from({ length: 40 }, (_, index) => {
      const angle = Math.random() * Math.PI * 2
      const speed = 2 + Math.random() * 4
      return {
        id: Math.random(),
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        opacity: 1,
        char: chars[Math.floor(Math.random() * chars.length)] ?? '1',
        color: PASS_PARTICLE_COLORS[index % PASS_PARTICLE_COLORS.length],
      }
    })

    particlesRef.current = [...particlesRef.current, ...created]
    setParticles([...particlesRef.current])
  }, [])

  const handleBackgroundClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || (event.target as HTMLElement).closest('button, [data-toolbar], .syndicate-word-inner')) return
    const rect = containerRef.current.getBoundingClientRect()
    spawnGridBurst(event.clientX - rect.left, event.clientY - rect.top + containerRef.current.scrollTop)
  }

  const handleSelectWord = (state: SyndicateWordState, event: ReactMouseEvent) => {
    event.stopPropagation()
    if (state.decrypting || state.mastered || sessionComplete) return
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
    spawnPixelExplosion(target)
    onPass(target.id)
    setRevealedId(null)
    setRenderWords([...wordStatesRef.current])
  }

  const handleFail = () => {
    const target = revealedId ? wordStatesRef.current.find((word) => word.id === revealedId) : null
    if (!target) return
    playSound('fail')
    target.decrypting = true
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
      target.vx = 0
      target.vy = 0
      target.settled = 0
      target.decrypting = false
      physicsFrameRef.current = 0

      for (const word of wordStatesRef.current) {
        const dx = Math.abs(word.x - target.x)
        const dy = Math.abs(word.y - target.y)
        if (dx < 24 && dy < 18) word.settled = 0
      }

      setRenderWords([...wordStatesRef.current])
    }, 600)
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95">
        <SyndicateStyle />
        <div className="text-center font-mono">
          <h1 className="text-4xl md:text-6xl text-[#39ff14] tracking-widest mb-4 syndicate-pulse">
            [DECRYPTION COMPLETE]
          </h1>
          <button
            onClick={onContinue}
            className="mt-8 px-8 py-3 text-[#39ff14] border border-[#39ff14]/50 hover:bg-[#39ff14]/10 font-mono tracking-widest"
          >
            [CONTINUE]
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      onClick={handleBackgroundClick}
      className="syndicate-grid-container fixed inset-0 z-40 h-[100dvh] max-h-[100dvh] bg-[#050505] overflow-y-auto md:overflow-hidden font-mono text-gray-400 select-none"
      style={gridStyle}
    >
      <SyndicateStyle />
      <div className="syndicate-scanlines pointer-events-none absolute inset-0 z-30" />

      <div ref={worldRef} className="relative min-h-[150dvh] md:min-h-full md:h-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-0">
          {drops.map((drop) => (
            <div
              key={drop.id}
              ref={(node) => setDropElement(drop.id, node)}
              className="absolute text-[10px] font-mono leading-none text-[#00fff2]"
              style={{
                left: `${((drop.column + 0.5) / DATA_RAIN_COLUMNS) * 100}%`,
                top: `${drop.y}%`,
                opacity: drop.opacity,
              }}
            >
              {drop.chars.map((char, index) => (
                <div key={`${drop.id}-${index}`} style={{ opacity: Math.max(0, 1 - index * 0.08) }}>
                  {char}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 z-20">
          {bursts.map((burst) => (
            <div
              key={burst.id}
              className="grid-glitch-burst"
              style={{ left: `${burst.x}px`, top: `${burst.y}px` }}
            >
              <div className="glitch-pulse" />
              <svg className="glitch-lightning" viewBox="0 0 200 200" aria-hidden="true">
                {burst.paths.map((path, index) => (
                  <path key={index} d={path} />
                ))}
              </svg>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 z-30">
          {particles.map((particle) => (
            <div
              key={particle.id}
              ref={(node) => setParticleElement(particle.id, node)}
              className="absolute text-xs font-mono leading-none"
              style={{
                left: `${particle.x}px`,
                top: `${particle.y}px`,
                color: particle.color,
                opacity: particle.opacity,
                textShadow: `0 0 8px ${particle.color}`,
              }}
            >
              {particle.char}
            </div>
          ))}
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
            const hueColor = HUES[state.hue] ?? HUES[0]
            const cssVars = {
              '--syn-glow': hueColor,
              '--syn-glow-border': withAlpha(hueColor, 0.4),
              '--syn-glow-soft': withAlpha(hueColor, 0.3),
              '--syn-glow-strong': withAlpha(hueColor, 0.5),
              '--glitch-delay': `${state.glitchDelay}s`,
              '--glitch-x': `${state.glitchX}px`,
              '--glitch-y': `${state.glitchY}px`,
            } as CSSProperties
            const innerClassName = [
              'syndicate-word-inner transition-[opacity,filter] duration-200',
              state.decrypting ? 'syndicate-fail-glitch' : 'opacity-100',
              state.mastered ? 'opacity-0 pointer-events-none' : '',
            ].join(' ')
            return (
              <div
                key={state.id}
                ref={(node) => setWordElement(state.id, node)}
                className="absolute"
                style={{
                  left: getSyndicateCardAwareLeft(state, showImages),
                  top: getToolbarAwareTop(state.y, toolbarClearancePx, laneTopOffsetPx, state.layout),
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <button
                  type="button"
                  onClick={(event) => handleSelectWord(state, event)}
                  onMouseEnter={() => playSound('hover')}
                  className={innerClassName}
                  style={cssVars}
                >
                  {showImageCard ? (
                    <span className="syndicate-card-image inline-flex items-center gap-1.5">
                      <span className="text-[var(--syn-glow)] opacity-60 font-mono text-lg leading-none">[</span>
                      <img
                        src={imageUrl}
                        alt={text}
                        onError={() => handleImageError(state.id)}
                        className="w-20 h-20 md:w-24 md:h-24 object-cover border-2 transition-shadow duration-200"
                        style={{
                          borderColor: 'var(--syn-glow-border)',
                          boxShadow: '0 0 15px var(--syn-glow-soft)',
                          backgroundColor: 'rgba(0, 0, 0, 0.4)',
                        }}
                      />
                      <span className="text-[var(--syn-glow)] opacity-60 font-mono text-lg leading-none">]</span>
                    </span>
                  ) : (
                    <span className={`syndicate-card-text ${phraseClassName(text)}`} style={{ color: hueColor }}>
                      <span className="syndicate-card-bracket opacity-60">[</span>
                      <span className="syndicate-card-body">{text}</span>
                      <span className="syndicate-card-bracket opacity-60">]</span>
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {words.length === 0 && (
          <p className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-[#00fff2]/50 font-mono tracking-widest">
            // NO_DATA_PACKETS
          </p>
        )}

        {selectedState && (
          <RevealModal
            state={selectedState}
            learning={selectedLearning}
            imageUrl={selectedImage}
            direction={direction}
            onClose={() => setRevealedId(null)}
            onImageError={() => handleImageError(selectedState.id)}
            onSpeak={() => speakHeadword(selectedState.word)}
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
  const visibleCode = direction === 'target-visible' ? languagePair.targetCode : languagePair.baseCode
  const hiddenCode = direction === 'target-visible' ? languagePair.baseCode : languagePair.targetCode

  return (
    <div ref={toolbarRef} data-toolbar className="sticky top-0 md:absolute md:top-0 left-0 right-0 z-40 flex flex-wrap items-center justify-start gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3 bg-black/50 border-b border-[#00fff2]/20 font-mono">
      <button
        onClick={(event) => {
          event.stopPropagation()
          onExit()
        }}
        className="h-9 px-3 text-xs uppercase tracking-widest text-[#00fff2]/50 hover:text-[#00fff2] border border-[#00fff2]/30 hover:border-[#00fff2] bg-black/50"
      >
        [EXIT]
      </button>

      <div className="flex flex-wrap gap-1">
        {CANVAS_MODES.map((mode) => (
          <button
            key={mode}
            onClick={(event) => {
              event.stopPropagation()
              onSwitchMode(mode)
            }}
            disabled={mode === activeMode}
            className={`h-9 px-3 text-xs uppercase tracking-widest border bg-black/50 transition-colors ${
              mode === activeMode
                ? 'text-[#00fff2] border-[#00fff2] cursor-default'
                : 'text-[#00fff2]/50 border-[#00fff2]/30 hover:text-[#00fff2] hover:border-[#00fff2]'
            }`}
          >
            [{mode}]
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
            className="h-9 px-3 text-xs uppercase tracking-widest text-[#00fff2]/50 hover:text-[#00fff2] border border-[#00fff2]/30 hover:border-[#00fff2] bg-black/50"
            title="Swap prompt and answer"
          >
            <span className="text-[#00fff2]">{visibleCode}</span>
            <span className="mx-1 text-[#00fff2]/50">→</span>
            <span>{hiddenCode}</span>
          </button>
        )}

        <label
          className="h-9 px-3 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-[#00fff2]/50 hover:text-[#00fff2] border border-[#00fff2]/30 hover:border-[#00fff2] bg-black/50 cursor-pointer"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={autoReveal === 'off'}
            onChange={onToggleAutoReveal}
            className="accent-[#00fff2]"
          />
          Hide answer
        </label>

        <button
          onClick={(event) => {
            event.stopPropagation()
            onToggleImages()
          }}
          className="h-9 px-3 text-xs uppercase tracking-widest text-[#00fff2]/50 hover:text-[#00fff2] border border-[#00fff2]/30 hover:border-[#00fff2] bg-black/50"
          title={showImages ? 'Show text' : 'Show images'}
        >
          {showImages ? '[TXT]' : '[IMG]'}
        </button>

        {totalPages > 1 && (
          <>
            <span className="px-2 text-xs text-[#00fff2]/60 tracking-widest whitespace-nowrap">
              {currentPage + 1}/{totalPages}
            </span>
            <button
              onClick={(event) => {
                event.stopPropagation()
                onPrevPage()
              }}
              disabled={currentPage === 0}
              className="w-9 h-9 text-[#00fff2]/50 hover:text-[#00fff2] border border-[#00fff2]/30 hover:border-[#00fff2] bg-black/50 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              [&lt;]
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation()
                onNextPage()
              }}
              disabled={currentPage >= totalPages - 1}
              className="w-9 h-9 text-[#00fff2]/50 hover:text-[#00fff2] border border-[#00fff2]/30 hover:border-[#00fff2] bg-black/50 disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              [&gt;]
            </button>
          </>
        )}
      </div>
    </div>
  )
}

interface RevealModalProps {
  state: SyndicateWordState
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
  const word = state.word
  const promptFace = word.promptFace ?? word.word
  const answerFace = word.answerFace ?? word.translation ?? word.word
  const phonetic = getStringField(word, ['phonetic', 'ipa'])
  const usage = learning?.usageExample
  const hasRichData = !!learning?.mnemonic || !!learning?.etymology || !!usage
  const [answerRevealed, setAnswerRevealed] = useState(autoReveal === 'on')
  const canGrade = autoReveal === 'on' || answerRevealed
  useBodyScrollLock(true)

  useEffect(() => {
    setAnswerRevealed(autoReveal === 'on')
  }, [autoReveal, word.id])

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
      <div className="absolute inset-0 bg-black/95" />
      <div
        data-phase-g-modal
        className="relative flex flex-col w-full mx-auto max-h-[85vh] overflow-hidden font-mono bg-[#0a0a0a] border border-[#00fff2]/50 syndicate-modal-enter"
        style={{ maxWidth: 'min(calc(100vw - 32px), 600px)', overflowWrap: 'anywhere', wordBreak: 'normal' }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute right-2 top-2 z-30 flex h-11 min-h-11 w-11 min-w-11 items-center justify-center rounded-full border border-[#00fff2]/30 bg-[#0a0a0a] text-sm text-[#00fff2]/60 hover:text-[#00fff2]"
          onClick={onClose}
          aria-label="Close"
        >
          [X]
        </button>

        <div
          data-phase-g-modal-header
          className="sticky top-0 z-10 flex-shrink-0 bg-[#0a0a0a] px-6 pb-3 pt-12 text-center md:px-10"
        >
          <button
            type="button"
            onClick={onSpeak}
            className="text-3xl md:text-4xl lg:text-5xl tracking-wider font-mono text-[#00fff2] bg-transparent border-none mb-3 syndicate-headword"
          >
            [{promptFace}]
          </button>

          {direction === 'target-visible' && phonetic && (
            <p className="text-sm tracking-widest font-mono text-[#39ff14]/50 mb-3">
              {phonetic}
            </p>
          )}
        </div>

        <div
          data-phase-g-modal-main
          data-body-scroll-lock-scrollable="true"
          className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-3 text-center md:px-10"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div
            className={!canGrade ? 'syndicate-answer-guard syndicate-answer-blurred mb-6' : 'syndicate-answer-guard mb-6'}
            onClick={revealAnswer}
          >
            {direction === 'base-visible' && phonetic && (
              <p className="syndicate-answer-content text-sm tracking-widest font-mono text-[#39ff14]/50 mb-3">
                {phonetic}
              </p>
            )}
            <p className="syndicate-answer-content text-lg md:text-xl font-mono text-gray-300 leading-relaxed">
              {answerFace}
            </p>
          </div>

          {imageUrl && (
            <div className="mb-6 flex justify-center">
              <img
                src={imageUrl}
                alt={word.word}
                onError={onImageError}
                className="max-w-[140px] max-h-[140px] md:max-w-[160px] md:max-h-[160px] object-cover border border-[#00fff2]/50 shadow-[0_0_15px_rgba(0,255,242,0.3)] opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
          )}

          {hasRichData && (
            <div
              className={!canGrade ? 'syndicate-answer-guard syndicate-answer-blurred mt-6 text-left space-y-4' : 'syndicate-answer-guard mt-6 text-left space-y-4'}
              onClick={revealAnswer}
            >
              <div className="syndicate-answer-content">
              {learning?.mnemonic && (
                <div className="bg-[#0f0f0f] border border-[#ff0040]/30 p-4">
                  <p className="text-[10px] tracking-widest text-[#ff0040]/70 mb-2">// MEMORY_HOOK</p>
                  <p className="text-base text-gray-400 leading-relaxed">
                    {learning.mnemonic}
                  </p>
                </div>
              )}

              {learning?.etymology && (
                <div className="bg-[#0f0f0f] border border-[#00fff2]/20 p-4">
                  <p className="text-[10px] tracking-widest text-[#00fff2]/50 mb-2">// ORIGIN</p>
                  <p className="text-base text-gray-400 leading-relaxed">
                    {learning.etymology}
                  </p>
                </div>
              )}

              {usage && (
                <div className="bg-[#0f0f0f] border border-[#39ff14]/20 p-4">
                  <p className="text-[10px] tracking-widest text-[#39ff14]/50 mb-2">// USAGE</p>
                  {usage.target && (
                    <p className="text-lg text-[#39ff14]/70 leading-relaxed">
                      {usage.target}
                    </p>
                  )}
                  {usage.base && (
                    <p className="text-base text-gray-400 leading-relaxed mt-1">
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
          className="sticky bottom-0 z-10 flex-shrink-0 border-t border-[#00fff2]/20 bg-[#0a0a0a] px-6 pb-4 pt-5 md:px-10"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onFail}
              disabled={!canGrade}
              className={`h-12 bg-[#ff0040]/10 border border-[#ff0040]/50 text-[#ff0040] hover:bg-[#ff0040]/20 font-mono tracking-widest ${!canGrade ? 'opacity-35 pointer-events-none' : ''}`}
            >
              ✗ FAIL
            </button>
            <button
              onClick={onPass}
              disabled={!canGrade}
              className={`h-12 bg-[#39ff14]/10 border border-[#39ff14]/50 text-[#39ff14] hover:bg-[#39ff14]/20 font-mono tracking-widest ${!canGrade ? 'opacity-35 pointer-events-none' : ''}`}
            >
              ✓ PASS
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SyndicateStyle() {
  return (
    <style>
      {`
        .syndicate-scanlines {
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.3) 2px,
            rgba(0, 0, 0, 0.3) 4px
          );
          opacity: 0.30;
        }

        .syndicate-word-inner {
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
          animation: syndicate-rgb-split 4s infinite;
          animation-delay: var(--glitch-delay);
          text-shadow: 0 0 12px var(--syn-glow), 0 0 4px var(--syn-glow);
        }

        .syndicate-word-inner:hover {
          transform: scale(1.05);
        }

        .syndicate-word-inner:hover .syndicate-card-image img {
          box-shadow: 0 0 25px var(--syn-glow-strong) !important;
        }

        .syndicate-card-text {
          display: inline-flex;
          align-items: center;
          line-height: 1.3;
          font-size: clamp(0.9rem, 4vw, 1.3rem);
          padding: 0.3rem 0.4rem;
          min-height: 40px;
          min-width: 50px;
          max-width: min(420px, calc(100vw - 48px));
          letter-spacing: 0.025em;
        }

        .syndicate-card-body {
          min-width: 0;
        }

        .syndicate-card-bracket {
          flex: 0 0 auto;
        }

        .syndicate-card-token .syndicate-card-body {
          white-space: nowrap;
        }

        .syndicate-card-phrase {
          white-space: normal;
        }

        .syndicate-card-phrase .syndicate-card-body {
          overflow-wrap: normal;
          word-break: normal;
        }

        .syndicate-card-long-token .syndicate-card-body {
          overflow-wrap: anywhere;
          word-break: normal;
        }

        .grid-glitch-burst {
          position: absolute;
          width: 200px;
          height: 200px;
          margin-left: -100px;
          margin-top: -100px;
          pointer-events: none;
          animation: grid-glitch-fade 0.8s ease-out forwards;
        }

        .glitch-pulse {
          position: absolute;
          left: 90px;
          top: 90px;
          width: 20px;
          height: 20px;
          background: radial-gradient(circle, rgba(0,255,242,0.8) 0%, rgba(57,255,20,0.4) 45%, transparent 70%);
          box-shadow: 0 0 30px #00fff2, 0 0 60px #39ff14;
          animation: glitch-pulse-scale 0.4s ease-out forwards;
        }

        .glitch-lightning {
          position: absolute;
          inset: 0;
          filter: brightness(1);
          animation: glitch-lightning-brightness 0.3s linear forwards;
        }

        .glitch-lightning path {
          fill: none;
          stroke: #ff0040;
          stroke-width: 1;
          stroke-linecap: square;
          filter: drop-shadow(0 0 6px #00fff2);
        }

        .syndicate-modal-enter {
          animation: syndicate-modal-scale 160ms ease-out;
        }

        .syndicate-headword {
          text-shadow: 0 0 20px currentColor;
        }

        .syndicate-answer-guard {
          position: relative;
          transition: transform 200ms steps(2), box-shadow 200ms steps(2);
        }

        .syndicate-answer-blurred {
          cursor: pointer;
        }

        @media (hover: hover) {
          .syndicate-answer-blurred:hover {
            transform: scale(1.02);
            box-shadow: 0 0 20px rgba(0, 255, 242, 0.28);
          }
        }

        .syndicate-answer-blurred .syndicate-answer-content {
          filter: blur(8px);
          user-select: none;
          pointer-events: none;
        }

        .syndicate-answer-blurred::after {
          content: "";
          position: absolute;
          inset: -0.35rem;
          border: 1px solid rgba(0, 255, 242, 0.28);
          background:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.28) 2px,
              rgba(0, 0, 0, 0.28) 4px
            ),
            rgba(0, 255, 242, 0.14);
          pointer-events: none;
        }

        .syndicate-pulse {
          animation: syndicate-pulse-anim 2s ease-in-out infinite;
          text-shadow: 0 0 20px currentColor;
        }

        .syndicate-fail-glitch {
          animation: syndicate-fail-glitch 0.6s ease-out forwards;
        }

        @keyframes syndicate-rgb-split {
          0%, 85% {
            text-shadow: 0 0 12px var(--syn-glow), 0 0 4px var(--syn-glow);
          }
          86% {
            text-shadow: -2px 0 #ff0040, 2px 0 #00fff2;
            transform: translate(var(--glitch-x), var(--glitch-y));
          }
          87% {
            text-shadow: 2px 0 #ff0040, -2px 0 #00fff2;
            transform: translate(calc(var(--glitch-x) * -1), var(--glitch-y));
          }
          88%, 92% {
            text-shadow: -2px 0 #ff0040, 2px 0 #00fff2;
          }
          93%, 100% {
            text-shadow: 0 0 12px var(--syn-glow), 0 0 4px var(--syn-glow);
          }
        }

        @keyframes grid-glitch-fade {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes glitch-pulse-scale {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(8); opacity: 0; }
        }

        @keyframes glitch-lightning-brightness {
          0%, 100% { filter: brightness(1); opacity: 0.5; }
          50% { filter: brightness(3); opacity: 1; }
        }

        @keyframes syndicate-fail-glitch {
          0% { opacity: 1; filter: hue-rotate(0deg) saturate(1); transform: translateX(0); }
          12% { opacity: 0.2; filter: hue-rotate(90deg) saturate(2); transform: translateX(-8px); }
          24% { opacity: 1; filter: hue-rotate(-90deg) saturate(2); transform: translateX(8px); }
          36% { opacity: 0.35; filter: hue-rotate(90deg) saturate(2); transform: translateX(-4px); }
          52% { opacity: 1; filter: hue-rotate(-90deg) saturate(2); transform: translateX(4px); }
          72% { opacity: 0; filter: hue-rotate(90deg) saturate(2); transform: translateX(12px); }
          100% { opacity: 0; filter: hue-rotate(0deg) saturate(1); transform: translateX(0); }
        }

        @keyframes syndicate-pulse-anim {
          0%, 100% {
            opacity: 1;
            text-shadow: 0 0 20px currentColor;
          }
          50% {
            opacity: 0.8;
            text-shadow: 0 0 40px currentColor;
          }
        }

        @keyframes syndicate-modal-scale {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}
    </style>
  )
}
