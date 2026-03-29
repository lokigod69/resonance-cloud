import { motion } from 'framer-motion'
import { DEMO_WORDS } from './landingData'
import ScrollReveal from './ScrollReveal'
import StaggerContainer, { staggerItem } from './StaggerContainer'

export default function DemoReelSection() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">See what AI creates</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every word gets its own music video. Different language. Different style. Always unique.
          </p>
        </ScrollReveal>

        {/* Card strip */}
        <StaggerContainer className="flex gap-5 md:justify-center overflow-x-auto md:overflow-visible md:flex-wrap snap-x snap-mandatory pb-4 scrollbar-hide">
          {DEMO_WORDS.map((w) => (
            <motion.div
              key={w.word}
              variants={staggerItem}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="glass rounded-2xl w-44 shrink-0 snap-center overflow-hidden cursor-default"
            >
              {/* Thumbnail placeholder */}
              {/* TODO: Replace gradient with <img src={supabaseThumbUrl} /> */}
              <div className={`h-28 bg-gradient-to-br ${w.gradient} flex items-center justify-center`}>
                <span className="text-3xl font-bold text-white/20">{w.flag}</span>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="font-semibold text-base">{w.word}</p>
                <p className="text-sm text-muted-foreground">
                  {w.flag} {w.translation}
                </p>
              </div>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
