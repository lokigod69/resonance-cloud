import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLandingLocale } from '@/hooks/useLandingLocale'

export default function HeroSection() {
  const reducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const { t } = useLandingLocale()
  const headlineWord = t('landing.headlineWord')
  const headlineMelody = t('landing.headlineMelody')
  const headlineMotion = t('landing.headlineMotion')

  const renderAccentInitial = (value: string, colorVar: string) => (
    <>
      <span style={{ color: colorVar }}>{value.slice(0, 1)}</span>
      {value.slice(1)}
    </>
  )

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
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="Resonance" className="h-7 w-7" />
          <span className="font-bold text-xl">Resonance</span>
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
                {renderAccentInitial(headlineWord, 'var(--m-warm)')}
              </span>
              <span className="text-xs sm:text-sm font-light text-white/40 -my-1 sm:-my-2">
                {t('landing.headlineBy')}
              </span>
              <span className="font-display text-5xl sm:text-6xl md:text-7xl font-bold lowercase tracking-tight text-white drop-shadow-[0_3px_24px_rgba(0,0,0,0.45)]">
                {renderAccentInitial(headlineMelody, 'var(--m-mid)')}
              </span>
              <span className="text-xs sm:text-sm font-light text-white/40 -my-1 sm:-my-2">
                {t('landing.headlineAnd')}
              </span>
              <span className="font-display text-5xl sm:text-6xl md:text-7xl font-bold lowercase tracking-tight text-white drop-shadow-[0_3px_24px_rgba(0,0,0,0.45)]">
                {renderAccentInitial(headlineMotion, 'var(--m-cool)')}
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
              <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <motion.div
                  className="rounded-md"
                  animate={ctaGlow}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
                >
                  <Button variant="glass-vermillion" size="lg" asChild className="w-full text-lg px-8 py-6 sm:w-[180px]">
                    <Link to="/login">{t('landing.signIn')}</Link>
                  </Button>
                </motion.div>
                <motion.div
                  className="rounded-md"
                  animate={ctaGlow}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
                >
                  <Button variant="glass-vermillion" size="lg" asChild className="w-full text-lg px-8 py-6 sm:w-[180px]">
                    <Link to="/login?mode=signup">{t('landing.signUp')}</Link>
                  </Button>
                </motion.div>
              </div>
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
