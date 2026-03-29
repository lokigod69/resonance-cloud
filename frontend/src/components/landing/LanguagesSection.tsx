import { motion } from 'framer-motion'
import { LANGUAGES } from './landingData'
import ScrollReveal from './ScrollReveal'
import StaggerContainer, { staggerScaleItem } from './StaggerContainer'

export default function LanguagesSection() {
  return (
    <section className="py-24 px-6 text-center border-t border-white/[0.03]">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <ScrollReveal className="mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            6 languages. Your vocabulary.
          </h2>
        </ScrollReveal>

        {/* Language grid */}
        <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          {LANGUAGES.map((lang) => (
            <motion.div
              key={lang.label}
              variants={staggerScaleItem}
              whileHover={{ scale: 1.08 }}
              className="glass rounded-2xl p-6 cursor-default"
            >
              <div className="text-4xl mb-2">{lang.flag}</div>
              <p className="text-sm font-medium">{lang.label}</p>
            </motion.div>
          ))}
        </StaggerContainer>

        {/* Footer text */}
        <ScrollReveal delay={0.3} className="mt-8">
          <p className="text-muted-foreground text-sm">More languages coming soon.</p>
        </ScrollReveal>
      </div>
    </section>
  )
}
