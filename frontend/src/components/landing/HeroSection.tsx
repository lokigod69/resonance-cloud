import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Music, Sparkles, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HERO_VIDEO_URL } from './landingData'

export default function HeroSection() {
  const reducedMotion = useReducedMotion()

  const fadeUp = (delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 30 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, ease: 'easeOut' as const, delay },
        }

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      >
        <source src={HERO_VIDEO_URL} type="video/mp4" />
      </video>
      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />

      {/* Nav */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 md:px-12 backdrop-blur-md bg-background/60 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Music className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">Resonance</span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button asChild>
            <Link to="/login">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
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
          <motion.div
            {...fadeUp(0.3)}
            className="pt-4"
          >
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
                <Link to="/login">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Try it free
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Scroll indicator */}
      <div className="relative z-10 pb-8 flex justify-center">
        <motion.div
          animate={reducedMotion ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' as const }}
          className="text-muted-foreground/40"
        >
          <ChevronDown className="h-6 w-6" />
        </motion.div>
      </div>
    </section>
  )
}
