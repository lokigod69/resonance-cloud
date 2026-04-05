import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DEMO_WORDS } from './landingData'
import ScrollReveal from './ScrollReveal'
import WaveformDivider from './WaveformDivider'
import { FlagIcon } from '@/components/ui/FlagIcon'

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const reducedMotion = useReducedMotion()

  function CardSlot({ w, i, indexOffset = 0 }: { w: typeof DEMO_WORDS[0]; i: number; indexOffset?: number }) {
    const absIndex = indexOffset + i
    return (
      <motion.div
        key={w.word}
        custom={i}
        variants={reducedMotion ? undefined : cardVariants}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        onMouseEnter={() => setHoveredIndex(absIndex)}
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
        {hoveredIndex === absIndex && (
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
          <p className="text-xs text-white/50"><FlagIcon code={w.language} className="w-4 h-auto" /> {w.language}</p>
          <p className="text-xl font-bold text-white">{w.word}</p>
          <p className="text-sm text-white/60">{w.translation}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <section className="py-24 px-6 bg-[#0d0e16]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <ScrollReveal className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">See what AI creates</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Every word becomes a unique music video. Run it on automatic or choose your own style, genre, and creative direction.
          </p>
        </ScrollReveal>

        {/* Mobile: single horizontal scroll strip, all 12 cards */}
        <div className="md:hidden">
          <motion.div
            className="flex gap-6 overflow-x-auto pb-4 px-2 snap-x snap-mandatory pg-scrollbar-hide"
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

        {/* Desktop: two rows of 6 with waveform divider */}
        <div className="hidden md:block space-y-2">
          <motion.div
            className="flex gap-6 justify-center"
            style={{ perspective: 800 }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {ROW_1.map((w, i) => (
              <CardSlot key={w.word} w={w} i={i} indexOffset={0} />
            ))}
          </motion.div>

          <WaveformDivider />

          <motion.div
            className="flex gap-6 justify-center"
            style={{ perspective: 800 }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
          >
            {ROW_2.map((w, i) => (
              <CardSlot key={w.word} w={w} i={i} indexOffset={6} />
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
