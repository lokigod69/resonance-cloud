import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { DEMO_WORDS } from '@/components/landing/landingData'

const showcaseWords = [
  DEMO_WORDS[0],
  DEMO_WORDS[1],
  DEMO_WORDS[3],
  DEMO_WORDS[4],
  DEMO_WORDS[5],
  DEMO_WORDS[7],
  DEMO_WORDS[10],
  DEMO_WORDS[6],
].filter(Boolean)

export function SonandaMediaShowcase() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const reducedMotion = useReducedMotion()

  return (
    <section className="hybrid-a-media-section" aria-labelledby="hybrid-a-media-heading">
      <div className="hybrid-a-section-heading">
        <p>generated memory media</p>
        <h2 id="hybrid-a-media-heading">Words become visual anchors, sound, and motion.</h2>
      </div>
      <div className="hybrid-a-media-reel" aria-label="Generated vocabulary media examples">
        {showcaseWords.map((word, index) => (
          <motion.article
            className="hybrid-a-media-card"
            key={`${word.word}-${word.language}`}
            initial={reducedMotion ? undefined : { opacity: 0, y: 52, rotateX: 10, scale: 0.94 }}
            whileInView={reducedMotion ? undefined : { opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            whileHover={reducedMotion ? undefined : { y: -8, scale: 1.035 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.55, delay: index * 0.055, ease: 'easeOut' }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <img src={word.thumbnail} alt={`${word.word} generated thumbnail`} loading="lazy" />
            {hoveredIndex === index && (
              <video autoPlay muted loop playsInline>
                <source src={word.videoUrl} type="video/mp4" />
              </video>
            )}
            <div className="hybrid-a-media-card-gradient" aria-hidden="true" />
            <div className="hybrid-a-media-card-copy">
              <span>{word.language}</span>
              <strong>{word.word}</strong>
              <small>{word.translation}</small>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
