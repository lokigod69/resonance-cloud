import { motion, useReducedMotion } from 'framer-motion'
import { Brain, Compass, Gamepad2, Layers, Mic, Music } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import ScrollReveal from './ScrollReveal'
import StaggerContainer from './StaggerContainer'
import { staggerItem } from './StaggerContainer.variants'
import { useLandingLocale } from '@/hooks/useLandingLocale'

type Feature = {
  icon: LucideIcon
  titleKey: string
  descKey: string
}

const FEATURES: Feature[] = [
  { icon: Compass, titleKey: 'landing.featureGuidedTitle', descKey: 'landing.featureGuidedDesc' },
  { icon: Layers, titleKey: 'landing.featureDecksTitle', descKey: 'landing.featureDecksDesc' },
  { icon: Brain, titleKey: 'landing.featureStudyTitle', descKey: 'landing.featureStudyDesc' },
  { icon: Mic, titleKey: 'landing.featureSpeakTitle', descKey: 'landing.featureSpeakDesc' },
  { icon: Music, titleKey: 'landing.featureMusicTitle', descKey: 'landing.featureMusicDesc' },
  { icon: Gamepad2, titleKey: 'landing.featureGamesTitle', descKey: 'landing.featureGamesDesc' },
]

export default function FeatureConstellation() {
  const { t } = useLandingLocale()
  const reducedMotion = useReducedMotion()

  return (
    <section className="relative overflow-hidden bg-[var(--app-bg)] px-6 py-24">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent-2)]/35 to-transparent"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto max-w-6xl">
        <ScrollReveal className="mx-auto mb-14 max-w-3xl text-center">
          <h2 className="text-3xl md:text-5xl font-bold">{t('landing.featuresHeading')}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t('landing.featuresSubline')}
          </p>
        </ScrollReveal>

        <StaggerContainer className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, titleKey, descKey }) => (
            <motion.article
              key={titleKey}
              variants={reducedMotion ? undefined : staggerItem}
              className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] p-6 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_0_28px_var(--accent-glow)]"
            >
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--accent-soft)] text-[var(--accent-2)]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">{t(titleKey)}</h3>
              <p className="text-sm leading-relaxed text-white/58">{t(descKey)}</p>
            </motion.article>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
