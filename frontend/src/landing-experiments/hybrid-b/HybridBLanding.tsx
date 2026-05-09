import { useEffect } from 'react'
import './hybridB.css'

export default function HybridBLanding() {
  useEffect(() => {
    document.title = 'Sonanda — Hybrid B Voyage'
  }, [])

  return (
    <main className="hybrid-b-route" aria-label="Sonanda Hybrid B landing experiment">
      <iframe
        className="hybrid-b-frame"
        src="/landing/hybrid-b/Sonanda.html"
        title="Sonanda Hybrid B - Voyage Direction"
      />
    </main>
  )
}
