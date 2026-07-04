import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { GREETINGS, LANGUAGES } from './landingData'
import ScrollReveal from './ScrollReveal'
import { FlagIcon } from '@/components/ui/FlagIcon'
import { useLandingLocale } from '@/hooks/useLandingLocale'

const langVariant = {
  hidden: { opacity: 0, scale: 0.1 },
  visible: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 15,
      delay: i * 0.15,
    },
  }),
}

function PhraseMarqueeRow({ reverse = false, highlightOffset = 0 }: { reverse?: boolean; highlightOffset?: number }) {
  const reducedMotion = useReducedMotion()
  const phrases = [...GREETINGS, ...GREETINGS]

  return (
    <div className="overflow-hidden">
      <motion.div
        className="flex w-max items-center gap-8 py-1"
        animate={reducedMotion ? undefined : { x: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
        transition={reducedMotion ? undefined : { duration: 38, repeat: Infinity, ease: 'linear' as const }}
      >
        {phrases.map((phrase, index) => {
          const highlighted = (index + highlightOffset) % 6 === 0

          return (
            <span
              key={`${phrase.lang}-${phrase.text}-${index}`}
              lang={phrase.lang}
              className={`font-display whitespace-nowrap text-lg md:text-2xl ${
                highlighted ? 'text-[var(--accent-2)] opacity-70' : 'text-white/35'
              }`}
            >
              {phrase.text}
            </span>
          )
        })}
      </motion.div>
    </div>
  )
}

function PhraseMarquee() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none mb-10 space-y-2"
      style={{
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
      }}
    >
      <PhraseMarqueeRow />
      <PhraseMarqueeRow reverse highlightOffset={3} />
    </div>
  )
}

export default function LanguagesSection() {
  const reducedMotion = useReducedMotion()
  const { t } = useLandingLocale()
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })
  const backgroundY = useTransform(scrollYProgress, [0, 1], ['-4%', '4%'])

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[var(--app-bg)] py-24 px-6 text-center">
      <motion.div
        className="cosmos-bg-mask-both absolute -inset-y-8 inset-x-0 transform-gpu bg-cover bg-center opacity-50 will-change-transform"
        style={{ backgroundImage: "url('/brand/cosmos/cosmos-languages.webp')", y: backgroundY }}
        aria-hidden="true"
      />
      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Header */}
        <ScrollReveal className="mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t('landing.languagesHeading')}
          </h2>
        </ScrollReveal>

        <PhraseMarquee />

        {/* Language grid */}
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] p-5 shadow-[var(--shadow-soft)] backdrop-blur-md sm:p-6">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-5 gap-4"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
          >
            {LANGUAGES.map((lang, i) => (
              <motion.div
                key={lang.label}
                custom={i}
                variants={reducedMotion ? undefined : langVariant}
                whileHover={{ scale: 1.08 }}
                className="rounded-2xl p-6 cursor-default border border-white/5 transition-colors duration-200"
                style={{
                  background: `linear-gradient(135deg, ${lang.color}20 0%, ${lang.color}08 100%)`,
                  borderBottom: `2px solid ${lang.color}60`,
                }}
              >
                <div className="mb-2"><FlagIcon code={lang.code} className="w-12 h-auto" /></div>
                <p className="text-sm font-medium text-white/75">
                  {t(`langName.${lang.label}`)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Footer text */}
        <ScrollReveal delay={0.3} className="mt-8">
          <p className="text-muted-foreground text-sm">{t('landing.languagesComingSoon')}</p>
        </ScrollReveal>
      </div>
    </section>
  )
}
