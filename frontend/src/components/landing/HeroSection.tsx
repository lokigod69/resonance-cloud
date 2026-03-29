import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Music, Sparkles, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
    <section className="relative min-h-screen flex flex-col">
      {/* TODO: Add looping muted <video> background at 30-40% opacity */}

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
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[oklch(0.7_0.15_280)] to-[oklch(0.65_0.18_320)]">
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

          {/* CTA */}
          <motion.div {...fadeUp(0.3)} className="pt-4">
            <Button size="lg" asChild className="glow-purple text-lg px-8 py-6">
              <Link to="/login">
                <Sparkles className="h-5 w-5 mr-2" />
                Try it free
              </Link>
            </Button>
          </motion.div>
        </div>
      </main>

      {/* Scroll indicator */}
      <div className="pb-8 flex justify-center">
        <motion.div
          animate={reducedMotion ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="text-muted-foreground/40"
        >
          <ChevronDown className="h-6 w-6" />
        </motion.div>
      </div>
    </section>
  )
}
