import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Keyboard, Sparkles, Brain } from 'lucide-react'
import { DEMO_WORDS, STEPS } from './landingData'
import DemoReelSection from './DemoReelSection'
import HowItWorksSection from './HowItWorksSection'
import WaveformDivider from './WaveformDivider'

const ICONS = [Keyboard, Sparkles, Brain]
const ROW_1 = DEMO_WORDS.slice(0, 6)
const ROW_2 = DEMO_WORDS.slice(6)

function StaticCardSlot({ w }: { w: typeof DEMO_WORDS[0] }) {
  return (
    <div className="relative w-52 h-72 rounded-xl overflow-hidden shrink-0">
      <img
        src={w.thumbnail}
        alt={w.word}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <p className="text-xs text-white/50">{w.flag} {w.language}</p>
        <p className="text-xl font-bold text-white">{w.word}</p>
        <p className="text-sm text-white/60">{w.translation}</p>
      </div>
    </div>
  )
}

export default function ScrollStorySection() {
  const reducedMotion = useReducedMotion()
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    setIsDesktop(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // All hooks declared unconditionally (Rules of Hooks)
  const containerRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Demo heading + waveform fade out
  const demoHeadingOpacity = useTransform(scrollYProgress, [0.10, 0.25], [1, 0])
  const waveformOpacity = useTransform(scrollYProgress, [0.15, 0.30], [1, 0])

  // Row 1 card dispersal
  const leftRow1X = useTransform(scrollYProgress, [0.15, 0.40], [0, -1200])
  const rightRow1X = useTransform(scrollYProgress, [0.15, 0.40], [0, 1200])
  const row1Opacity = useTransform(scrollYProgress, [0.15, 0.35], [1, 0])

  // Row 2 card dispersal (slightly delayed for stagger effect)
  const leftRow2X = useTransform(scrollYProgress, [0.17, 0.42], [0, -1200])
  const rightRow2X = useTransform(scrollYProgress, [0.17, 0.42], [0, 1200])
  const row2Opacity = useTransform(scrollYProgress, [0.17, 0.37], [1, 0])

  // How It Works heading fade in
  const howHeadingOpacity = useTransform(scrollYProgress, [0.30, 0.45], [0, 1])

  // Step 1: grows from center, moves left
  const step1Scale = useTransform(scrollYProgress, [0.35, 0.55], [0.3, 1])
  const step1Opacity = useTransform(scrollYProgress, [0.35, 0.55], [0, 1])
  const step1X = useTransform(scrollYProgress, [0.35, 0.55], [0, -350])

  // Step 2: grows at center, stays centered
  const step2Scale = useTransform(scrollYProgress, [0.50, 0.70], [0.3, 1])
  const step2Opacity = useTransform(scrollYProgress, [0.50, 0.70], [0, 1])

  // Step 3: grows from center, moves right
  const step3Scale = useTransform(scrollYProgress, [0.65, 0.85], [0.3, 1])
  const step3Opacity = useTransform(scrollYProgress, [0.65, 0.85], [0, 1])
  const step3X = useTransform(scrollYProgress, [0.65, 0.85], [0, 350])

  // Fallback: mobile or reduced motion — render original sections unchanged
  if (!isDesktop || reducedMotion === true) {
    return (
      <>
        <DemoReelSection />
        <HowItWorksSection />
      </>
    )
  }

  const stepAnimations = [
    { scale: step1Scale, opacity: step1Opacity, x: step1X },
    { scale: step2Scale, opacity: step2Opacity },
    { scale: step3Scale, opacity: step3Opacity, x: step3X },
  ]

  return (
    <section
      ref={containerRef}
      style={{ height: '350vh', background: '#0c0d14' }}
    >
      {/* Sticky viewport — stays pinned while container scrolls past */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

        {/* Phase 1: Demo reel layer */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }} className="flex flex-col items-center justify-center gap-2 px-6">

          {/* Demo heading — fades out */}
          <motion.div
            style={{ opacity: demoHeadingOpacity }}
            className="absolute top-16 inset-x-0 text-center px-6"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">See what AI creates</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every word becomes a unique music video. Run it on automatic or choose your own style, genre, and creative direction.
            </p>
          </motion.div>

          {/* Card rows + waveform, centered vertically */}
          <div className="flex flex-col gap-2 mt-20">
            {/* Row 1 */}
            <div className="flex gap-6 justify-center">
              {ROW_1.map((w, i) => (
                <motion.div
                  key={w.word}
                  style={{
                    x: i < 3 ? leftRow1X : rightRow1X,
                    opacity: row1Opacity,
                  }}
                >
                  <StaticCardSlot w={w} />
                </motion.div>
              ))}
            </div>

            {/* Waveform divider — fades out */}
            <motion.div style={{ opacity: waveformOpacity }}>
              <WaveformDivider />
            </motion.div>

            {/* Row 2 */}
            <div className="flex gap-6 justify-center">
              {ROW_2.map((w, i) => (
                <motion.div
                  key={w.word}
                  style={{
                    x: i < 3 ? leftRow2X : rightRow2X,
                    opacity: row2Opacity,
                  }}
                >
                  <StaticCardSlot w={w} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Phase 2: How It Works layer */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>

          {/* "How it works" heading — fades in */}
          <motion.div
            style={{ opacity: howHeadingOpacity }}
            className="absolute top-16 inset-x-0 text-center"
          >
            <h2 className="text-3xl md:text-5xl font-bold">How it works</h2>
          </motion.div>

          {/* Step cards — all start at center, fan out sequentially */}
          {STEPS.map((step, i) => {
            const Icon = ICONS[i]
            const anim = stepAnimations[i]
            return (
              <motion.div
                key={step.title}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  // Center card via margin (not CSS transform — avoids framer-motion conflict)
                  marginLeft: '-144px',  // half of w-72 = 288px
                  marginTop: '-148px',   // ~half of card height (~296px)
                  pointerEvents: 'auto',
                  ...anim,
                }}
                className="glass rounded-2xl p-8 text-center w-72"
              >
                <span className="inline-block text-xs font-semibold bg-primary/20 text-primary rounded-full px-3 py-1 mb-4">
                  Step {i + 1}
                </span>
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{step.description}</p>
              </motion.div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
