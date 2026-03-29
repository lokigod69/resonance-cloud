import { motion } from 'framer-motion'
import { DEMO_WORDS } from './landingData'
import ScrollReveal from './ScrollReveal'
import StaggerContainer, { staggerItem } from './StaggerContainer'

export default function DemoReelSection() {
  return (
    <section className="py-24 px-6 border-t border-white/[0.03]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <ScrollReveal className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">See what AI creates</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every word gets its own music video. Different language. Different style. Always unique.
          </p>
        </ScrollReveal>

        {/* Card strip */}
        <StaggerContainer className="flex gap-5 md:justify-center overflow-x-auto md:overflow-visible md:flex-wrap snap-x snap-mandatory pb-4 pg-scrollbar-hide">
          {DEMO_WORDS.map((w) => (
            <motion.div
              key={w.word}
              variants={staggerItem}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="relative rounded-2xl w-48 h-64 shrink-0 snap-center overflow-hidden cursor-default group"
            >
              {/* Thumbnail fills the card */}
              <img
                src={w.thumbnail}
                alt={w.word}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />

              {/* Gradient overlay at bottom for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              {/* Hover brightening */}
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Content at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-sm text-white/60">{w.flag} {w.language}</p>
                <p className="text-xl font-bold text-white">{w.word}</p>
                <p className="text-sm text-white/50">{w.translation}</p>
              </div>
            </motion.div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}
