import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Sparkles, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HeroSection() {
  const reducedMotion = useReducedMotion()
  const { scrollY } = useScroll()

  // Scroll-driven parallax: text floats up and fades
  const textY = useTransform(scrollY, [0, 500], [0, -200])
  const textOpacity = useTransform(scrollY, [0, 400], [1, 0])

  const fadeUp = (delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, ease: 'easeOut' as const, delay },
        }

  return (
    <section className="relative h-screen">
      {/* Nav — fixed, frosted glass */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md bg-black/30 border-b border-white/5">
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

      {/* Hero content — floats up and fades on scroll */}
      <motion.div
        style={reducedMotion ? {} : { y: textY, opacity: textOpacity }}
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-20"
      >
        <div className="relative">
          {/* Frosted backdrop — tight dark card behind text only, no gradient bleed */}
          <div className="absolute -inset-x-16 -inset-y-12 rounded-[3rem]"
               style={{
                 background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.15) 70%, transparent 100%)',
                 backdropFilter: 'blur(20px)',
                 WebkitBackdropFilter: 'blur(20px)',
               }}
          />

          <div className="relative z-10 max-w-3xl space-y-8 px-4">
            {/* Badge */}
            <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white/70 bg-white/5 border border-white/10">
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
              className="text-lg md:text-xl text-white/60 max-w-xl mx-auto leading-relaxed"
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
        </div>

        {/* Scroll indicator — outside the backdrop */}
        <motion.div
          animate={reducedMotion ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
          className="absolute bottom-8 text-white/30"
        >
          <ChevronDown className="h-6 w-6" />
        </motion.div>
      </motion.div>
    </section>
  )
}
