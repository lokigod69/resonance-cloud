import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Keyboard, Sparkles, Brain } from 'lucide-react'
import { DEMO_WORDS } from './landingData'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { FlagIcon } from '@/components/ui/FlagIcon'
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
        <p className="text-xs text-white/50"><FlagIcon code={w.language} className="w-4 h-auto" /> {w.language}</p>
        <p className="text-xl font-bold text-white">{w.word}</p>
        <p className="text-sm text-white/60">{w.translation}</p>
      </div>
    </div>
  )
}

export default function ScrollStorySection() {
  const reducedMotion = useReducedMotion()
  const { t } = useLandingLocale()
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  )

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

  // === PHASE A: Cards scale in from small (0.00 → 0.20) ===
  // Shared scale for all cards — grows from 30% to full size
  const cardsScale = useTransform(scrollYProgress, [0.00, 0.20], [0.3, 1])

  // Demo heading: fades in at start, fades out before Phase B
  const demoHeadingOpacity = useTransform(scrollYProgress, [0.00, 0.10, 0.28], [0, 1, 0])

  // Combined opacity per row: fade IN during Phase A, hold, fade OUT during Phase B
  // Row 1 (leads)
  const row1Opacity = useTransform(scrollYProgress, [0.00, 0.12, 0.22, 0.42], [0, 1, 1, 0])
  // Row 2 (slightly delayed stagger)
  const row2Opacity = useTransform(scrollYProgress, [0.02, 0.14, 0.24, 0.44], [0, 1, 1, 0])

  // === PHASE B: Cards disperse to sides (0.22 → 0.48) ===
  // Row 1 x-movement
  const leftRow1X = useTransform(scrollYProgress, [0.22, 0.48], [0, -1200])
  const rightRow1X = useTransform(scrollYProgress, [0.22, 0.48], [0, 1200])
  // Row 2 slightly delayed
  const leftRow2X = useTransform(scrollYProgress, [0.24, 0.50], [0, -1200])
  const rightRow2X = useTransform(scrollYProgress, [0.24, 0.50], [0, 1200])

  // === PHASE C: How It Works + Waveform (0.45 → 0.90) ===
  // Waveform fades IN after cards are gone
  const waveformOpacity = useTransform(scrollYProgress, [0.50, 0.65], [0, 1])

  // "How it works" heading
  const howHeadingOpacity = useTransform(scrollYProgress, [0.45, 0.58], [0, 1])

  // Step 1: grows from center, fans left
  const step1Scale = useTransform(scrollYProgress, [0.48, 0.60], [0.3, 1])
  const step1Opacity = useTransform(scrollYProgress, [0.48, 0.60], [0, 1])
  const step1X = useTransform(scrollYProgress, [0.48, 0.60], [0, -350])

  // Step 2: grows at center, stays centered
  const step2Scale = useTransform(scrollYProgress, [0.58, 0.70], [0.3, 1])
  const step2Opacity = useTransform(scrollYProgress, [0.58, 0.70], [0, 1])

  // Step 3: grows from center, fans right
  const step3Scale = useTransform(scrollYProgress, [0.63, 0.75], [0.3, 1])
  const step3Opacity = useTransform(scrollYProgress, [0.63, 0.75], [0, 1])
  const step3X = useTransform(scrollYProgress, [0.63, 0.75], [0, 350])

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

  const steps = [
    { title: t('landing.step1Title'), description: t('landing.step1Desc') },
    { title: t('landing.step2Title'), description: t('landing.step2Desc') },
    { title: t('landing.step3Title'), description: t('landing.step3Desc') },
  ]

  return (
    <section
      ref={containerRef}
      style={{ height: '550vh', background: 'var(--app-bg)' }}
    >
      {/* Sticky viewport — stays pinned while container scrolls past */}
      <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

        {/* Phase 1: Demo reel layer */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }} className="flex flex-col items-center justify-center px-6">

          {/* Demo heading — fades in at start, out before dispersal */}
          <motion.div
            style={{ opacity: demoHeadingOpacity }}
            className="absolute top-16 inset-x-0 text-center px-6 will-change-[opacity] [backface-visibility:hidden]"
          >
            <h2 className="text-3xl md:text-5xl font-bold mb-4">{t('landing.demoHeading')}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {t('landing.demoDescription')}
            </p>
          </motion.div>

          {/* Card rows — split left/right so each half can slide its own direction */}
          <div className="flex flex-col gap-2 mt-20">
            {/* Row 1 */}
            <div className="flex justify-center gap-6">
              {/* Left half slides left */}
              <motion.div
                className="flex gap-6"
                style={{ x: leftRow1X, opacity: row1Opacity, scale: cardsScale }}
              >
                {ROW_1.slice(0, 3).map(w => <StaticCardSlot key={w.word} w={w} />)}
              </motion.div>
              {/* Right half slides right */}
              <motion.div
                className="flex gap-6"
                style={{ x: rightRow1X, opacity: row1Opacity, scale: cardsScale }}
              >
                {ROW_1.slice(3).map(w => <StaticCardSlot key={w.word} w={w} />)}
              </motion.div>
            </div>

            {/* Row 2 (staggered slightly after row 1) */}
            <div className="flex justify-center gap-6">
              {/* Left half slides left */}
              <motion.div
                className="flex gap-6"
                style={{ x: leftRow2X, opacity: row2Opacity, scale: cardsScale }}
              >
                {ROW_2.slice(0, 3).map(w => <StaticCardSlot key={w.word} w={w} />)}
              </motion.div>
              {/* Right half slides right */}
              <motion.div
                className="flex gap-6"
                style={{ x: rightRow2X, opacity: row2Opacity, scale: cardsScale }}
              >
                {ROW_2.slice(3).map(w => <StaticCardSlot key={w.word} w={w} />)}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Phase 2: How It Works layer */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>

          {/* "How it works" heading — fades in after cards clear */}
          <motion.div
            style={{ opacity: howHeadingOpacity }}
            className="absolute top-16 inset-x-0 text-center"
          >
            <h2 className="text-3xl md:text-5xl font-bold">{t('landing.howItWorks')}</h2>
          </motion.div>

          {/* Step cards — all start at center, fan out sequentially */}
          {steps.map((step, i) => {
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
                  {t('landing.step', { n: i + 1 })}
                </span>
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{step.description}</p>
              </motion.div>
            )
          })}

          {/* Waveform — appears AFTER cards are gone, positioned below step cards */}
          <motion.div
            style={{
              position: 'absolute',
              bottom: '8%',
              left: 0,
              right: 0,
              opacity: waveformOpacity,
              pointerEvents: 'none',
            }}
          >
            <WaveformDivider />
          </motion.div>
        </div>

      </div>
    </section>
  )
}
