import { useRef, useEffect } from 'react'

interface OrbVisualizerProps {
  thumbnailUrl: string | null
  word: string
  isPlaying: boolean
  audioRef: React.RefObject<HTMLAudioElement | null>
  size?: number
}

const BAR_COUNT = 100
const MAX_BAR_LEN = 50

// Seeded PRNG — same algorithm as SimulatedWaveform
function makeRng(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  }
  return () => {
    h |= 0
    h = (h + 0x6d2b79f5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function OrbVisualizer({
  thumbnailUrl,
  word,
  isPlaying,
  audioRef,
  size = 300,
}: OrbVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>(0)
  const timeRef = useRef(0)
  // Current animated heights (lerped toward target)
  const currentHeightsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT))
  // Base heights from PRNG, keyed to the word seed
  const baseHeightsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT))
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const visualizerModeRef = useRef<'realtime' | 'simulated'>('simulated')
  const freqDataRef = useRef<Uint8Array>(new Uint8Array(0))

  // Regenerate base heights when word changes
  useEffect(() => {
    const rng = makeRng(word || 'default')
    for (let i = 0; i < BAR_COUNT; i++) {
      baseHeightsRef.current[i] = Math.max(0.05, Math.min(1, rng() * 0.7 + rng() * 0.3))
    }
  }, [word])

  // Attempt real-time audio setup on mount
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    try {
      const ctx = new AudioContext()
      const source = ctx.createMediaElementSource(audio)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyser.connect(ctx.destination)
      freqDataRef.current = new Uint8Array(analyser.frequencyBinCount)
      analyserRef.current = analyser
      audioCtxRef.current = ctx
      visualizerModeRef.current = 'realtime'
    } catch {
      // CORS or already-connected — stay in simulated mode
      visualizerModeRef.current = 'simulated'
    }

    return () => {
      audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
      analyserRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const totalSize = size + MAX_BAR_LEN * 2
    const orbRadius = size / 2

    function draw() {
      const ctx = canvas!.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      if (canvas!.width !== totalSize * dpr) {
        canvas!.width = totalSize * dpr
        canvas!.height = totalSize * dpr
        ctx.scale(dpr, dpr)
      }

      ctx.clearRect(0, 0, totalSize, totalSize)

      const cx = totalSize / 2
      const cy = totalSize / 2

      timeRef.current += 0.016 // ~60fps

      for (let i = 0; i < BAR_COUNT; i++) {
        let targetHeight: number

        if (visualizerModeRef.current === 'realtime' && analyserRef.current) {
          analyserRef.current.getByteFrequencyData(freqDataRef.current)
          const binIndex = Math.floor((i / BAR_COUNT) * freqDataRef.current.length)
          targetHeight = (freqDataRef.current[binIndex] / 255) * MAX_BAR_LEN
        } else if (isPlaying) {
          const base = baseHeightsRef.current[i]
          const wave = 0.5 + 0.5 * Math.sin(timeRef.current * 1.8 + i * 0.2)
          targetHeight = base * wave * MAX_BAR_LEN
        } else {
          // Paused — settle to low
          targetHeight = baseHeightsRef.current[i] * 0.12 * MAX_BAR_LEN
        }

        // Lerp toward target
        const lerpSpeed = isPlaying ? 0.15 : 0.06
        currentHeightsRef.current[i] +=
          (targetHeight - currentHeightsRef.current[i]) * lerpSpeed

        const h = currentHeightsRef.current[i]
        const angle = (i / BAR_COUNT) * 2 * Math.PI - Math.PI / 2
        const x1 = cx + orbRadius * Math.cos(angle)
        const y1 = cy + orbRadius * Math.sin(angle)
        const x2 = cx + (orbRadius + h) * Math.cos(angle)
        const y2 = cy + (orbRadius + h) * Math.sin(angle)

        const opacity = 0.4 + 0.6 * (h / MAX_BAR_LEN)
        ctx.strokeStyle = `rgba(94, 106, 210, ${opacity})`
        ctx.lineWidth = 2.5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isPlaying, size])

  const totalSize = size + MAX_BAR_LEN * 2

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: totalSize, height: totalSize }}
    >
      {/* Visualizer canvas — behind the orb */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: totalSize, height: totalSize }}
      />

      {/* Central orb */}
      <div
        className="absolute rounded-full overflow-hidden border border-white/20 z-10"
        style={{
          width: size,
          height: size,
          boxShadow:
            '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15), 0 0 60px rgba(94,106,210,0.15)',
          animation: isPlaying ? 'orbBreath 3s ease-in-out infinite' : 'none',
        }}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={word}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(94,106,210,0.3) 0%, rgba(20,24,34,0.9) 100%)',
            }}
          >
            <span className="text-white/60 font-light text-center px-4 text-sm leading-tight">
              {word}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes orbBreath {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  )
}
