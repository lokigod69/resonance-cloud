import { motion, useReducedMotion } from 'framer-motion'
import { Keyboard, Sparkles, Brain, ChevronRight } from 'lucide-react'
import ScrollReveal from './ScrollReveal'
import { useLandingLocale } from '@/hooks/useLandingLocale'

const ICONS = [Keyboard, Sparkles, Brain]

// Desktop: cards converge from left, bottom, right. Mobile: all from bottom.
const directions = [
  { x: -60, y: 0 },
  { x: 0, y: 60 },
  { x: 60, y: 0 },
]

export default function HowItWorksSection() {
  const reducedMotion = useReducedMotion()
  const { t } = useLandingLocale()

  const steps = [
    { title: t('landing.step1Title'), description: t('landing.step1Desc') },
    { title: t('landing.step2Title'), description: t('landing.step2Desc') },
    { title: t('landing.step3Title'), description: t('landing.step3Desc') },
  ]

  return (
    <section className="py-32 px-6 bg-[#0c0d14]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <ScrollReveal className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold">{t('landing.howItWorks')}</h2>
        </ScrollReveal>

        {/* Steps with connector arrows */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-center gap-6 md:gap-0">
          {steps.map((step, i) => {
            const Icon = ICONS[i]
            const dir = directions[i]
            return (
              <div key={step.title} className="contents">
                {/* Connector arrow — desktop only, before cards 2 and 3 */}
                {i > 0 && (
                  <div className="hidden md:flex items-center px-4 pt-16 shrink-0">
                    <div className="w-12 border-t-2 border-dashed border-white/20" />
                    <ChevronRight className="w-4 h-4 text-white/20 -ml-1" />
                  </div>
                )}

                <motion.div
                  initial={reducedMotion ? {} : {
                    opacity: 0,
                    x: dir.x,
                    y: dir.y || 40,
                  }}
                  whileInView={reducedMotion ? {} : { opacity: 1, x: 0, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.6, delay: i * 0.15, ease: 'easeOut' as const }}
                  className="glass rounded-2xl p-8 text-center md:w-72 shrink-0 hover:-translate-y-2 transition-transform duration-300"
                >
                  {/* Step number */}
                  <motion.span
                    className="inline-block text-xs font-semibold bg-primary/20 text-primary rounded-full px-3 py-1 mb-4"
                    initial={reducedMotion ? {} : { scale: 0 }}
                    whileInView={reducedMotion ? {} : { scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: 'spring' as const, stiffness: 300, damping: 15, delay: 0.3 + i * 0.2 }}
                  >
                    {t('landing.step', { n: i + 1 })}
                  </motion.span>

                  {/* Icon */}
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>

                  {/* Text */}
                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {step.description}
                  </p>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
