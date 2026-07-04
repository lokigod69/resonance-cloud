import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LingwaveWaves } from '@/components/branding/LingwaveWaves'
import ScrollReveal from './ScrollReveal'
import WaveformDivider from './WaveformDivider'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { LEGAL_LINKS, handleLegalLinkClick } from '@/lib/legalLinks'
import { getPublicWebOrigin } from '@/lib/publicOrigins'

function getPublicWebHost(): string {
  try {
    return new URL(getPublicWebOrigin()).host
  } catch {
    return 'lingwave.ai'
  }
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = (event: MediaQueryListEvent) => setMatches(event.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])

  return matches
}

export default function CtaFooterSection() {
  const reducedMotion = useReducedMotion()
  const isCompact = useMediaQuery('(max-width: 768px)')
  const [waveInView, setWaveInView] = useState(false)
  const ctaRef = useRef<HTMLDivElement | null>(null)
  const { t } = useLandingLocale()
  const publicWebHost = getPublicWebHost()
  const useStaticWave = reducedMotion === true || isCompact

  useEffect(() => {
    const node = ctaRef.current
    if (useStaticWave || !node || typeof IntersectionObserver === 'undefined') {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => setWaveInView(entry.isIntersecting),
      { rootMargin: '220px 0px', threshold: 0.05 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [useStaticWave])

  return (
    <section className="bg-[var(--app-bg)] text-center">
      <div ref={ctaRef} className="relative overflow-hidden px-6 py-16 md:py-32">
        {!useStaticWave && waveInView && (
          <LingwaveWaves className="cosmos-bg-mask-both opacity-80" />
        )}

        {useStaticWave && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 opacity-45" aria-hidden="true">
            <WaveformDivider className="flex" animated={false} />
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--app-bg)] via-transparent to-[var(--app-bg)]"
          aria-hidden="true"
        />

        <ScrollReveal direction="blur" className="relative z-10 mx-auto max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t('landing.ctaHeadline')}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t('landing.ctaSubline')}
          </p>
          <motion.div
            className="inline-block rounded-md"
            animate={reducedMotion ? {} : {
              boxShadow: [
                '0 0 20px var(--cta-glow)',
                '0 0 40px var(--cta-glow-strong)',
                '0 0 20px var(--cta-glow)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' as const }}
          >
            <Button variant="glass-vermillion" size="lg" asChild className="text-lg px-8 py-6">
              <Link to="/login?mode=signup">
                <Sparkles className="h-5 w-5 mr-2" />
                {t('landing.cta')}
              </Link>
            </Button>
          </motion.div>
        </ScrollReveal>
      </div>

      <footer className="border-t border-white/5 px-6 pt-8 pb-16 text-sm text-muted-foreground space-y-3">
        <p>Lingwave &middot; {publicWebHost}</p>
        <p>&copy; 2026 Deep Blue Dodo LLC</p>
        <nav aria-label={t('legal.footerNavLabel')} className="flex flex-wrap justify-center gap-x-4 gap-y-2">
          {LEGAL_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(event) => handleLegalLinkClick(event, link.href)}
              className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {t(link.labelKey)}
            </a>
          ))}
        </nav>
        <p>{t('landing.footer')}</p>
      </footer>
    </section>
  )
}
