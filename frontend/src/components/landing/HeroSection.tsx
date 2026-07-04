import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { LingwaveBrand } from '@/components/branding/LingwaveBrand'
import MultilingualDrift from './MultilingualDrift'

export default function HeroSection() {
  const reducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const { t } = useLandingLocale()
  const headlineWord = t('landing.headlineWord')
  const headlineMelody = t('landing.headlineMelody')
  const headlineMotion = t('landing.headlineMotion')

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

  const ctaGlow = reducedMotion
    ? {}
    : {
        boxShadow: [
          '0 0 20px var(--cta-glow)',
          '0 0 40px var(--cta-glow-strong)',
          '0 0 20px var(--cta-glow)',
        ],
      }

  return (
    <section className="relative h-screen overflow-hidden">
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-4 sm:px-6 md:px-12 backdrop-blur-md bg-black/30 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2" aria-label="Lingwave home">
          <LingwaveBrand wordmarkClassName="h-5" />
        </Link>
        <Link
          to="/login"
          className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/78 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          {t('landing.signIn')}
        </Link>
      </header>

      <motion.div
        style={reducedMotion ? {} : { y: textY, opacity: textOpacity }}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
      >
        <MultilingualDrift />

        <div className="relative z-10 max-w-3xl space-y-8 px-4">
          <motion.h1 {...fadeUp(0)} className="flex flex-col items-center text-center gap-0">
            <span className="font-display text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-white drop-shadow-[0_3px_24px_rgba(0,0,0,0.45)]">
              <span className="hero-word-warm">{headlineWord}</span>
            </span>
            <span className="text-xs sm:text-sm font-light text-white/40 -my-1 sm:-my-2">
              {t('landing.headlineBy')}
            </span>
            <span className="font-display text-5xl sm:text-6xl md:text-7xl font-bold lowercase tracking-tight text-white drop-shadow-[0_3px_24px_rgba(0,0,0,0.45)]">
              <span className="hero-word-mid">{headlineMelody}</span>
            </span>
            <span className="text-xs sm:text-sm font-light text-white/40 -my-1 sm:-my-2">
              {t('landing.headlineAnd')}
            </span>
            <span className="font-display text-5xl sm:text-6xl md:text-7xl font-bold lowercase tracking-tight text-white drop-shadow-[0_3px_24px_rgba(0,0,0,0.45)]">
              <span className="hero-word-cool">{headlineMotion}</span>
            </span>
          </motion.h1>

          <div>
            <motion.p
              {...fadeUp(0.1)}
              className="text-lg md:text-xl text-white/68 max-w-2xl mx-auto leading-relaxed"
            >
              {t('landing.subheadlineMain')}
            </motion.p>
          </div>

          <motion.div {...fadeUp(0.3)} className="flex flex-col items-center gap-3 pt-4">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/72">
              {t('landing.privateBeta')}
            </span>
            <motion.div
              className="mx-auto rounded-md sm:w-[220px]"
              animate={ctaGlow}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
            >
              <Button variant="glass-vermillion" size="lg" asChild className="w-full text-lg px-8 py-6">
                <Link to="/login">{t('landing.heroCta')}</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {reducedMotion !== true && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-7 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center text-white/45"
          animate={{ y: [0, 10, 0], opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' as const }}
        >
          <span className="mb-1 h-8 w-px bg-gradient-to-b from-transparent via-white/45 to-transparent" />
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      )}
    </section>
  )
}
