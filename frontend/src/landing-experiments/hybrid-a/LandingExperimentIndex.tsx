import { HybridAExperimentShell } from './HybridAExperimentShell'

export default function LandingExperimentIndex() {
  return (
    <HybridAExperimentShell>
      <section className="hybrid-a-index" aria-labelledby="landing-experiments-title">
        <a className="hybrid-a-wordmark" href="/a">
          Sonanda
        </a>
        <div className="hybrid-a-index-panel">
          <p className="hybrid-a-kicker">landing experiments</p>
          <h1 id="landing-experiments-title">Hybrid directions</h1>
          <div className="hybrid-a-index-grid">
            <a className="hybrid-a-index-item is-active" href="/landing/a">
              <span>A</span>
              <strong>Hybrid A - Studio Instrument</strong>
              <small>Active preview</small>
            </a>
            <div className="hybrid-a-index-item" aria-disabled="true">
              <span>B</span>
              <strong>Placeholder</strong>
              <small>Not built</small>
            </div>
            <div className="hybrid-a-index-item" aria-disabled="true">
              <span>C</span>
              <strong>Placeholder</strong>
              <small>Not built</small>
            </div>
          </div>
        </div>
      </section>
    </HybridAExperimentShell>
  )
}
