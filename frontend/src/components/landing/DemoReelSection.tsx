import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DEMO_WORDS } from './landingData'
import ScrollReveal from './ScrollReveal'

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

export default function DemoReelSection() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const reducedMotion = useReducedMotion()

  return (
    <section className="py-24 px-6 bg-[#0d0e16]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <ScrollReveal className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">See what AI creates</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every word gets its own music video. Different language. Different style. Always unique.
          </p>
        </ScrollReveal>

        {/* Card strip with 3D perspective */}
        <motion.div
          className="flex gap-6 overflow-x-auto md:justify-center md:overflow-visible pb-4 px-2 snap-x snap-mandatory pg-scrollbar-hide"
          style={{ perspective: 800 }}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {DEMO_WORDS.map((w, i) => (
            <motion.div
              key={w.word}
              custom={i}
              variants={reducedMotion ? undefined : cardVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative w-52 h-72 rounded-xl overflow-hidden shrink-0 snap-center cursor-pointer group"
            >
              {/* Thumbnail (always present) */}
              <img
                src={w.thumbnail}
                alt={w.word}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />

              {/* Video on hover (desktop) — crossfades over thumbnail */}
              {hoveredIndex === i && (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover animate-[fade-in_0.4s_ease-out]"
                >
                  <source src={w.videoUrl} type="video/mp4" />
                </video>
              )}

              {/* Bottom gradient for text */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {/* Hover glow border */}
              <div className="absolute inset-0 rounded-xl border-2 border-white/0 group-hover:border-white/20 transition-colors duration-300" />

              {/* Content at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
                <p className="text-xs text-white/50">{w.flag} {w.language}</p>
                <p className="text-xl font-bold text-white">{w.word}</p>
                <p className="text-sm text-white/60">{w.translation}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
