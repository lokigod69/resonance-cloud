import { useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

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
  const currentHeightsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT))
  const baseHeightsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT))
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const visualizerModeRef = useRef<'realtime' | 'simulated'>('simulated')
  const freqDataRef = useRef<Uint8Array<ArrayBuffer>>(new Uint8Array(0))

  // Regenerate base heights when word changes
  useEffect(() => {
    const rng = makeRng(word || 'default')
    for (let i = 0; i < BAR_COUNT; i++) {
      baseHeightsRef.current[i] = Math.max(0.05, Math.min(1, rng() * 0.7 + rng() * 0.3))
    }
  }, [word])

  // Set up Web Audio API once on mount — lives for the full page lifetime.
  // OrbVisualizer must NOT be keyed on track ID or this setup breaks on every track change.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    // Resume suspended AudioContext on user-initiated play (Chrome autoplay policy)
    const resumeCtx = () => {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
    }
    audio.addEventListener('play', resumeCtx)

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
      audio.removeEventListener('play', resumeCtx)
      audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
      analyserRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Animation loop — re-runs only when isPlaying or size changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const totalSize = size + MAX_BAR_LEN * 2
    const orbRadius = size / 2

    function draw() {
      const ctx = canvas!.getContext('2d')
      if (!ctx) return

      const dpr = window.devicePixelRatio || 1
      const physW = Math.round(totalSize * dpr)

      // Resize only when needed (avoids resetting ctx state every frame)
      if (canvas!.width !== physW || canvas!.height !== physW) {
        canvas!.width = physW
        canvas!.height = physW
      }

      // Always re-apply the DPR transform — ctx.scale() accumulates,
      // setTransform() replaces, so this is safe to call every frame.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, totalSize, totalSize)

      const cx = totalSize / 2
      const cy = totalSize / 2
      timeRef.current += 0.016

      // Sample frequency data once per frame, not per bar.
      // Fall back to simulated if context is suspended or CORS blocks analysis.
      let hasRealtimeSignal = false
      if (visualizerModeRef.current === 'realtime' && analyserRef.current) {
        analyserRef.current.getByteFrequencyData(freqDataRef.current)
        hasRealtimeSignal = freqDataRef.current.some(v => v > 0)
      }

      for (let i = 0; i < BAR_COUNT; i++) {
        let targetHeight: number

        if (hasRealtimeSignal) {
          const binIndex = Math.floor((i / BAR_COUNT) * freqDataRef.current.length)
          targetHeight = (freqDataRef.current[binIndex] / 255) * MAX_BAR_LEN
        } else if (isPlaying) {
          const base = baseHeightsRef.current[i]
          const wave = 0.5 + 0.5 * Math.sin(timeRef.current * 1.8 + i * 0.2)
          targetHeight = base * wave * MAX_BAR_LEN
        } else {
          targetHeight = baseHeightsRef.current[i] * 0.12 * MAX_BAR_LEN
        }

        // Exponential smoothing toward target
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
        {/* Thumbnail crossfades inside the orb when track changes */}
        <AnimatePresence mode="wait">
          {thumbnailUrl ? (
            <motion.img
              key={thumbnailUrl}
              src={thumbnailUrl}
              alt={word}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          ) : (
            <motion.div
              key={`fallback-${word}`}
              className="absolute inset-0 w-full h-full flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(135deg, rgba(94,106,210,0.3) 0%, rgba(20,24,34,0.9) 100%)',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-white/60 font-light text-center px-4 text-sm leading-tight">
                {word}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
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
