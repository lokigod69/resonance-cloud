import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { resolveCardLearningMetadata, type WordLike } from '@/lib/wordDisplayMetadata'
import { CANVAS_MODES, type CanvasMode, type CanvasModeProps } from './types'

type EmberWordState = {
  id: string
  x: number
  y: number
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
const HUE_COLORS = [
  'rgba(255, 160, 100, 0.85)',
  'rgba(255, 190, 120, 0.85)',
  'rgba(255, 130, 100, 0.85)',
  'rgba(255, 200, 140, 0.85)',
  'rgba(255, 145, 85, 0.85)',
]

function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 768
}

function getBounds() {
  const isMobile = isMobileViewport()
  return {
    minX: isMobile ? 18 : 12,
    maxX: isMobile ? 82 : 88,
    minY: isMobile ? 12 : 10,
    maxY: isMobile ? 82 : 85,
    spacingX: isMobile ? 22 : 18,
    spacingY: isMobile ? 14 : 12,
    minDistX: isMobile ? 20 : 16,
    minDistY: isMobile ? 12 : 10,
  }
}

function generateNonOverlappingPositions(
  count: number,
  existingPositions: Array<{ x: number; y: number }> = [],
) {
  const positions: Array<{ x: number; y: number }> = []
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
  existingStates: EmberWordState[] = [],
) {
  const existingById = new Map(existingStates.map((state) => [state.id, state]))
  const positions = generateNonOverlappingPositions(words.length)

  return words.map((word, index) => {
    const existing = existingById.get(word.id)
    return {
      id: word.id,
      x: existing?.x ?? positions[index]?.x ?? 50,
      y: existing?.y ?? positions[index]?.y ?? 50,
      drift: existing?.drift ?? Math.random() * Math.PI * 2,
      hue: existing?.hue ?? index % HUE_COLORS.length,
      mastered: existing?.mastered ?? false,
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

// Phrase rule: single short headwords stay tight and nowrap; phrases or long tokens
// wrap on word boundaries in a wider warm card so compound vocabulary stays readable.
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

export default function EmberCanvas({
  words,
  showImages,
  sessionComplete,
  currentPage,
  totalPages,
  activeMode,
  onPass,
  onFail,
  onPrevPage,
  onNextPage,
  onSwitchMode,
  onToggleImages,
  onExit,
  onContinue,
}: CanvasModeProps) {
  const [renderWords, setRenderWords] = useState<EmberWordState[]>(() => createWordStates(words, new Set()))
  const [particles, setParticles] = useState<EmberParticle[]>(
    () => Array.from({ length: INITIAL_EMBER_COUNT }, () => createParticle()),
  )
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [imageFailures, setImageFailures] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement | null>(null)
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
        osc.type = 'sine'
        osc.frequency.setValueAtTime(220, ctx.currentTime)
        gain.gain.setValueAtTime(0.08, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 0.1)
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
    wordStatesRef.current = createWordStates(words, imageFailures, wordStatesRef.current)
    physicsFrameRef.current = 0

    const timer = window.setTimeout(() => {
      setRevealedId((current) => words.some((word) => word.id === current) ? current : null)
      setRenderWords([...wordStatesRef.current])
    }, 0)

    return () => window.clearTimeout(timer)
  }, [imageFailures, words])

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
      const { minX, maxX, minY, maxY, minDistX, minDistY } = getBounds()
      physicsFrameRef.current += 1
      const physicsActive = physicsFrameRef.current <= PHYSICS_FRAMES

      for (const word of wordStatesRef.current) {
        if (word.mastered || word.burning) {
          const el = wordElementsRef.current.get(word.id)
          if (el) {
            el.style.left = `${word.x}%`
            el.style.top = `${word.y}%`
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

        word.x = clamp(newX, minX, maxX)
        word.y = clamp(newY, minY, maxY)
        word.drift += 0.005

        const el = wordElementsRef.current.get(word.id)
        if (el) {
          el.style.left = `${word.x}%`
          el.style.top = `${word.y}%`
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
  }, [sessionComplete])

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
      const [position] = generateNonOverlappingPositions(1, others)
      target.x = position?.x ?? target.x
      target.y = position?.y ?? target.y
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
      className="fixed inset-0 z-40 bg-[#050505] overflow-y-auto md:overflow-hidden font-ember text-gray-300 cursor-crosshair select-none"
    >
      <EmberStyle />
      <div className="relative min-h-[150vh] md:h-full overflow-hidden">
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
          activeMode={activeMode}
          showImages={showImages}
          currentPage={currentPage}
          totalPages={totalPages}
          onSwitchMode={onSwitchMode}
          onToggleImages={onToggleImages}
          onPrevPage={onPrevPage}
          onNextPage={onNextPage}
          onExit={onExit}
        />

        <div className="absolute inset-0 z-10">
          {renderWords.map((state) => {
            const imageUrl = !state.imageFailed ? getImageUrl(state.word) : null
            const showImageCard = showImages && !!imageUrl
            const text = state.word.word
            const innerClassName = [
              'ember-word-inner transition-[opacity,transform,filter] duration-1000',
              state.burning ? 'opacity-0 scale-150 blur-md' : 'opacity-100 scale-100 blur-0',
              state.mastered ? 'ember-card-mastered' : 'ember-card-unmastered',
            ].join(' ')

            return (
              <div
                key={state.id}
                ref={(node) => setWordElement(state.id, node)}
                className="absolute"
                style={{
                  left: `${state.x}%`,
                  top: `${state.y}%`,
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
            onClose={() => setRevealedId(null)}
            onImageError={() => handleImageError(selectedState.id)}
            onSpeak={() => speakHeadword(selectedState.word)}
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
  currentPage: number
  totalPages: number
  onSwitchMode: (mode: CanvasMode) => void
  onToggleImages: () => void
  onPrevPage: () => void
  onNextPage: () => void
  onExit: () => void
}

function Toolbar({
  activeMode,
  showImages,
  currentPage,
  totalPages,
  onSwitchMode,
  onToggleImages,
  onPrevPage,
  onNextPage,
  onExit,
}: ToolbarProps) {
  return (
    <div data-toolbar className="sticky top-0 md:absolute md:top-0 left-0 right-0 z-40 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-black/40 border-b border-orange-900/30">
      <button
        onClick={(event) => {
          event.stopPropagation()
          onExit()
        }}
        className="h-9 px-3 text-xs uppercase tracking-widest text-orange-900 hover:text-orange-500 border border-orange-900/30 hover:border-orange-500 bg-black/50 rounded"
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

      <div className="flex items-center gap-2">
        <button
          onClick={(event) => {
            event.stopPropagation()
            onToggleImages()
          }}
          className="h-9 px-3 text-xs uppercase tracking-widest text-orange-900 hover:text-orange-500 border border-orange-900/30 hover:border-orange-500 bg-black/50 rounded"
          title={showImages ? 'Show text' : 'Show images'}
        >
          {showImages ? 'Aa' : 'Img'}
        </button>

        {totalPages > 1 && (
          <>
            <span className="px-2 text-xs text-orange-500/60 tracking-widest whitespace-nowrap">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={(event) => {
                event.stopPropagation()
                onPrevPage()
              }}
              disabled={currentPage === 0}
              className="w-9 h-9 text-orange-900 hover:text-orange-500 border border-orange-900/30 hover:border-orange-500 bg-black/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
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
              className="w-9 h-9 text-orange-900 hover:text-orange-500 border border-orange-900/30 hover:border-orange-500 bg-black/50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
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
  state: EmberWordState
  learning: ReturnType<typeof resolveCardLearningMetadata> | null
  imageUrl: string | null
  onClose: () => void
  onImageError: () => void
  onSpeak: () => void
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
  onPass,
  onFail,
}: RevealModalProps) {
  const word = state.word
  const ipa = getStringField(word, ['ipa', 'phonetic', 'pronunciation'])
  const definition = getDefinition(word)
  const usage = learning?.usageExample
  const hasRichData = !!learning?.mnemonic || !!learning?.etymology || !!usage

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
        className="relative flex flex-col max-w-lg w-full mx-auto max-h-[85vh] ember-modal-enter"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 z-20 text-gray-600 cursor-pointer hover:text-white bg-black/80 border border-orange-900/30 rounded-full w-10 h-10 flex items-center justify-center text-xl"
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>

        <div className="overflow-y-auto overscroll-contain rounded-xl" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="bg-gradient-to-b from-[#121212] to-black border border-orange-900/40 p-6 md:p-10 pt-12 rounded-xl text-center shadow-[0_0_100px_rgba(255,69,0,0.15)]">
            {word.translation && (
              <div className="text-orange-500 text-lg font-serif mb-2 text-center">
                {word.translation}
              </div>
            )}

            <button
              type="button"
              onClick={onSpeak}
              className="text-4xl md:text-5xl lg:text-6xl text-orange-100 font-ember tracking-wider drop-shadow-[0_0_15px_rgba(255,100,0,0.4)] cursor-pointer hover:scale-105 transition-transform bg-transparent border-none mb-3"
            >
              {word.word}
            </button>

            {ipa && (
              <p className="text-orange-500/50 text-sm mb-6 font-sans tracking-widest text-center">
                /{ipa}/
              </p>
            )}

            {definition && (
              <p className="text-xl md:text-2xl text-gray-200 mb-6 leading-relaxed font-light font-ember">
                {definition}
              </p>
            )}

            {imageUrl && (
              <div className="mb-6 flex justify-center">
                <img
                  src={imageUrl}
                  alt={word.word}
                  onError={onImageError}
                  className="max-w-[140px] max-h-[140px] md:max-w-[160px] md:max-h-[160px] rounded-lg border border-orange-900/30 opacity-80 hover:opacity-100 transition-opacity"
                />
              </div>
            )}

            {hasRichData && (
              <div className="mt-6 text-left">
                {learning?.mnemonic && (
                  <div className="border-t border-orange-900/30 pt-4">
                    <p className="text-[10px] tracking-widest text-orange-500 uppercase mb-2">
                      Mnemonic
                    </p>
                    <p className="text-base text-gray-300 font-ember leading-relaxed">
                      {learning.mnemonic}
                    </p>
                  </div>
                )}

                {learning?.etymology && (
                  <div className="border-t border-orange-900/30 pt-4 mt-4">
                    <p className="text-[10px] tracking-widest text-gray-500 uppercase mb-2">
                      Etymology
                    </p>
                    <p className="text-base italic text-gray-400 leading-relaxed">
                      {learning.etymology}
                    </p>
                  </div>
                )}

                {usage && (
                  <div className="border-t border-orange-900/30 pt-4 mt-4">
                    <p className="text-[10px] tracking-[0.2em] text-orange-500/60 uppercase mb-2">
                      Usage
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
            )}

            <div className="mt-6 pt-5 border-t border-orange-900/30 grid grid-cols-2 gap-3">
              <button
                onClick={onFail}
                className="h-12 rounded border bg-orange-900/10 border-orange-600/30 hover:bg-orange-500/20 hover:border-orange-500 text-orange-500 text-2xl drop-shadow-[0_0_8px_rgba(255,69,0,0.6)] hover:drop-shadow-[0_0_12px_rgba(255,69,0,0.8)]"
                aria-label="Review later"
              >
                ✕
              </button>
              <button
                onClick={onPass}
                className="h-12 rounded border bg-yellow-900/10 border-yellow-600/30 hover:bg-yellow-500/20 hover:border-yellow-500 text-yellow-500 text-2xl drop-shadow-[0_0_8px_rgba(255,215,0,0.6)] hover:drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]"
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
