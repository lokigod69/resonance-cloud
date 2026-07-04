import { useEffect, useRef, type PointerEvent } from 'react'
import HeroSection from '@/components/landing/HeroSection'
import ScrollStorySection from '@/components/landing/ScrollStorySection'
import FeatureConstellation from '@/components/landing/FeatureConstellation'
import VoiceTutorSection from '@/components/landing/VoiceTutorSection'
import LanguagesSection from '@/components/landing/LanguagesSection'
import CtaFooterSection from '@/components/landing/CtaFooterSection'
import { LingwaveWaves, type WaveRipple } from '@/components/branding/LingwaveWaves'
import { routeImports, scheduleIdleRoutePrefetch } from '@/routes/routeImports'

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export default function LandingPage() {
  const ripplesRef = useRef<WaveRipple[]>([])

  useEffect(() => {
    return scheduleIdleRoutePrefetch([routeImports.login], 1000)
  }, [])

  function handleHeroPointerDown(event: PointerEvent<HTMLDivElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) return

    const ripple: WaveRipple = {
      x: clamp01((event.clientX - bounds.left) / bounds.width),
      y: clamp01((event.clientY - bounds.top) / bounds.height),
      start: performance.now(),
    }

    ripplesRef.current = [...ripplesRef.current.slice(-7), ripple]
  }

  return (
    <div className="theme-cosmos relative min-h-screen bg-[var(--app-bg)] text-foreground">
      <div className="absolute inset-x-0 top-0 z-0 h-screen overflow-hidden bg-[var(--app-bg)]">
        <LingwaveWaves className="cosmos-bg-mask-bottom" ripplesRef={ripplesRef} />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 0%, transparent 44%, rgb(0 0 0 / 0.34) 100%)',
          }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent via-[var(--app-bg)]/72 to-[var(--app-bg)]"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10" onPointerDown={handleHeroPointerDown}>
        <HeroSection />
      </div>

      <div className="relative z-10 h-[25vh]" />

      <div className="relative z-20">
        <div
          className="h-16"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--app-bg))' }}
        />
        <ScrollStorySection />
        <div className="h-12 bg-[var(--app-bg)] md:h-16" aria-hidden="true" />
        <FeatureConstellation />
        <div className="h-12 bg-[var(--app-bg)] md:h-16" aria-hidden="true" />
        <VoiceTutorSection />
        <div className="h-12 bg-[var(--app-bg)] md:h-16" aria-hidden="true" />
        <LanguagesSection />
        <div className="h-12 bg-[var(--app-bg)] md:h-16" aria-hidden="true" />
        <CtaFooterSection />
      </div>
    </div>
  )
}
