import { motion, useReducedMotion } from 'framer-motion'
import { useLandingLocale } from '@/hooks/useLandingLocale'
import { TIDE_EASE } from './landingMotion'

// MemoryMechanicSection — a breath of pure typography between the portals and
// the finale: why melody and motion work. Three lines, each led by one of the
// hero gradient words; two mono footnotes carry the science.

const LINES = [
  { wordKey: 'landing.memoryWord1', restKey: 'landing.memoryRest1', gradient: 'hero-word-warm' },
  { wordKey: 'landing.memoryWord2', restKey: 'landing.memoryRest2', gradient: 'hero-word-mid' },
  { wordKey: 'landing.memoryWord3', restKey: 'landing.memoryRest3', gradient: 'hero-word-cool' },
]

export default function MemoryMechanicSection() {
  const { t } = useLandingLocale()
  const reducedMotion = useReducedMotion()

  const reveal = (index: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 22, filter: 'blur(4px)' },
          whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
          viewport: { once: true, amount: 0.5 },
          transition: { duration: 0.66, ease: TIDE_EASE, delay: index * 0.14 },
        }

  return (
    <section className="bg-[var(--app-bg)] px-6 py-24 text-center md:py-32">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-4">
        {LINES.map((line, i) => (
          <motion.p
            key={line.wordKey}
            {...reveal(i)}
            className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl"
          >
            <span className={line.gradient}>{t(line.wordKey)}</span>{' '}
            <span className="text-white/85">{t(line.restKey)}</span>
          </motion.p>
        ))}
        <motion.div {...reveal(3)} className="mt-10 flex flex-col items-center gap-2">
          <p className="font-mono text-xs tracking-[0.14em] text-white/40">{t('landing.memoryNote1')}</p>
          <p className="font-mono text-xs tracking-[0.14em] text-white/40">{t('landing.memoryNote2')}</p>
        </motion.div>
      </div>
    </section>
  )
}
