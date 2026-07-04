import { motion, useReducedMotion } from 'framer-motion'
import { Compass, Gamepad2, Layers, Mic, Music2, type LucideIcon } from 'lucide-react'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { TIDE_EASE } from './landingMotion'

// ModePortals — five ways into the water. Deliberately asymmetric (two wide,
// three narrow) so it never reads as a SaaS feature grid; each portal is quiet
// glass with a warm glow that only wakes on hover.

type Portal = {
  icon: LucideIcon
  titleKey: string
  descKey: string
  wide?: boolean
}

const PORTALS: Portal[] = [
  { icon: Compass, titleKey: 'landing.featureGuidedTitle', descKey: 'landing.featureGuidedDesc', wide: true },
  { icon: Mic, titleKey: 'landing.featureSpeakTitle', descKey: 'landing.featureSpeakDesc', wide: true },
  { icon: Layers, titleKey: 'landing.featureDecksTitle', descKey: 'landing.featureDecksDesc' },
  { icon: Music2, titleKey: 'landing.featureMusicTitle', descKey: 'landing.featureMusicDesc' },
  { icon: Gamepad2, titleKey: 'landing.featureGamesTitle', descKey: 'landing.featureGamesDesc' },
]

export default function ModePortals() {
  const { t } = useLandingLocale()
  const reducedMotion = useReducedMotion()

  const reveal = (index: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { duration: 0.66, ease: TIDE_EASE, delay: index * 0.06 },
        }

  return (
    <section className="bg-[var(--app-bg)] px-6 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <motion.div {...reveal(0)}>
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white md:text-4xl">
            {t('landing.featuresHeading')}
          </h2>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/60">
            {t('landing.featuresSubline')}
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-6">
          {PORTALS.map((portal, i) => {
            const Icon = portal.icon
            return (
              <motion.div
                key={portal.titleKey}
                {...reveal(i + 1)}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--surface-glass)] p-6 backdrop-blur-md transition-colors duration-300 hover:border-[var(--accent)]/35 md:p-8 ${
                  portal.wide ? 'md:col-span-3' : 'md:col-span-2'
                }`}
              >
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)' }}
                  aria-hidden="true"
                />
                <Icon
                  className="h-6 w-6 text-[var(--accent-2)]/80 transition-transform duration-300 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
                <h3 className="mt-5 text-lg font-semibold text-white">{t(portal.titleKey)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">{t(portal.descKey)}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
