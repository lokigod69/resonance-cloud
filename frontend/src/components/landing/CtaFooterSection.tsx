import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ScrollReveal from './ScrollReveal'
import { useLandingLocale } from '@/hooks/useLandingLocale'

export default function CtaFooterSection() {
  const reducedMotion = useReducedMotion()
  const { t } = useLandingLocale()

  return (
    <section className="py-16 md:py-32 px-6 text-center bg-[var(--app-bg)]">
      {/* CTA */}
      <ScrollReveal direction="blur" className="max-w-2xl mx-auto mb-24">
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

      {/* Footer */}
      <footer className="border-t border-white/5 pt-8 text-sm text-muted-foreground space-y-1">
        <p>Resonance · resonanz.pro</p>
        <p>{t('landing.footer')}</p>
      </footer>
    </section>
  )
}
