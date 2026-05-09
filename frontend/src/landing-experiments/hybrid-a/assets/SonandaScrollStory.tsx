import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { DEMO_WORDS } from '@/components/landing/landingData'
import { hybridAFeatures } from '../copy'
import { FeatureCard } from './FeatureCard'
import { SonandaInstrumentMockup } from './SonandaInstrumentMockup'
import { WaveformSignature } from './WaveformSignature'

const storyWords = [DEMO_WORDS[0], DEMO_WORDS[1], DEMO_WORDS[3], DEMO_WORDS[4], DEMO_WORDS[5], DEMO_WORDS[7]].filter(Boolean)

type StoryWord = (typeof storyWords)[number]

function StoryMediaCard({ word }: { word: StoryWord }) {
  return (
    <article className="hybrid-a-story-card">
      <img src={word.thumbnail} alt="" loading="lazy" />
      <div className="hybrid-a-story-card-copy">
        <span>{word.language}</span>
        <strong>{word.word}</strong>
      </div>
    </article>
  )
}

export function SonandaScrollStory() {
  const containerRef = useRef<HTMLElement>(null)
  const reducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const [isDesktop, setIsDesktop] = useState(false)
  const [scrollMetrics, setScrollMetrics] = useState({ start: 0, travel: 1600 })

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 920px)')
    const updateDesktop = () => setIsDesktop(mq.matches)
    updateDesktop()
    mq.addEventListener('change', updateDesktop)
    return () => mq.removeEventListener('change', updateDesktop)
  }, [])

  useEffect(() => {
    const updateMetrics = () => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setScrollMetrics({
        start: rect.top + window.scrollY,
        travel: window.innerHeight * 1.85,
      })
    }

    updateMetrics()
    window.addEventListener('resize', updateMetrics)
    return () => window.removeEventListener('resize', updateMetrics)
  }, [])

  const progress = useTransform(scrollY, [scrollMetrics.start, scrollMetrics.start + scrollMetrics.travel], [0, 1])
  const mediaScale = useTransform(progress, [0, 0.12], [0.72, 1])
  const mediaOpacity = useTransform(progress, [0, 0.08, 0.24, 0.36], [0.45, 1, 1, 0])
  const leftX = useTransform(progress, [0.12, 0.34], [0, -980])
  const rightX = useTransform(progress, [0.12, 0.34], [0, 980])
  const stageOpacity = useTransform(progress, [0.28, 0.42, 0.88, 1], [0, 1, 1, 0])
  const stageScale = useTransform(progress, [0.28, 0.48], [0.84, 1])
  const stageY = useTransform(progress, [0.28, 0.88], [80, -30])
  const headingOpacity = useTransform(progress, [0.02, 0.18, 0.30], [1, 1, 0])
  const instrumentOpacity = useTransform(progress, [0.34, 0.48], [0, 1])
  const featureOpacity = useTransform(progress, [0.46, 0.62], [0, 1])
  const waveformOpacity = useTransform(progress, [0.62, 0.76], [0, 1])

  if (!isDesktop || reducedMotion === true) {
    return (
      <section className="hybrid-a-scroll-story hybrid-a-scroll-story-static" aria-labelledby="hybrid-a-story-heading">
        <div className="hybrid-a-section-heading">
          <p>how it moves</p>
          <h2 id="hybrid-a-story-heading">A word becomes a field of cues.</h2>
        </div>
        <div className="hybrid-a-story-static-grid">
          {storyWords.slice(0, 4).map((word) => (
            <StoryMediaCard key={word.word} word={word} />
          ))}
        </div>
        <SonandaInstrumentMockup />
      </section>
    )
  }

  return (
    <section ref={containerRef} className="hybrid-a-scroll-story" aria-labelledby="hybrid-a-story-heading">
      <div className="hybrid-a-scroll-stage">
        <motion.div className="hybrid-a-story-heading" style={{ opacity: headingOpacity }}>
          <p>how it moves</p>
          <h2 id="hybrid-a-story-heading">A word becomes a field of cues.</h2>
        </motion.div>

        <div className="hybrid-a-story-media-layer" aria-hidden="true">
          <motion.div className="hybrid-a-story-row" style={{ x: leftX, opacity: mediaOpacity, scale: mediaScale }}>
            {storyWords.slice(0, 3).map((word) => (
              <StoryMediaCard key={word.word} word={word} />
            ))}
          </motion.div>
          <motion.div className="hybrid-a-story-row" style={{ x: rightX, opacity: mediaOpacity, scale: mediaScale }}>
            {storyWords.slice(3).map((word) => (
              <StoryMediaCard key={word.word} word={word} />
            ))}
          </motion.div>
        </div>

        <motion.div className="hybrid-a-story-product-layer" style={{ opacity: stageOpacity, scale: stageScale, y: stageY }}>
          <motion.div style={{ opacity: instrumentOpacity }} className="hybrid-a-story-instrument-wrap">
            <SonandaInstrumentMockup />
          </motion.div>
          <motion.div style={{ opacity: featureOpacity }} className="hybrid-a-story-feature-strip">
            {hybridAFeatures.map((feature, index) => (
              <FeatureCard key={feature.title} index={index + 1} title={feature.title} body={feature.body} />
            ))}
          </motion.div>
          <motion.div className="hybrid-a-story-wave-wrap" style={{ opacity: waveformOpacity }} aria-hidden="true">
            <WaveformSignature />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
