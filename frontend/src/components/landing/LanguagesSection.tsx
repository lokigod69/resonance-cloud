import { motion, useReducedMotion } from 'framer-motion'
import { LANGUAGES } from './landingData'
import ScrollReveal from './ScrollReveal'
import { FlagIcon } from '@/components/ui/FlagIcon'

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

export default function LanguagesSection() {
  const reducedMotion = useReducedMotion()

  return (
    <section className="py-24 px-6 text-center bg-[#0d0e16]">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <ScrollReveal className="mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            10 languages. Your vocabulary.
          </h2>
        </ScrollReveal>

        {/* Language grid */}
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
              <p className="text-sm font-medium" style={{ color: lang.color }}>
                {lang.label}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer text */}
        <ScrollReveal delay={0.3} className="mt-8">
          <p className="text-muted-foreground text-sm">More languages coming soon.</p>
        </ScrollReveal>
      </div>
    </section>
  )
}
