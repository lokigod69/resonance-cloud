import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { useViewport, type CanvasViewport } from '@/hooks/useViewport'
import { resolveCardLearningMetadata, type WordLike } from '@/lib/wordDisplayMetadata'
import { CANVAS_MODES, type CanvasMode, type CanvasModeProps } from './types'

type LaneColumn = 'left' | 'right'
type CanvasPosition = { x: number; y: number; laneColumn?: LaneColumn }

type ZenWordState = {
  id: string
  x: number
  y: number
  layout: CanvasViewport
  laneColumn: LaneColumn | null
  drift: number
  hue: number
  waveOffset: number
  mastered: boolean
  dissolving: boolean
  imageFailed: boolean
  word: CanvasModeProps['words'][number]
}

type ZenParticle = {
  id: number
  x: number
  y: number
  size: number
  speed: number
  phase: number
  opacity: number
  permanent: boolean
  bornAt: number
  duration: number
}

type ZenRipple = {
  id: number
  x: number
  y: number
}

type ZenWave = {
  x: number
  y: number
  spawnTime: number
}

type AudioKind = 'hover' | 'reveal' | 'pass' | 'fail' | 'ripple'

const AMBIENT_PARTICLE_COUNT = 30
const DISSOLVE_PARTICLE_COUNT = 80
const PHYSICS_FRAMES = 300
const WAVE_DURATION_MS = 2000
const WAVE_SPEED_PX_PER_SECOND = 400
const WAVE_MAX_OFFSET = 18
const WAVE_THICKNESS_PERCENT = 5
const HUES = [
  'rgba(200, 200, 210, 0.08)',
  'rgba(210, 205, 195, 0.08)',
  'rgba(195, 205, 200, 0.08)',
  'rgba(205, 195, 205, 0.08)',
  'rgba(200, 200, 200, 0.08)',
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

function createWordStates(
  words: CanvasModeProps['words'],
  imageFailures: Set<string>,
  layout: CanvasViewport,
  masteredWordIds: ReadonlySet<string>,
  existingStates: ZenWordState[] = [],
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
      hue: existing?.hue ?? index % HUES.length,
      waveOffset: existing?.waveOffset ?? 0,
      mastered: existing?.mastered || masteredWordIds.has(word.id),
      dissolving: false,
      imageFailed: imageFailures.has(word.id),
      word,
    }
  })
}

function createParticle(options: Partial<ZenParticle> = {}): ZenParticle {
  const permanent = options.permanent ?? true
  return {
    id: Math.random(),
    x: options.x ?? Math.random() * 100,
    y: options.y ?? Math.random() * 100,
    size: options.size ?? 1 + Math.random(),
    speed: options.speed ?? (permanent ? 0.012 + Math.random() * 0.012 : 0.05 + Math.random() * 0.08),
    phase: options.phase ?? Math.random() * Math.PI * 2,
    opacity: options.opacity ?? (permanent ? 0.18 + Math.random() * 0.18 : 0.7),
    permanent,
    bornAt: options.bornAt ?? 0,
    duration: options.duration ?? (permanent ? Number.POSITIVE_INFINITY : 700),
  }
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

function getMetadataRecord(word: CanvasModeProps['words'][number]) {
  const metadata = (word as Record<string, unknown>).metadata
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata as Record<string, unknown>
    : null
}

function getDefinition(word: CanvasModeProps['words'][number]) {
  const metadata = getMetadataRecord(word)
  const visualCardPlan = metadata?.visual_card_plan
  const gptImage2Card = metadata?.gpt_image_2_card
  const candidates = [
    (word as Record<string, unknown>).definition,
    visualCardPlan && typeof visualCardPlan === 'object' ? (visualCardPlan as Record<string, unknown>).definition : null,
    gptImage2Card && typeof gptImage2Card === 'object' ? (gptImage2Card as Record<string, unknown>).definition : null,
    word.translation,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate.trim()
  }

  return null
}

// Phrase rule: single short headwords stay tight and nowrap; multi-word
// phrases or long tokens wrap in a wider barely-there card for readability.
function phraseClassName(text: string) {
  const isPhrase = /\s/.test(text) || text.length > 18
  return isPhrase
    ? 'whitespace-normal max-w-[min(280px,65vw)] text-[clamp(0.78rem,3vw,1.05rem)] break-words'
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

export default function ZenCanvas({
  words,
  masteredWordIds,
  showImages,
  sessionComplete,
  direction,
  autoReveal,
  languagePair,
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
  const [renderWords, setRenderWords] = useState<ZenWordState[]>(() => createWordStates(words, new Set(), viewport, masteredWordIds))
  const [particles, setParticles] = useState<ZenParticle[]>(
    () => Array.from({ length: AMBIENT_PARTICLE_COUNT }, () => createParticle({ permanent: true })),
  )
  const [ripples, setRipples] = useState<ZenRipple[]>([])
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [imageFailures, setImageFailures] = useState<Set<string>>(new Set())
  const [breathPhase, setBreathPhase] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const worldRef = useRef<HTMLDivElement | null>(null)
  const wordStatesRef = useRef<ZenWordState[]>(renderWords)
  const wordElementsRef = useRef(new Map<string, HTMLDivElement>())
  const particlesRef = useRef<ZenParticle[]>(particles)
  const particleElementsRef = useRef(new Map<number, HTMLDivElement>())
  const wavesRef = useRef<ZenWave[]>([])
  const frameRef = useRef<number | null>(null)
  const physicsFrameRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const reducedMotionRef = useRef(false)
  const timersRef = useRef<number[]>([])
  const breathPhaseRef = useRef(0)

  const selectedState = renderWords.find((word) => word.id === revealedId) ?? null
  const selectedLearning = selectedState
    ? resolveCardLearningMetadata(selectedState.word as WordLike)
    : null
  const selectedImage = selectedState && !selectedState.imageFailed ? getImageUrl(selectedState.word) : null
  const masteredCount = renderWords.filter((word) => word.mastered).length
  const breathScale = 1 + Math.sin(breathPhase * 0.0628) * 0.08
  const progressOpacity = 0.3 + ((Math.sin(breathPhase * 0.0628) + 1) / 2) * 0.3

  const noiseStyle = useMemo<CSSProperties>(() => ({
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
  }), [])

  const playSound = useCallback((kind: AudioKind) => {
    if (reducedMotionRef.current || typeof window === 'undefined') return
    try {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtor) return
      const ctx = audioContextRef.current ?? new AudioCtor()
      audioContextRef.current = ctx

      const gain = ctx.createGain()
      gain.connect(ctx.destination)
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.connect(gain)

      if (kind === 'hover') {
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        gain.gain.setValueAtTime(0.03, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
        osc.start()
        osc.stop(ctx.currentTime + 0.08)
      } else if (kind === 'reveal') {
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        gain.gain.setValueAtTime(0.05, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
        osc.start()
        osc.stop(ctx.currentTime + 0.12)
      } else if (kind === 'pass') {
        osc.frequency.setValueAtTime(400, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2)
        gain.gain.setValueAtTime(0.05, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
        osc.start()
        osc.stop(ctx.currentTime + 0.2)
      } else if (kind === 'fail') {
        osc.frequency.setValueAtTime(400, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.25)
        gain.gain.setValueAtTime(0.05, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
        osc.start()
        osc.stop(ctx.currentTime + 0.25)
      } else {
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3)
        gain.gain.setValueAtTime(0.06, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start()
        osc.stop(ctx.currentTime + 0.3)
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

  const setParticleElement = useCallback((id: number, node: HTMLDivElement | null) => {
    if (node) {
      particleElementsRef.current.set(id, node)
    } else {
      particleElementsRef.current.delete(id)
    }
  }, [])

  const syncParticles = useCallback((next: ZenParticle[]) => {
    particlesRef.current = next
    setParticles([...next])
  }, [])

  const spawnDissolveParticles = useCallback((x: number, y: number) => {
    const now = performance.now()
    const next = [...particlesRef.current]
    for (let i = 0; i < DISSOLVE_PARTICLE_COUNT; i++) {
      next.push(createParticle({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 5,
        size: 1 + Math.random() * 1.5,
        speed: 0.08 + Math.random() * 0.12,
        opacity: 0.45 + Math.random() * 0.35,
        permanent: false,
        bornAt: now,
        duration: 700,
      }))
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

    if (typeof document !== 'undefined' && !document.getElementById('zen-font-link')) {
      const link = document.createElement('link')
      link.id = 'zen-font-link'
      link.rel = 'stylesheet'
      link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&display=swap'
      document.head.appendChild(link)
    }
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

    function loop(now: number) {
      const { minDistX, minDistY } = getBounds()
      const containerWidth = containerRef.current?.getBoundingClientRect().width ?? window.innerWidth
      physicsFrameRef.current += 1
      breathPhaseRef.current += 1
      const physicsActive = physicsFrameRef.current <= PHYSICS_FRAMES

      wavesRef.current = wavesRef.current.filter((wave) => now - wave.spawnTime <= WAVE_DURATION_MS)

      for (const word of wordStatesRef.current) {
        let newX = word.x
        let newY = word.y

        if (!word.mastered && !word.dissolving) {
          newY += Math.sin(word.drift) * 0.008

          if (physicsActive) {
            let repelX = 0
            let repelY = 0

            for (const other of wordStatesRef.current) {
              if (other.id === word.id || other.mastered || other.dissolving) continue
              const dx = newX - other.x
              const dy = newY - other.y
              const distX = Math.abs(dx)
              const distY = Math.abs(dy)

              if (distX < minDistX && distY < minDistY) {
                const overlapX = minDistX - distX
                const overlapY = minDistY - distY
                if (distX > 0.1) repelX += (dx > 0 ? 1 : -1) * overlapX * 0.1
                if (distY > 0.1) repelY += (dy > 0 ? 1 : -1) * overlapY * 0.1
              }
            }

            newX += repelX
            newY += repelY
          }

          const bounds = getDriftBounds(word.layout, word.laneColumn, word.x)
          word.x = clamp(newX, bounds.minX, bounds.maxX)
          word.y = clamp(newY, bounds.minY, bounds.maxY)
          word.drift += 0.003
        }

        word.waveOffset *= 0.92
        for (const wave of wavesRef.current) {
          const timeElapsed = now - wave.spawnTime
          const radius = (timeElapsed / 1000) * WAVE_SPEED_PX_PER_SECOND / containerWidth * 100
          const dx = word.x - wave.x
          const dy = word.y - wave.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const frontDelta = Math.abs(distance - radius)
          if (frontDelta < WAVE_THICKNESS_PERCENT) {
            const falloff = 1 - frontDelta / WAVE_THICKNESS_PERCENT
            word.waveOffset += WAVE_MAX_OFFSET * falloff * falloff
          }
        }
        word.waveOffset = clamp(word.waveOffset, 0, WAVE_MAX_OFFSET)

        const el = wordElementsRef.current.get(word.id)
        if (el) {
          el.style.left = `${word.x}%`
          el.style.top = `${word.y}%`
          el.style.transform = `translate(-50%, -50%) translateY(${Math.sin(word.drift) * 8 - word.waveOffset}px)`
        }
      }

      let nextParticles = particlesRef.current
      let particlesChanged = false
      nextParticles = nextParticles.filter((particle) => {
        if (particle.permanent) {
          particle.y -= particle.speed
          particle.x += Math.sin(particle.phase) * 0.015
          particle.phase += 0.015
          if (particle.y < -5) {
            particle.y = 105
            particle.x = Math.random() * 100
          }
        } else {
          const age = now - particle.bornAt
          const life = clamp(age / particle.duration, 0, 1)
          particle.y -= particle.speed
          particle.x += Math.sin(particle.phase + life * Math.PI) * 0.05
          particle.opacity = (1 - life) * 0.7
          particle.phase += 0.04
          particlesChanged = true
          if (life >= 1) return false
        }

        const el = particleElementsRef.current.get(particle.id)
        if (el) {
          el.style.left = `${particle.x}%`
          el.style.top = `${particle.y}%`
          el.style.opacity = String(particle.opacity)
        }
        return true
      })

      if (particlesChanged && nextParticles.length !== particlesRef.current.length) {
        syncParticles(nextParticles)
      } else {
        particlesRef.current = nextParticles
      }

      if (breathPhaseRef.current % 3 === 0) {
        setBreathPhase(breathPhaseRef.current)
      }

      frameRef.current = requestAnimationFrame(loop)
    }

    frameRef.current = requestAnimationFrame(loop)
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [sessionComplete, syncParticles])

  useEffect(() => () => {
    for (const timer of timersRef.current) window.clearTimeout(timer)
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current)
    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(() => {})
    }
  }, [])

  const handleBackgroundClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement
    if (!worldRef.current || target.closest('button, [data-toolbar], .zen-word-inner')) return

    const rect = worldRef.current.getBoundingClientRect()
    const xPx = event.clientX - rect.left
    const yPx = event.clientY - rect.top
    const x = (xPx / rect.width) * 100
    const y = (yPx / rect.height) * 100
    const ripple = { id: Math.random(), x: xPx, y: yPx }

    setRipples((prev) => [...prev, ripple])
    wavesRef.current.push({ x, y, spawnTime: performance.now() })
    playSound('ripple')

    const timer = window.setTimeout(() => {
      setRipples((prev) => prev.filter((item) => item.id !== ripple.id))
    }, 1500)
    timersRef.current.push(timer)
  }

  const handleSelectWord = (state: ZenWordState, event: ReactMouseEvent) => {
    event.stopPropagation()
    if (state.dissolving || sessionComplete) return
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
    spawnDissolveParticles(target.x, target.y)
    target.dissolving = true
    target.mastered = true
    onPass(target.id)
    setRevealedId(null)
    setRenderWords([...wordStatesRef.current])

    const timer = window.setTimeout(() => {
      target.dissolving = false
      setRenderWords([...wordStatesRef.current])
    }, 700)
    timersRef.current.push(timer)
  }

  const handleFail = () => {
    const target = revealedId ? wordStatesRef.current.find((word) => word.id === revealedId) : null
    if (!target) return
    playSound('fail')
    target.dissolving = true
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
      target.waveOffset = 0
      target.dissolving = false
      setRenderWords([...wordStatesRef.current])
    }, 800)
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]">
        <ZenStyle />
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl zen-living-gradient font-light tracking-widest mb-4 animate-pulse">
            Void Clear
          </h1>
          <button
            onClick={onContinue}
            className="mt-8 px-8 py-3 text-[#666] border border-[#222] hover:text-[#999] hover:border-[#333] rounded font-light tracking-widest"
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
      className="zen-void-container fixed inset-0 z-40 bg-[#0a0a0a] overflow-y-auto md:overflow-hidden font-void text-gray-400 select-none cursor-pointer"
    >
      <ZenStyle />
      <div ref={worldRef} className="relative min-h-[150vh] md:min-h-full md:h-full overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={noiseStyle} />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 md:w-96 md:h-96 rounded-full border border-[#222]/50 pointer-events-none animate-void-breathe"
          style={{ transform: `translate(-50%, -50%) scale(${breathScale})` }}
        />

        <div className="pointer-events-none absolute inset-0 z-0">
          {particles.map((particle) => (
            <div
              key={particle.id}
              ref={(node) => setParticleElement(particle.id, node)}
              className="absolute rounded-full bg-[#333]"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                opacity: particle.opacity,
              }}
            />
          ))}
        </div>

        <div className="pointer-events-none absolute inset-0 z-20">
          {ripples.map((ripple) => (
            <div
              key={ripple.id}
              className="zen-ripple"
              style={{
                left: `${ripple.x - 50}px`,
                top: `${ripple.y - 50}px`,
                width: '100px',
                height: '100px',
              }}
            />
          ))}
        </div>

        <Toolbar
          activeMode={activeMode}
          showImages={showImages}
          direction={direction}
          autoReveal={autoReveal}
          languagePair={languagePair}
          currentPage={currentPage}
          totalPages={totalPages}
          masteredCount={masteredCount}
          totalWords={words.length}
          progressOpacity={progressOpacity}
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
            const isActive = state.id === revealedId
            const innerClassName = [
              'zen-word-inner transition-[opacity,transform,filter] duration-700',
              state.dissolving ? 'opacity-0 scale-75' : 'opacity-100 scale-100',
              state.mastered && !state.dissolving ? 'zen-card-mastered' : '',
              isActive && !state.mastered ? 'zen-card-active' : 'zen-card-unmastered',
            ].join(' ')

            return (
              <div
                key={state.id}
                ref={(node) => setWordElement(state.id, node)}
                className="absolute"
                style={{
                  left: `${state.x}%`,
                  top: `${state.y}%`,
                  transform: `translate(-50%, -50%) translateY(${Math.sin(state.drift) * 8 - state.waveOffset}px)`,
                }}
              >
                <button
                  type="button"
                  onClick={(event) => handleSelectWord(state, event)}
                  onMouseEnter={() => playSound('hover')}
                  className={innerClassName}
                  style={{ '--zen-hue': HUES[state.hue] } as CSSProperties}
                >
                  {showImageCard ? (
                    <img
                      src={imageUrl}
                      alt={text}
                      onError={() => handleImageError(state.id)}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-lg object-cover opacity-80 hover:opacity-100 transition-opacity"
                      style={{
                        boxShadow: '0 2px 12px rgba(10, 10, 10, 0.4), 0 0 20px rgba(255, 255, 255, 0.04)',
                      }}
                    />
                  ) : (
                    <span className={`zen-card-text ${phraseClassName(text)}`}>
                      {text}
                    </span>
                  )}
                </button>
              </div>
            )
          })}
        </div>

        {words.length === 0 && (
          <p className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 text-[#444] font-light tracking-widest">
            No words
          </p>
        )}

        {selectedState && (
          <RevealModal
            state={selectedState}
            learning={selectedLearning}
            imageUrl={selectedImage}
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
  activeMode: CanvasMode
  showImages: boolean
  direction: CanvasModeProps['direction']
  autoReveal: CanvasModeProps['autoReveal']
  languagePair: CanvasModeProps['languagePair']
  currentPage: number
  totalPages: number
  masteredCount: number
  totalWords: number
  progressOpacity: number
  onSwitchMode: (mode: CanvasMode) => void
  onToggleImages: () => void
  onToggleDirection: () => void
  onToggleAutoReveal: () => void
  onPrevPage: () => void
  onNextPage: () => void
  onExit: () => void
}

function Toolbar({
  activeMode,
  showImages,
  direction,
  autoReveal,
  languagePair,
  currentPage,
  totalPages,
  masteredCount,
  totalWords,
  progressOpacity,
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
  const canToggleDirection = !!languagePair.target && !!languagePair.base && !languagePair.isSameLanguage

  return (
    <div data-toolbar className="sticky top-0 md:absolute md:top-0 left-0 right-0 z-40 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0a0a0a]/40">
      <button
        onClick={(event) => {
          event.stopPropagation()
          onExit()
        }}
        className="h-9 px-3 text-xs uppercase tracking-widest text-white/50 hover:text-white/80 border border-white/20 hover:border-white/40 bg-[#0a0a0a]/60 rounded"
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
            className={`h-9 px-3 text-xs uppercase tracking-widest border bg-[#0a0a0a]/60 rounded transition-colors ${
              mode === activeMode
                ? 'text-white/80 border-white/40 cursor-default'
                : 'text-white/30 border-white/10 hover:text-white/80 hover:border-white/40'
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
            className="h-9 px-3 text-xs uppercase tracking-widest text-white/50 hover:text-white/80 border border-white/20 hover:border-white/40 bg-[#0a0a0a]/60 rounded"
            title="Swap prompt and answer"
          >
            <span className="text-white/80">{visibleCode}</span>
            <span className="mx-1 text-white/30">→</span>
            <span>{hiddenCode}</span>
          </button>
        )}

        <label
          className="h-9 px-3 inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/50 hover:text-white/80 border border-white/20 hover:border-white/40 bg-[#0a0a0a]/60 rounded cursor-pointer"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={autoReveal === 'off'}
            onChange={onToggleAutoReveal}
            className="accent-[#777]"
          />
          Hide answer
        </label>

        <button
          onClick={(event) => {
            event.stopPropagation()
            onToggleImages()
          }}
          className="h-9 px-3 text-xs uppercase tracking-widest text-white/50 hover:text-white/80 border border-white/20 hover:border-white/40 bg-[#0a0a0a]/60 rounded"
          title={showImages ? 'Show text' : 'Show images'}
        >
          {showImages ? 'Aa' : 'Img'}
        </button>

        <span
          className="px-2 text-sm text-[#555] font-light tracking-wider whitespace-nowrap animate-void-breathe-text"
          style={{ opacity: progressOpacity }}
        >
          {masteredCount}/{totalWords}
        </span>

        {totalPages > 1 && (
          <>
            <span className="px-2 text-[#555] text-sm font-light tracking-wider whitespace-nowrap">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={(event) => {
                event.stopPropagation()
                onPrevPage()
              }}
              disabled={currentPage === 0}
              className="w-9 h-9 text-white/50 hover:text-white/80 border border-white/20 hover:border-white/40 bg-[#0a0a0a]/60 rounded disabled:opacity-30 disabled:cursor-not-allowed"
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
              className="w-9 h-9 text-white/50 hover:text-white/80 border border-white/20 hover:border-white/40 bg-[#0a0a0a]/60 rounded disabled:opacity-30 disabled:cursor-not-allowed"
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
  state: ZenWordState
  learning: ReturnType<typeof resolveCardLearningMetadata> | null
  imageUrl: string | null
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
  const definition = getDefinition(word)
  const usage = learning?.usageExample
  const hasRichData = !!learning?.mnemonic || !!learning?.etymology || !!usage
  const [answerRevealed, setAnswerRevealed] = useState(autoReveal === 'on')
  const canGrade = autoReveal === 'on' || answerRevealed

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
      <div className="absolute inset-0 bg-[#0a0a0a]/95" />
      <div
        className="relative flex flex-col max-w-lg w-full mx-auto max-h-[85vh] bg-[#080808] border border-[#222] rounded-lg overflow-hidden zen-modal-enter"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 z-20 text-[#333] hover:text-[#666] bg-[#111] border border-[#222] rounded-full w-10 h-10 flex items-center justify-center text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="flex-1 overflow-y-auto overscroll-contain p-6 md:p-10 pt-12 text-center" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="text-[#666] text-base tracking-wide mb-2">
            {promptFace}
          </div>

          <div
            className={!canGrade ? 'zen-answer-guard zen-answer-blurred' : 'zen-answer-guard'}
            onClick={revealAnswer}
          >
            <div className="zen-answer-content">
              <button
                type="button"
                onClick={canGrade ? onSpeak : revealAnswer}
                className="text-3xl md:text-4xl lg:text-5xl zen-living-gradient tracking-wider font-light bg-transparent border-none mb-3"
              >
                {answerFace}
              </button>

              {phonetic && (
                <p className="text-[#555] text-sm tracking-widest font-sans mb-6">
                  {phonetic}
                </p>
              )}

              {definition && (
                <p className="text-lg md:text-xl lg:text-2xl text-[#777] mb-6 leading-relaxed font-light">
                  {definition}
                </p>
              )}
            </div>
          </div>

          {imageUrl && (
            <div className="mb-6 flex justify-center">
              <img
                src={imageUrl}
                alt={word.word}
                onError={onImageError}
                className="max-w-[140px] max-h-[140px] md:max-w-[160px] md:max-h-[160px] rounded-lg object-cover opacity-80 hover:opacity-100 transition-opacity"
                style={{
                  boxShadow: '0 2px 12px rgba(10, 10, 10, 0.4), 0 0 20px rgba(255, 255, 255, 0.04)',
                }}
              />
            </div>
          )}

          {hasRichData && (
            <div
              className={!canGrade ? 'zen-answer-guard zen-answer-blurred mt-6 text-left' : 'zen-answer-guard mt-6 text-left'}
              onClick={revealAnswer}
            >
              <div className="zen-answer-content">
              {learning?.mnemonic && (
                <div className="border-t border-[#222] pt-4">
                  <div className="bg-[#111] border border-[#222] rounded-lg p-4">
                    <p className="text-[10px] tracking-[0.2em] text-[#666] uppercase mb-2">
                      Mnemonic
                    </p>
                    <p className="text-base text-[#888] leading-relaxed">
                      {learning.mnemonic}
                    </p>
                  </div>
                </div>
              )}

              {learning?.etymology && (
                <div className="border-t border-[#222] pt-4 mt-4">
                  <p className="text-[10px] tracking-[0.2em] text-[#555] uppercase mb-2">
                    Etymology
                  </p>
                  <p className="text-base italic text-[#777] leading-relaxed">
                    {learning.etymology}
                  </p>
                </div>
              )}

              {usage && (
                <div className="border-t border-[#222] pt-4 mt-4">
                  <p className="text-[10px] tracking-[0.2em] text-[#555] uppercase mb-2">
                    Usage
                  </p>
                  {usage.target && (
                    <p className="text-lg italic text-[#888] leading-relaxed">
                      {usage.target}
                    </p>
                  )}
                  {usage.base && (
                    <p className="text-base italic text-[#777] leading-relaxed mt-1">
                      {usage.base}
                    </p>
                  )}
                </div>
              )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent p-4 grid grid-cols-2 gap-3">
          <button
            onClick={onFail}
            disabled={!canGrade}
            className={`group h-12 rounded bg-[#111] border border-[#222] text-[#444] hover:text-[#666] hover:border-[#333] transition-colors ${!canGrade ? 'opacity-35 pointer-events-none' : ''}`}
            aria-label="Review later"
          >
            <span className="text-2xl opacity-60 group-hover:opacity-90">✗</span>
          </button>
          <button
            onClick={onPass}
            disabled={!canGrade}
            className={`group h-12 rounded bg-[#111] border border-[#333] text-[#666] hover:text-[#999] hover:border-[#444] transition-colors ${!canGrade ? 'opacity-35 pointer-events-none' : ''}`}
            aria-label="Remembered"
          >
            <span className="text-2xl opacity-70 group-hover:opacity-100">✓</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function ZenStyle() {
  return (
    <style>
      {`
        .font-void {
          font-family: "Space Grotesk", system-ui, sans-serif;
        }

        .zen-living-gradient {
          background: linear-gradient(90deg, #444 0%, #666 25%, #888 50%, #666 75%, #444 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: living-gradient 4s ease-in-out infinite;
        }

        .zen-word-inner {
          background: transparent;
          border: 0;
          padding: 0;
          cursor: pointer;
        }

        .zen-card-text {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          box-shadow: 0 2px 12px rgba(10, 10, 10, 0.15);
          font-size: clamp(0.85rem, 3.5vw, 1.3rem);
          line-height: 1.3;
          min-height: 44px;
          min-width: 60px;
          text-align: center;
          font-weight: 300;
          color: rgba(180, 180, 180, 0.7);
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.1);
        }

        .zen-card-unmastered .zen-card-text {
          box-shadow:
            0 2px 12px rgba(10, 10, 10, 0.15),
            inset 0 0 24px var(--zen-hue);
        }

        .zen-card-unmastered:hover .zen-card-text {
          color: rgba(220, 220, 220, 0.9);
          background: rgba(255, 255, 255, 0.08);
        }

        .zen-card-active .zen-card-text {
          color: rgba(230, 230, 230, 0.95);
          background: linear-gradient(135deg, rgba(100,100,100,0.2), rgba(80,80,80,0.15));
          animation: zen-gradient-shift 4s ease-in-out infinite;
        }

        .zen-card-mastered .zen-card-text {
          color: rgba(255, 255, 255, 0.95);
          background: rgba(255, 255, 255, 0.12);
          animation: zen-mastered-pulse 3s ease-in-out infinite;
        }

        .zen-ripple {
          position: absolute;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(80, 80, 80, 0.15) 0%, transparent 70%);
          pointer-events: none;
          animation: zen-ripple-expand 1.5s ease-out forwards;
        }

        .zen-modal-enter {
          animation: zen-modal-scale 160ms ease-out;
        }

        .zen-answer-guard {
          position: relative;
          transition: transform 200ms ease, box-shadow 200ms ease;
        }

        .zen-answer-blurred {
          cursor: pointer;
        }

        .zen-answer-blurred:hover {
          transform: scale(1.02);
          box-shadow: 0 0 18px rgba(160, 160, 160, 0.14);
        }

        .zen-answer-blurred .zen-answer-content {
          filter: blur(8px);
          user-select: none;
          pointer-events: none;
        }

        .zen-answer-blurred::after {
          content: "";
          position: absolute;
          inset: -0.35rem;
          border-radius: 8px;
          border: 1px solid rgba(120, 120, 120, 0.18);
          background: rgba(0, 0, 0, 0.15);
          pointer-events: none;
        }

        @keyframes void-breathe {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.5; }
        }

        .animate-void-breathe {
          animation: void-breathe 4s ease-in-out infinite;
        }

        @keyframes void-breathe-text {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        .animate-void-breathe-text {
          animation: void-breathe-text 4s ease-in-out infinite;
        }

        @keyframes living-gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes zen-ripple-expand {
          0% { transform: scale(0); opacity: 0.6; }
          100% { transform: scale(5); opacity: 0; }
        }

        @keyframes zen-gradient-shift {
          0%, 100% {
            filter: brightness(1);
            box-shadow: 0 2px 12px rgba(10, 10, 10, 0.15);
          }
          50% {
            filter: brightness(1.15);
            box-shadow: 0 2px 16px rgba(255, 255, 255, 0.12);
          }
        }

        @keyframes zen-mastered-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.3); }
          50% { box-shadow: 0 0 35px rgba(255, 255, 255, 0.5); }
        }

        @keyframes zen-modal-scale {
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
          .zen-card-text {
            max-width: min(180px, 50vw);
            font-size: 0.95rem;
            padding: 0.5rem 0.8rem;
            line-height: 1.3;
            min-height: 44px;
          }
        }

        @media (max-width: 400px) {
          .zen-card-text {
            max-width: min(160px, 45vw);
            font-size: 0.9rem;
            padding: 0.4rem 0.7rem;
          }
        }
      `}
    </style>
  )
}
