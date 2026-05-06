import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, RefObject } from 'react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useViewport, type CanvasViewport } from '@/hooks/useViewport'
import { resolveCardLearningMetadata, type WordLike } from '@/lib/wordDisplayMetadata'
import { CANVAS_MODES, type CanvasMode, type CanvasModeProps } from './types'

type LaneColumn = 'left' | 'right'
type CanvasPosition = { x: number; y: number; laneColumn?: LaneColumn }

type FrostWordState = {
  id: string
  x: number
  y: number
  layout: CanvasViewport
  laneColumn: LaneColumn | null
  drift: number
  mastered: boolean
  crystallizing: boolean
  imageFailed: boolean
  word: CanvasModeProps['words'][number]
}

type Snowflake = {
  id: number
  x: number
  y: number
  char: string
  delay: number
}

type BreathSpot = {
  id: number
  x: number
  y: number
}

type AudioKind = 'hover' | 'reveal' | 'pass' | 'fail' | 'snowfall'

const PHYSICS_FRAMES = 300
const TOOLBAR_CARD_CLEARANCE_PX = 64
const SNOWFLAKE_CHARS = ['❄', '❅', '❆', '✻', '✼']

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

    if (i === 0 && !hasCollision(x, y) && inBounds(x, y)) {
      placed = true
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

function createWordStates(
  words: CanvasModeProps['words'],
  imageFailures: Set<string>,
  layout: CanvasViewport,
  masteredWordIds: ReadonlySet<string>,
  existingStates: FrostWordState[] = [],
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
      mastered: existing?.mastered || masteredWordIds.has(word.id),
      crystallizing: false,
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

function getToolbarAwareTop(y: number, toolbarClearancePx: number) {
  return toolbarClearancePx > 0 ? `max(${y}%, ${toolbarClearancePx}px)` : `${y}%`
}

// Phrase rule: single short headwords stay tight and nowrap; phrases or long tokens
// wrap in a wider frosted card with a slightly smaller handwritten size.
function phraseClassName(text: string) {
  const isPhrase = /\s/.test(text) || text.length > 18
  return isPhrase
    ? 'whitespace-normal max-w-[min(280px,65vw)] text-[clamp(0.82rem,3.2vw,1.15rem)] break-words'
    : 'whitespace-nowrap max-w-[min(200px,55vw)]'
}

function speakHeadword(word: CanvasModeProps['words'][number]) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const utterance = new SpeechSynthesisUtterance(word.word)
  const lang = getStringField(word, ['target_language', 'language'])
  if (lang) utterance.lang = lang
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utterance)
}

export default function FrostCanvas({
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
  const [renderWords, setRenderWords] = useState<FrostWordState[]>(() => createWordStates(words, new Set(), viewport, masteredWordIds))
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([])
  const [breathSpots, setBreathSpots] = useState<BreathSpot[]>([])
  const [imageFailures, setImageFailures] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const wordStatesRef = useRef<FrostWordState[]>(renderWords)
  const wordElementsRef = useRef(new Map<string, HTMLDivElement>())
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

  const paneStyle = useMemo<CSSProperties>(() => ({
    background: [
      'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)',
      'radial-gradient(ellipse at 70% 80%, rgba(255,255,255,0.1) 0%, transparent 40%)',
      'linear-gradient(180deg, rgba(200,220,240,0.08) 0%, rgba(180,200,220,0.12) 100%)',
    ].join(', '),
    boxShadow: 'inset 0 0 100px rgba(0,0,0,0.3), inset 0 0 200px rgba(0,0,0,0.1)',
  }), [])

  const playSound = useCallback((kind: AudioKind) => {
    if (reducedMotionRef.current || typeof window === 'undefined') return
    try {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) return
      const ctx = audioContextRef.current ?? new AudioCtor()
      audioContextRef.current = ctx

      if (kind === 'hover') {
        const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * 0.08)), ctx.sampleRate)
        const channel = buffer.getChannelData(0)
        let last = 0
        for (let i = 0; i < channel.length; i++) {
          last = (last + (Math.random() * 2 - 1)) / 2
          channel[i] = last * (1 - i / channel.length)
        }
        const source = ctx.createBufferSource()
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.04, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
        source.buffer = buffer
        source.connect(gain)
        gain.connect(ctx.destination)
        source.start()
        source.stop(ctx.currentTime + 0.08)
        return
      }

      if (kind === 'snowfall') {
        const gain = ctx.createGain()
        gain.connect(ctx.destination)
        gain.gain.setValueAtTime(0.06, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        for (const freq of [1800, 2200, 1600]) {
          const osc = ctx.createOscillator()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime)
          osc.connect(gain)
          osc.start()
          osc.stop(ctx.currentTime + 0.2)
        }
        return
      }

      const gain = ctx.createGain()
      gain.connect(ctx.destination)

      if (kind === 'reveal') {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(1500, ctx.currentTime)
        gain.gain.setValueAtTime(0.06, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 0.1)
      } else if (kind === 'pass') {
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)
        for (const freq of [2200, 2800]) {
          const osc = ctx.createOscillator()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(freq, ctx.currentTime)
          osc.connect(gain)
          osc.start()
          osc.stop(ctx.currentTime + 0.15)
        }
      } else {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(220, ctx.currentTime)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 0.25)
      }
    } catch {
      // Decorative audio must never block study interactions.
    }
  }, [])

  const setWordElement = useCallback((id: string, node: HTMLDivElement | null) => {
    if (node) {
      wordElementsRef.current.set(id, node)
    } else {
      wordElementsRef.current.delete(id)
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

    if (typeof document !== 'undefined' && !document.getElementById('frost-font-link')) {
      const link = document.createElement('link')
      link.id = 'frost-font-link'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Patrick+Hand&display=swap'
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
        if (word.mastered || word.crystallizing) {
          const el = wordElementsRef.current.get(word.id)
          if (el) {
            el.style.left = `${word.x}%`
            el.style.top = getToolbarAwareTop(word.y, toolbarClearancePx)
          }
          continue
        }

        let newX = word.x + Math.sin(word.drift) * 0.02
        let newY = word.y + Math.cos(word.drift) * 0.01

        if (physicsActive) {
          let repelX = 0
          let repelY = 0

          for (const other of wordStatesRef.current) {
            if (other.id === word.id || other.mastered || other.crystallizing) continue
            const dx = newX - other.x
            const dy = newY - other.y
            const distX = Math.abs(dx)
            const distY = Math.abs(dy)

            if (distX < minDistX && distY < minDistY) {
              const overlapX = minDistX - distX
              const overlapY = minDistY - distY
              if (distX > 0.1) repelX += (dx > 0 ? 1 : -1) * overlapX * 0.02
              if (distY > 0.1) repelY += (dy > 0 ? 1 : -1) * overlapY * 0.02
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
          el.style.top = getToolbarAwareTop(word.y, toolbarClearancePx)
        }
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [sessionComplete, toolbarClearancePx])

  useEffect(() => () => {
    for (const timer of timersRef.current) window.clearTimeout(timer)
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(() => {})
    }
  }, [])

  const spawnSnowflakes = useCallback((x: number, y: number) => {
    const flakes = Array.from({ length: 8 }, (_, index) => ({
      id: Math.random(),
      x: x + (Math.random() - 0.5) * 60,
      y,
      char: SNOWFLAKE_CHARS[index % SNOWFLAKE_CHARS.length],
      delay: Math.random() * 0.3,
    }))
    setSnowflakes((prev) => [...prev, ...flakes])
    playSound('snowfall')

    const timer = window.setTimeout(() => {
      setSnowflakes((prev) => prev.filter((flake) => !flakes.some((created) => created.id === flake.id)))
    }, 2500)
    timersRef.current.push(timer)
  }, [playSound])

  const spawnBreathSpot = useCallback((state: FrostWordState) => {
    const spot = { id: Math.random(), x: state.x, y: state.y }
    setBreathSpots((prev) => [...prev, spot])
    playSound('hover')

    const timer = window.setTimeout(() => {
      setBreathSpots((prev) => prev.filter((item) => item.id !== spot.id))
    }, 2000)
    timersRef.current.push(timer)
  }, [playSound])

  const handleBackgroundClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || (event.target as HTMLElement).closest('button, [data-toolbar], .frost-word-inner')) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top + containerRef.current.scrollTop
    spawnSnowflakes(x, y)
  }

  const handleSelectWord = (state: FrostWordState, event: ReactMouseEvent) => {
    event.stopPropagation()
    if (state.crystallizing || sessionComplete) return
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
    onPass(target.id)
    setRevealedId(null)
    setRenderWords([...wordStatesRef.current])
  }

  const handleFail = () => {
    const target = revealedId ? wordStatesRef.current.find((word) => word.id === revealedId) : null
    if (!target) return
    playSound('fail')
    target.crystallizing = true
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
      target.crystallizing = false
      setRenderWords([...wordStatesRef.current])
    }, 1500)
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <FrostStyle />
        <div className="text-center">
          <h1 className="text-5xl text-[#2a4a6a] font-finger tracking-widest mb-4 drop-shadow-[0_0_20px_rgba(168,216,234,0.4)] animate-pulse">
            Window Clear
          </h1>
          <button
            onClick={onContinue}
            className="mt-8 px-8 py-3 text-[#a8d8ea] border border-[#a8d8ea]/30 hover:bg-[#a8d8ea]/10 rounded-lg font-hand tracking-widest"
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
      className="fixed inset-0 z-40 bg-gradient-to-b from-[#0f1a28] via-[#152535] to-[#0a1520] overflow-y-auto md:overflow-hidden font-hand text-[#a8d8f0] cursor-default select-none"
    >
      <FrostStyle />
      <div className="relative min-h-[150vh] md:min-h-full md:h-full overflow-hidden">
        <div className="pointer-events-none absolute inset-0 z-0" style={paneStyle} />
        <div className="pointer-events-none absolute right-[18%] top-[18%] z-0 h-2 w-2 rounded-full bg-yellow-200/30 blur-sm" />
        <div className="pointer-events-none absolute right-[12%] top-[28%] z-0 h-1 w-1 rounded-full bg-yellow-100/20 blur-sm" />
        <div className="pointer-events-none absolute right-[24%] top-[34%] z-0 h-3 w-3 rounded-full bg-blue-200/20 blur-md" />
        <IceCorner className="left-0 top-0" angle={135} />
        <IceCorner className="right-0 top-0" angle={225} />
        <IceCorner className="left-0 bottom-0" angle={45} />
        <IceCorner className="right-0 bottom-0" angle={315} />

        <div className="pointer-events-none absolute inset-0 z-20">
          {snowflakes.map((flake) => (
            <span
              key={flake.id}
              className="snowflake"
              style={{
                left: `${flake.x}px`,
                top: `${flake.y}px`,
                animationDelay: `${flake.delay}s`,
              }}
            >
              {flake.char}
            </span>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 z-10">
          {breathSpots.map((spot) => (
            <div
              key={spot.id}
              className="frost-breath-spot"
              style={{
                left: `${spot.x}%`,
                top: `${spot.y}%`,
              }}
            />
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
            const innerClassName = [
              'frost-word-inner transition-[opacity,transform,filter] duration-1000',
              state.crystallizing ? 'frost-failing' : 'opacity-100 scale-100 blur-0',
              state.mastered ? 'frost-card-mastered' : 'frost-card-unmastered',
            ].join(' ')

            return (
              <div
                key={state.id}
                ref={(node) => setWordElement(state.id, node)}
                className="absolute"
                style={{
                  left: `${state.x}%`,
                  top: getToolbarAwareTop(state.y, toolbarClearancePx),
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <button
                  type="button"
                  onClick={(event) => handleSelectWord(state, event)}
                  onMouseEnter={() => spawnBreathSpot(state)}
                  className={innerClassName}
                >
                  {showImageCard ? (
                    <img
                      src={imageUrl}
                      alt={text}
                      onError={() => handleImageError(state.id)}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover border-2 border-[rgba(79,195,247,0.5)] opacity-85"
                    />
                  ) : (
                    <span className={`frost-card-text ${phraseClassName(text)}`}>
                      {text}
                      {state.mastered && <FrostCrystalOverlay />}
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

function IceCorner({ className, angle }: { className: string; angle: number }) {
  return (
    <div
      className={`pointer-events-none absolute z-0 h-8 w-8 opacity-20 ${className}`}
      style={{
        background: `linear-gradient(${angle}deg, rgba(200,220,240,0.3) 0%, transparent 60%)`,
      }}
    />
  )
}

function FrostCrystalOverlay() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M50 10 L50 90" stroke="rgba(168, 216, 234, 0.6)" strokeWidth="1.5" />
      <path d="M15 30 L85 70" stroke="rgba(168, 216, 234, 0.5)" strokeWidth="1.2" />
      <path d="M15 70 L85 30" stroke="rgba(168, 216, 234, 0.5)" strokeWidth="1.2" />
      <path d="M35 18 L50 32 L65 18" stroke="rgba(168, 216, 234, 0.4)" strokeWidth="1" fill="none" />
      <path d="M28 78 L45 70 L42 88" stroke="rgba(168, 216, 234, 0.3)" strokeWidth="1" fill="none" />
      <path d="M72 78 L55 70 L58 88" stroke="rgba(168, 216, 234, 0.3)" strokeWidth="1" fill="none" />
    </svg>
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
    <div ref={toolbarRef} data-toolbar className="sticky top-0 md:absolute md:top-0 left-0 right-0 z-40 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-black/50 border-b border-white/10">
      <button
        onClick={(event) => {
          event.stopPropagation()
          onExit()
        }}
        className="h-9 px-3 text-xs uppercase tracking-widest text-white/30 hover:text-[#a8d8ea] border border-white/10 hover:border-[#a8d8ea]/50 bg-black/50 rounded-lg"
      >
        Exit
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
            className={`h-9 px-3 text-xs uppercase tracking-widest border bg-black/50 rounded-lg transition-colors ${
              mode === activeMode
                ? 'text-[#a8d8ea] border-[#a8d8ea] cursor-default'
                : 'text-white/30 border-white/10 hover:text-[#a8d8ea] hover:border-[#a8d8ea]/50'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        {canToggleDirection && (
          <button
            onClick={(event) => {
              event.stopPropagation()
              onToggleDirection()
            }}
            className="h-9 px-3 text-xs uppercase tracking-widest text-white/30 hover:text-[#a8d8ea] border border-white/10 hover:border-[#a8d8ea]/50 bg-black/50 rounded-lg"
            title="Swap prompt and answer"
          >
            <span className="text-[#a8d8ea]">{visibleCode}</span>
            <span className="mx-1 text-white/30">→</span>
            <span>{hiddenCode}</span>
          </button>
        )}

        <label
          className="h-9 px-3 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/30 hover:text-[#a8d8ea] border border-white/10 hover:border-[#a8d8ea]/50 bg-black/50 rounded-lg cursor-pointer"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={autoReveal === 'off'}
            onChange={onToggleAutoReveal}
            className="accent-[#a8d8ea]"
          />
          Hide answer
        </label>

        <button
          onClick={(event) => {
            event.stopPropagation()
            onToggleImages()
          }}
          className="h-9 px-3 text-xs uppercase tracking-widest text-white/30 hover:text-[#a8d8ea] border border-white/10 hover:border-[#a8d8ea]/50 bg-black/50 rounded-lg"
          title={showImages ? 'Show text' : 'Show images'}
        >
          {showImages ? 'Aa' : 'Img'}
        </button>

        {totalPages > 1 && (
          <>
            <span className="px-2 text-xs text-[#a8d8ea]/70 tracking-widest whitespace-nowrap">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={(event) => {
                event.stopPropagation()
                onPrevPage()
              }}
              disabled={currentPage === 0}
              className="w-9 h-9 text-white/30 hover:text-[#a8d8ea] border border-white/10 hover:border-[#a8d8ea]/50 bg-black/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              ‹
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation()
                onNextPage()
              }}
              disabled={currentPage >= totalPages - 1}
              className="w-9 h-9 text-white/30 hover:text-[#a8d8ea] border border-white/10 hover:border-[#a8d8ea]/50 bg-black/50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              ›
            </button>
          </>
        )}
      </div>
    </div>
  )
}

interface RevealModalProps {
  state: FrostWordState
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        data-phase-g-modal
        className="relative flex flex-col w-full mx-auto max-h-[85vh] overflow-x-hidden frost-modal-enter"
        style={{ maxWidth: 'min(calc(100vw - 32px), 600px)' }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 z-20 text-gray-600 cursor-pointer hover:text-white bg-slate-800/90 border border-[#a8d8ea]/30 rounded-full w-10 h-10 flex items-center justify-center text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div
          className="bg-slate-800/95 border border-[#a8d8ea]/30 rounded-lg shadow-2xl backdrop-blur-md text-center flex max-h-[85vh] min-h-0 flex-col overflow-hidden"
          style={{ overflowWrap: 'anywhere', wordBreak: 'normal' }}
        >
          <div
            data-phase-g-modal-header
            className="sticky top-0 z-10 flex-shrink-0 bg-slate-800 px-6 pb-3 pt-12 md:px-8"
          >
            <button
              type="button"
              onClick={onSpeak}
              className="text-4xl md:text-5xl text-[#a8d8ea] font-finger font-bold tracking-wider cursor-pointer hover:scale-105 transition-transform bg-transparent border-none mb-3"
            >
              {promptFace}
            </button>

            {direction === 'target-visible' && phonetic && (
              <p className="text-[#a8d8ea]/50 text-sm mb-3 font-sans tracking-widest text-center">
                {phonetic}
              </p>
            )}
          </div>

          <div
            data-phase-g-modal-main
            data-body-scroll-lock-scrollable="true"
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-3 md:px-8"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div
              className={!canGrade ? 'frost-answer-guard frost-answer-blurred mb-6' : 'frost-answer-guard mb-6'}
              onClick={revealAnswer}
            >
              {direction === 'base-visible' && phonetic && (
                <p className="frost-answer-content text-[#a8d8ea]/50 text-sm mb-3 font-sans tracking-widest text-center">
                  {phonetic}
                </p>
              )}
              <p className="frost-answer-content text-lg md:text-xl text-gray-300 leading-relaxed font-light font-hand">
                {answerFace}
              </p>
            </div>

            {imageUrl && (
              <div className="mb-6 flex justify-center">
                <img
                  src={imageUrl}
                  alt={word.word}
                  onError={onImageError}
                  className="max-w-[140px] max-h-[140px] md:max-w-[160px] md:max-h-[160px] rounded-lg border border-[#a8d8ea]/30 opacity-80 hover:opacity-100 transition-opacity"
                />
              </div>
            )}

            {hasRichData && (
              <div
                className={!canGrade ? 'frost-answer-guard frost-answer-blurred mt-6 text-left' : 'frost-answer-guard mt-6 text-left'}
                onClick={revealAnswer}
              >
                <div className="frost-answer-content">
                {learning?.mnemonic && (
                  <div className="border-t border-[#a8d8ea]/20 pt-4">
                    <div className="bg-[#a8d8ea]/5 border border-[#a8d8ea]/10 rounded-lg p-3">
                      <p className="text-[10px] tracking-widest text-[#a8d8ea]/70 uppercase mb-2 font-hand">
                        Mnemonic
                      </p>
                      <p className="text-base text-[#a8d8ea]/80 font-hand leading-relaxed">
                        {learning.mnemonic}
                      </p>
                    </div>
                  </div>
                )}

                {learning?.etymology && (
                  <div className="border-t border-[#a8d8ea]/20 pt-4 mt-4">
                    <p className="text-[10px] tracking-widest text-[#a8d8ea]/70 uppercase mb-2 font-hand">
                      Etymology
                    </p>
                    <p className="text-base italic text-[#a8d8ea]/80 leading-relaxed font-hand">
                      {learning.etymology}
                    </p>
                  </div>
                )}

                {usage && (
                  <div className="border-t border-[#a8d8ea]/20 pt-4 mt-4">
                    <p className="text-[10px] tracking-widest text-[#a8d8ea]/70 uppercase mb-2 font-hand">
                      Usage
                    </p>
                    {usage.target && (
                      <p className="text-base italic text-[#a8d8ea]/80 leading-relaxed font-hand">
                        {usage.target}
                      </p>
                    )}
                    {usage.base && (
                      <p className="text-sm italic text-gray-300 leading-relaxed mt-1 font-hand">
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
            className="sticky bottom-0 z-10 flex-shrink-0 border-t border-[#a8d8ea]/20 bg-slate-800 px-6 pb-4 pt-5 md:px-8"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onFail}
                disabled={!canGrade}
                className={`h-12 rounded-lg bg-[#a8d8ea]/20 hover:bg-[#a8d8ea]/30 text-[#a8d8ea] text-2xl ${!canGrade ? 'opacity-35 pointer-events-none' : ''}`}
                aria-label="Review later"
              >
                ✕
              </button>
              <button
                onClick={onPass}
                disabled={!canGrade}
                className={`h-12 rounded-lg bg-[#2a4a6a]/80 hover:bg-[#2a4a6a] text-white text-2xl ${!canGrade ? 'opacity-35 pointer-events-none' : ''}`}
                aria-label="Remembered"
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

function FrostStyle() {
  return (
    <style>
      {`
        .font-finger {
          font-family: "Caveat", "Segoe Script", "Bradley Hand", cursive;
        }

        .font-hand {
          font-family: "Patrick Hand", "Segoe Script", "Bradley Hand", cursive;
        }

        .frost-word-inner {
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
        }

        .frost-card-text {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.6rem 0.9rem;
          background: rgba(15, 35, 55, 0.85);
          border: 2px solid rgba(79, 195, 247, 0.5);
          border-radius: 10px;
          box-shadow:
            0 0 15px rgba(79, 195, 247, 0.2),
            inset 0 0 20px rgba(79, 195, 247, 0.05);
          font-size: clamp(0.9rem, 3.8vw, 1.4rem);
          font-weight: 600;
          min-height: 44px;
          min-width: 60px;
          text-align: center;
          color: #8dd0e8;
          letter-spacing: 0.025em;
          font-family: "Caveat", "Segoe Script", "Bradley Hand", cursive;
        }

        .frost-card-unmastered {
          transition: color 1000ms, text-shadow 1000ms;
          animation: frost-breath 4s ease-in-out infinite;
        }

        .frost-card-unmastered:hover .frost-card-text {
          color: #b8e4f5;
          background: rgba(20, 45, 70, 0.9);
          border-color: rgba(79, 195, 247, 0.8);
          box-shadow:
            0 0 25px rgba(79, 195, 247, 0.4),
            inset 0 0 25px rgba(79, 195, 247, 0.1);
        }

        .frost-card-mastered .frost-card-text {
          color: #d0f0ff;
          animation: frost-ice-shimmer 3s ease-in-out infinite;
        }

        .frost-card-mastered:hover {
          filter: drop-shadow(0 0 15px rgba(168, 216, 234, 0.6)) drop-shadow(0 0 25px rgba(168, 216, 234, 0.3)) !important;
        }

        .frost-failing {
          animation:
            frost-crystallize 1.2s ease-out forwards,
            fog-return 1.5s ease-out forwards;
        }

        .frost-breath-spot {
          position: absolute;
          width: 120px;
          height: 120px;
          margin-left: -60px;
          margin-top: -60px;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
          animation: breath-fade 2s ease-out forwards;
        }

        .snowflake {
          position: absolute;
          color: rgba(168, 216, 234, 0.8);
          font-size: 16px;
          animation: snowfall 2s ease-out forwards;
          text-shadow: 0 0 5px rgba(168, 216, 234, 0.5);
        }

        .frost-modal-enter {
          animation: frost-appear 0.5s ease-out forwards;
        }

        .frost-answer-guard {
          position: relative;
          transition: transform 200ms ease, box-shadow 200ms ease;
        }

        .frost-answer-blurred {
          cursor: pointer;
        }

        @media (hover: hover) {
          .frost-answer-blurred:hover {
            transform: scale(1.02);
            box-shadow: 0 0 22px rgba(168, 216, 234, 0.26);
          }
        }

        .frost-answer-blurred .frost-answer-content {
          filter: blur(8px);
          user-select: none;
          pointer-events: none;
        }

        .frost-answer-blurred::after {
          content: "";
          position: absolute;
          inset: -0.35rem;
          border-radius: 10px;
          border: 1px solid rgba(168, 216, 234, 0.22);
          background: rgba(79, 195, 247, 0.15);
          pointer-events: none;
        }

        @keyframes frost-breath {
          0%, 100% {
            transform: scale(1);
            opacity: 0.9;
          }
          50% {
            transform: scale(1.02);
            opacity: 1;
          }
        }

        @keyframes frost-shimmer {
          0%, 100% {
            filter: drop-shadow(0 0 4px rgba(168, 216, 234, 0.2));
          }
          50% {
            filter: drop-shadow(0 0 10px rgba(168, 216, 234, 0.45));
          }
        }

        @keyframes frost-crystallize {
          0% {
            filter: brightness(1);
            transform: scale(1);
          }
          50% {
            filter: brightness(2.5);
            transform: scale(1.15);
          }
          100% {
            filter: brightness(1);
            transform: scale(1);
          }
        }

        @keyframes breath-fade {
          from {
            opacity: 0.5;
            transform: scale(0.5);
          }
          to {
            opacity: 0;
            transform: scale(1.5);
          }
        }

        @keyframes fog-return {
          0% {
            filter: blur(0.5px);
            opacity: 1;
          }
          50% {
            filter: blur(15px);
            opacity: 0;
          }
          100% {
            filter: blur(0.5px);
            opacity: 1;
          }
        }

        @keyframes frost-appear {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes snowfall {
          from {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          to {
            transform: translateY(180px) rotate(180deg);
            opacity: 0;
          }
        }

        @keyframes frost-ice-shimmer {
          0%, 100% {
            box-shadow:
              0 0 15px rgba(79, 195, 247, 0.2),
              inset 0 0 20px rgba(79, 195, 247, 0.05);
          }
          50% {
            box-shadow:
              0 0 30px rgba(79, 195, 247, 0.45),
              inset 0 0 30px rgba(79, 195, 247, 0.12);
          }
        }

        @media (max-width: 768px) {
          .frost-card-text {
            max-width: min(180px, 50vw);
            font-size: 1rem;
            padding: 0.55rem 0.8rem;
          }
        }

        @media (max-width: 400px) {
          .frost-card-text {
            max-width: min(160px, 45vw);
            font-size: 0.95rem;
            padding: 0.5rem 0.7rem;
          }
        }
      `}
    </style>
  )
}
