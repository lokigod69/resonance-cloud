import { Link } from 'react-router-dom'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { LingwaveBrand } from '@/components/branding/LingwaveBrand'
import FloatingWords from './FloatingWords'
import { TIDE_EASE } from './landingMotion'

// LandingHero — the living water is the hero image; the headline arrives the
// way a learned word does: out of the blur, one word at a time, on the tide
// curve. Floating multilingual words ride the swell beneath the type.

export default function LandingHero() {
  const reducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const { t, locale } = useLandingLocale()

  // The headline stays with the visitor most of the way through the hero so
  // the handoff to the tide story never opens onto empty water.
  const textY = useTransform(scrollY, [0, 700], [0, -240])
  const textOpacity = useTransform(scrollY, [150, 700], [1, 0])

  // Per-word arrival: blur resolves as the word surfaces.
  const surface = (delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 26, filter: 'blur(6px)' },
          animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
          transition: { duration: 0.66, ease: TIDE_EASE, delay },
        }

  const fadeUp = (delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.66, ease: TIDE_EASE, delay },
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
      <style>
        {`
          @keyframes lw-hero-bob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          .lw-hero-bob {
            display: inline-block;
            animation: lw-hero-bob 9s ease-in-out infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .lw-hero-bob { animation: none; }
          }
        `}
      </style>
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-4 sm:px-6 md:px-12 backdrop-blur-md bg-black/30 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2" aria-label="Lingwave home">
          <LingwaveBrand wordmarkClassName="h-5" />
        </Link>
        <div className="flex items-center gap-4">
          <span
            className="hidden font-mono text-[11px] uppercase tracking-[0.18em] text-white/35 md:inline"
            aria-hidden="true"
          >
            {locale === 'de' ? 'de · en · fr' : locale === 'fr' ? 'fr · en · de' : 'en · de · fr'}
          </span>
          <Link
            to="/login"
            className="rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/78 transition hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {t('landing.signIn')}
          </Link>
        </div>
      </header>

      <motion.div
        style={reducedMotion ? {} : { y: textY, opacity: textOpacity }}
        className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
      >
        <FloatingWords />

        <div className="relative z-10 max-w-3xl space-y-8 px-4">
          <h1 className="flex flex-col items-center gap-0 text-center">
            <motion.span
              {...surface(0.05)}
              className="font-display text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-white drop-shadow-[0_3px_24px_rgba(0,0,0,0.45)]"
            >
              <span className="hero-word-warm lw-hero-bob">{t('landing.headlineWord')}</span>
            </motion.span>
            <motion.span {...fadeUp(0.5)} className="text-xs sm:text-sm font-light text-white/40 -my-1 sm:-my-2">
              {t('landing.headlineBy')}
            </motion.span>
            <motion.span
              {...surface(0.23)}
              className="font-display text-5xl sm:text-6xl md:text-7xl font-bold lowercase tracking-tight text-white drop-shadow-[0_3px_24px_rgba(0,0,0,0.45)]"
            >
              <span className="hero-word-mid lw-hero-bob" style={{ animationDelay: '0.9s' }}>{t('landing.headlineMelody')}</span>
            </motion.span>
            <motion.span {...fadeUp(0.58)} className="text-xs sm:text-sm font-light text-white/40 -my-1 sm:-my-2">
              {t('landing.headlineAnd')}
            </motion.span>
            <motion.span
              {...surface(0.41)}
              className="font-display text-5xl sm:text-6xl md:text-7xl font-bold lowercase tracking-tight text-white drop-shadow-[0_3px_24px_rgba(0,0,0,0.45)]"
            >
              <span className="hero-word-cool lw-hero-bob" style={{ animationDelay: '1.8s' }}>{t('landing.headlineMotion')}</span>
            </motion.span>
          </h1>

          <motion.p
            {...fadeUp(0.72)}
            className="text-lg md:text-xl text-white/68 max-w-2xl mx-auto leading-relaxed"
          >
            {t('landing.subheadlineMain')}
          </motion.p>

          <motion.div {...fadeUp(0.9)} className="flex flex-col items-center gap-3 pt-4">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-white/72">
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
