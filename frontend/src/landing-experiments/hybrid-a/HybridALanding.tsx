import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import ScrollReveal from '@/components/landing/ScrollReveal'
import { FeatureCard } from './assets/FeatureCard'
import { LanguagePills } from './assets/LanguagePills'
import { ModalityGlyphs } from './assets/ModalityGlyphs'
import { SonandaMediaShowcase } from './assets/SonandaMediaShowcase'
import { SonandaInstrumentMockup } from './assets/SonandaInstrumentMockup'
import { SonandaScrollStory } from './assets/SonandaScrollStory'
import { hybridACopy, hybridAFeatures } from './copy'
import { HybridAExperimentShell } from './HybridAExperimentShell'

export default function HybridALanding() {
  const reducedMotion = useReducedMotion()
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 520], [0, -175])
  const heroOpacity = useTransform(scrollY, [0, 420], [1, 0])
  const mockupY = useTransform(scrollY, [0, 620], [0, 105])
  const mockupScale = useTransform(scrollY, [0, 620], [1, 1.08])
  const fixedMediaOpacity = useTransform(scrollY, [0, 520, 1700], [0.62, 0.36, 0.16])
  const fixedMediaScale = useTransform(scrollY, [0, 1200], [1, 1.08])

  return (
    <HybridAExperimentShell>
      <motion.div
        className="hybrid-a-fixed-media"
        style={reducedMotion ? undefined : { opacity: fixedMediaOpacity, scale: fixedMediaScale }}
        aria-hidden="true"
      />

      <section className="hybrid-a-hero" aria-labelledby="hybrid-a-title">
        <nav className="hybrid-a-nav" aria-label="Landing experiment">
          <a className="hybrid-a-wordmark" href="/a" aria-label="sonanda.studio home">
            {hybridACopy.wordmark}
          </a>
        </nav>

        <div className="hybrid-a-hero-grid">
          <motion.div
            className="hybrid-a-hero-copy"
            style={reducedMotion ? undefined : { y: heroY, opacity: heroOpacity }}
          >
            <p className="hybrid-a-kicker">Precision memory instrument</p>
            <h1 id="hybrid-a-title">
              Make words resonate<span>.</span>
            </h1>
            <p className="hybrid-a-hero-body">{hybridACopy.heroBody}</p>
            <div className="hybrid-a-actions" aria-label="Primary actions">
              <button className="hybrid-a-button hybrid-a-button-primary" type="button">
                {hybridACopy.primaryCta}
              </button>
              <button className="hybrid-a-button hybrid-a-button-secondary" type="button">
                {hybridACopy.secondaryCta}
              </button>
            </div>
          </motion.div>
          <motion.div
            className="hybrid-a-hero-instrument-wrap"
            style={reducedMotion ? undefined : { y: mockupY, scale: mockupScale }}
          >
            <SonandaInstrumentMockup />
          </motion.div>
        </div>
      </section>

      <SonandaMediaShowcase />
      <SonandaScrollStory />

      <section className="hybrid-a-section" aria-labelledby="hybrid-a-instrument-heading">
        <ScrollReveal className="hybrid-a-section-heading" direction="blur">
          <p>the instrument</p>
          <h2 id="hybrid-a-instrument-heading">A focused loop for making vocabulary available.</h2>
        </ScrollReveal>
        <div className="hybrid-a-feature-grid">
          {hybridAFeatures.map((feature, index) => (
            <ScrollReveal key={feature.title} delay={index * 0.08}>
              <FeatureCard index={index + 1} title={feature.title} body={feature.body} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="hybrid-a-section hybrid-a-surfaces-section" aria-labelledby="hybrid-a-surfaces-heading">
        <ScrollReveal className="hybrid-a-section-heading" direction="blur">
          <p>product surfaces</p>
          <h2 id="hybrid-a-surfaces-heading">Cards, sound, speech, and study modes in one studio system.</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <ModalityGlyphs />
        </ScrollReveal>
      </section>

      <section className="hybrid-a-section hybrid-a-language-section" aria-labelledby="hybrid-a-languages-heading">
        <ScrollReveal className="hybrid-a-section-heading" direction="blur">
          <p>languages supported</p>
          <h2 id="hybrid-a-languages-heading">Built for multilingual study.</h2>
        </ScrollReveal>
        <ScrollReveal delay={0.08}>
          <LanguagePills />
        </ScrollReveal>
      </section>

      <section className="hybrid-a-quote-section" aria-label="Editorial quote">
        <ScrollReveal direction="blur">
          <blockquote>{hybridACopy.quote}</blockquote>
        </ScrollReveal>
      </section>

      <footer className="hybrid-a-footer">
        <a className="hybrid-a-wordmark" href="/a" aria-label="sonanda.studio home">
          {hybridACopy.wordmark}
        </a>
        <p>© 2026 Sonanda. All rights reserved.</p>
      </footer>
    </HybridAExperimentShell>
  )
}
