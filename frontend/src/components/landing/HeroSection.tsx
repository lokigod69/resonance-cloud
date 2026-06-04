import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { LingwaveBrand } from '@/components/branding/LingwaveBrand'

export default function HeroSection() {
  const reducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const { t } = useLandingLocale()
  const headlineWord = t('landing.headlineWord')
  const headlineMelody = t('landing.headlineMelody')
  const headlineMotion = t('landing.headlineMotion')

  // Scroll-driven parallax: text floats up and fades
  const textY = useTransform(scrollY, [0, 500], [0, -200])
  const textOpacity = useTransform(scrollY, [0, 400], [1, 0])
  // Backdrop fades faster to leave the image unobstructed before text disappears
  const backdropOpacity = useTransform(scrollY, [0, 300], [1, 0])

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
    <section className="relative h-screen">
      {/* Nav — fixed, frosted glass */}
      <header className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-4 py-4 sm:px-6 md:px-12 backdrop-blur-md bg-black/30 border-b border-white/5">
        <Link to="/" className="flex items-center gap-2" aria-label="Lingwave home">
          <LingwaveBrand wordmarkClassName="text-xl" />
        </Link>
      </header>

      {/* Hero content — floats up and fades on scroll */}
      <motion.div
        style={reducedMotion ? {} : { y: textY, opacity: textOpacity }}
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-20"
      >
        <div className="relative">
          {/* Soft vignette preserves legibility without adding visible chrome */}
          <motion.div
            className="absolute -inset-x-20 -inset-y-14"
            style={{
              opacity: reducedMotion ? 1 : backdropOpacity,
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, transparent 75%)',
            }}
          />

          <div className="relative z-10 max-w-3xl space-y-8 px-4">
            {/* Headline — stacked typography */}
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

            {/* Subheadline */}
            <div>
              <motion.p
                {...fadeUp(0.1)}
                className="text-lg md:text-xl text-white/60 max-w-xl mx-auto leading-relaxed"
              >
                {t('landing.subheadlineMain')}
              </motion.p>
              <motion.p
                {...fadeUp(0.15)}
                className="text-base md:text-lg text-white/55 max-w-xl mx-auto mt-1"
              >
                {t('landing.subheadlineAccent')}
              </motion.p>
            </div>

            {/* CTA with glow pulse */}
            <motion.div {...fadeUp(0.3)} className="pt-4">
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
        </div>
      </motion.div>
    </section>
  )
}
