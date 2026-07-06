import { motion, useReducedMotion } from 'framer-motion'
import { Compass, Gamepad2, Layers, Mic, Music2, type LucideIcon } from 'lucide-react'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { curriculumImageUrl } from './landingData'
import { TIDE_EASE } from './landingMotion'

// ModePortals — five ways into the water, introduced by the library wall: two
// slow counter-drifting rows of real curriculum renders (a single composited
// transform per row, so it costs almost nothing) that show the sheer size of
// the illustrated vocabulary before the feature portals.

const WALL_ROW_A = ['dog', 'cat', 'guitar', 'lighthouse', 'coffee', 'hockey', 'moon', 'carrot']
const WALL_ROW_B = ['mountain', 'cheese', 'waterfall', 'piano', 'ocean', 'rain', 'book', 'dancing']

function WallRow({ slugs, reverse, reducedMotion }: { slugs: string[]; reverse?: boolean; reducedMotion: boolean }) {
  // Row content is doubled; the loop travels exactly half its width, so the
  // drift is seamless. Reduced motion renders a still strip.
  const items = reducedMotion ? slugs : [...slugs, ...slugs]
  return (
    <div className="flex w-max gap-4" style={reducedMotion ? {} : { animation: `${reverse ? 'lw-wall-b' : 'lw-wall-a'} 80s linear infinite` }}>
      {items.map((slug, i) => (
        <div key={`${slug}-${i}`} className="h-20 shrink-0 overflow-hidden rounded-xl border border-white/10 md:h-24" style={{ aspectRatio: '840 / 472' }}>
          <img
            src={curriculumImageUrl(slug)}
            alt=""
            width={840}
            height={472}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover opacity-80"
          />
        </div>
      ))}
    </div>
  )
}

function LibraryWall() {
  const { t } = useLandingLocale()
  const reducedMotion = useReducedMotion() === true
  return (
    <div aria-hidden="true" className="relative -mx-6 mt-12 overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)' }}>
      <style>
        {`
          @keyframes lw-wall-a { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          @keyframes lw-wall-b { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        `}
      </style>
      <div className="flex flex-col gap-4">
        <WallRow slugs={WALL_ROW_A} reducedMotion={reducedMotion} />
        <WallRow slugs={WALL_ROW_B} reverse reducedMotion={reducedMotion} />
      </div>
      <p className="mt-5 text-center font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">
        {t('landing.libraryCount')}
      </p>
    </div>
  )
}

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
      </div>

      <LibraryWall />

      <div className="mx-auto max-w-6xl">
        <div className="mt-12 grid gap-5 md:grid-cols-6">
          {PORTALS.map((portal, i) => {
            const Icon = portal.icon
            return (
              <motion.div
                key={portal.titleKey}
                {...reveal(i + 1)}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-[#140c19] p-6 transition-colors duration-300 hover:border-[var(--accent)]/35 md:p-8 ${
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
