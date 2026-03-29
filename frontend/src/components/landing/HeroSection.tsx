import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Sparkles, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HERO_VIDEO_URL } from './landingData'

export default function HeroSection() {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })

  // Scroll-driven: hero content fades out and slides up as user scrolls
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const contentY = useTransform(scrollYProgress, [0, 0.5], [0, -80])
  // Video becomes more visible as content leaves
  const videoOpacity = useTransform(scrollYProgress, [0, 0.5], [0.35, 0.6])

  const fadeUp = (delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, ease: 'easeOut' as const, delay },
        }

  return (
    <section ref={sectionRef} className="relative min-h-screen">
      {/* Sticky layer — stays fixed while section scrolls through */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Background video */}
        <motion.video
          autoPlay
          muted
          loop
          playsInline
          style={reducedMotion ? { opacity: 0.35 } : { opacity: videoOpacity }}
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </motion.video>

        {/* Vignette overlay — fully opaque center, video only at edges */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 55% 60% at center, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 35%, rgba(0,0,0,0.85) 55%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,0.2) 100%)`,
          }}
        />
        {/* Bottom fade for section transition */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#0a0a14] to-transparent" />

        {/* Nav — fixed, frosted glass */}
        <header className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md bg-black/30 border-b border-white/5">
          <Link to="/" className="flex items-center gap-2">
            <img src="/favicon.svg" alt="Resonance" className="h-7 w-7" />
            <span className="font-bold text-xl">Resonance</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/login?mode=signup">Get Started</Link>
            </Button>
          </div>
        </header>

        {/* Hero content — scroll-driven fade out */}
        <motion.main
          style={reducedMotion ? {} : { opacity: contentOpacity, y: contentY }}
          className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-10"
        >
          <div className="max-w-3xl space-y-8">
            {/* Badge */}
            <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI-powered language learning
            </motion.div>

            {/* Headline */}
            <motion.h1
              {...fadeUp(0.1)}
              className="text-5xl md:text-7xl font-bold tracking-tight leading-tight"
            >
              Learn any language through{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                AI music videos
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              {...fadeUp(0.2)}
              className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed"
            >
              Type a word. Get a personalized music video that makes it stick.
            </motion.p>

            {/* CTA with glow pulse */}
            <motion.div {...fadeUp(0.3)} className="pt-4">
              <motion.div
                className="inline-block rounded-md"
                animate={reducedMotion ? {} : {
                  boxShadow: [
                    '0 0 20px oklch(0.5 0.15 280 / 0.2)',
                    '0 0 40px oklch(0.5 0.15 280 / 0.4)',
                    '0 0 20px oklch(0.5 0.15 280 / 0.2)',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
              >
                <Button size="lg" asChild className="text-lg px-8 py-6">
                  <Link to="/login?mode=signup">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Try it free
                  </Link>
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            animate={reducedMotion ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
            className="absolute bottom-8 text-muted-foreground/40"
          >
            <ChevronDown className="h-6 w-6" />
          </motion.div>
        </motion.main>
      </div>
    </section>
  )
}
