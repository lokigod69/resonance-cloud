import { motion, useReducedMotion } from 'framer-motion'
import { DEMO_WORDS } from './landingData'
import ScrollReveal from './ScrollReveal'
import WaveformDivider from './WaveformDivider'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { useLandingLocale } from '@/hooks/useLandingLocale'

const cardVariants = {
  hidden: { opacity: 0, y: 80, rotateX: 15, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    rotateX: 0,
    scale: 1,
    transition: {
      delay: i * 0.12,
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  }),
}

const ROW_1 = DEMO_WORDS.slice(0, 6)
const ROW_2 = DEMO_WORDS.slice(6)

export default function DemoReelSection() {
  const reducedMotion = useReducedMotion()
  const { t } = useLandingLocale()

  function CardSlot({ w, i }: { w: typeof DEMO_WORDS[0]; i: number }) {
    const isAccent = i % 4 === 0

    return (
      <motion.div
        key={w.word}
        custom={i}
        variants={reducedMotion ? undefined : cardVariants}
        whileHover={reducedMotion ? undefined : { scale: 1.04, y: -4 }}
        whileTap={reducedMotion ? undefined : { scale: 0.98 }}
        className={`group relative h-72 w-52 shrink-0 cursor-default snap-center overflow-hidden rounded-xl border border-white/10 ${
          isAccent ? 'shadow-[0_0_24px_var(--accent-glow)]' : 'shadow-2xl shadow-black/30'
        }`}
      >
        <img
          src={w.thumbnail}
          alt={w.word}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute inset-0 rounded-xl border border-white/0 transition-colors duration-300 group-hover:border-[var(--accent-2)]/35" />

        <div className="absolute bottom-0 left-0 right-0 z-10 p-4">
          <p className="text-xs text-white/50"><FlagIcon code={w.language} className="w-4 h-auto" /> {w.language}</p>
          <p className="text-xl font-bold text-white">{w.word}</p>
          <p className="text-sm text-white/60">{w.translation}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <section className="bg-[var(--app-bg)] px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal className="mb-14 text-center">
          <h2 className="mb-4 text-3xl font-bold md:text-5xl">{t('landing.demoHeading')}</h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t('landing.demoDescription')}
          </p>
        </ScrollReveal>

        <div className="md:hidden">
          <motion.div
            className="pg-scrollbar-hide flex snap-x snap-mandatory gap-6 overflow-x-auto px-2 pb-4"
            style={{ perspective: 800 }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
          >
            {DEMO_WORDS.map((w, i) => (
              <CardSlot key={w.word} w={w} i={i} />
            ))}
          </motion.div>
        </div>

        <div className="hidden space-y-2 md:block">
          <motion.div
            className="flex justify-center gap-6"
            style={{ perspective: 800 }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {ROW_1.map((w, i) => (
              <CardSlot key={w.word} w={w} i={i} />
            ))}
          </motion.div>

          <WaveformDivider />

          <motion.div
            className="flex justify-center gap-6"
            style={{ perspective: 800 }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {ROW_2.map((w, i) => (
              <CardSlot key={w.word} w={w} i={i + 6} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
