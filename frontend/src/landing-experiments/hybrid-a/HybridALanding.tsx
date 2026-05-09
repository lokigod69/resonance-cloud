import { FeatureCard } from './assets/FeatureCard'
import { LanguagePills } from './assets/LanguagePills'
import { ModalityGlyphs } from './assets/ModalityGlyphs'
import { ResonanceInstrumentMockup } from './assets/ResonanceInstrumentMockup'
import { hybridACopy, hybridAFeatures } from './copy'
import { HybridAExperimentShell } from './HybridAExperimentShell'

export default function HybridALanding() {
  return (
    <HybridAExperimentShell>
      <section className="hybrid-a-hero" aria-labelledby="hybrid-a-title">
        <nav className="hybrid-a-nav" aria-label="Landing experiment">
          <a className="hybrid-a-wordmark" href="/a" aria-label="resonance.pro home">
            {hybridACopy.wordmark}
          </a>
        </nav>

        <div className="hybrid-a-hero-grid">
          <div className="hybrid-a-hero-copy">
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
          </div>
          <ResonanceInstrumentMockup />
        </div>
      </section>

      <section className="hybrid-a-section" aria-labelledby="hybrid-a-instrument-heading">
        <div className="hybrid-a-section-heading">
          <p>the instrument</p>
          <h2 id="hybrid-a-instrument-heading">A focused loop for making vocabulary available.</h2>
        </div>
        <div className="hybrid-a-feature-grid">
          {hybridAFeatures.map((feature, index) => (
            <FeatureCard key={feature.title} index={index + 1} title={feature.title} body={feature.body} />
          ))}
        </div>
      </section>

      <section className="hybrid-a-section hybrid-a-surfaces-section" aria-labelledby="hybrid-a-surfaces-heading">
        <div className="hybrid-a-section-heading">
          <p>product surfaces</p>
          <h2 id="hybrid-a-surfaces-heading">Cards, sound, speech, and study modes in one studio system.</h2>
        </div>
        <ModalityGlyphs />
      </section>

      <section className="hybrid-a-section hybrid-a-language-section" aria-labelledby="hybrid-a-languages-heading">
        <div className="hybrid-a-section-heading">
          <p>languages supported</p>
          <h2 id="hybrid-a-languages-heading">Built for multilingual study.</h2>
        </div>
        <LanguagePills />
      </section>

      <section className="hybrid-a-quote-section" aria-label="Editorial quote">
        <blockquote>{hybridACopy.quote}</blockquote>
      </section>

      <footer className="hybrid-a-footer">
        <a className="hybrid-a-wordmark" href="/a" aria-label="resonance.pro home">
          {hybridACopy.wordmark}
        </a>
        <p>© 2026 Resonance. All rights reserved.</p>
      </footer>
    </HybridAExperimentShell>
  )
}
