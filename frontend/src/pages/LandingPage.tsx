import { useEffect } from 'react'
import LandingHero from '@/components/landing/LandingHero'
import WaveField from '@/components/landing/WaveField'
import TideStory from '@/components/landing/TideStory'
import CreatorRail from '@/components/landing/CreatorRail'
import ModePortals from '@/components/landing/ModePortals'
import MemoryMechanicSection from '@/components/landing/MemoryMechanicSection'
import LanguagesSection from '@/components/landing/LanguagesSection'
import FinalCTA from '@/components/landing/FinalCTA'
import { routeImports, scheduleIdleRoutePrefetch } from '@/routes/routeImports'

// The Tide of Memory — one continuous night sea. The hero's living water
// (pointer wind, wake, tap ripples, scroll coupling) hands off to the sticky
// tide story, the floating card rail, the mode portals, and finally the same
// sea at dawn. WaveField owns all hero interaction via window listeners.

export default function LandingPage() {
  useEffect(() => {
    return scheduleIdleRoutePrefetch([routeImports.login], 1000)
  }, [])

  return (
    <div className="theme-cosmos relative min-h-screen bg-[var(--app-bg)] text-foreground">
      <div className="absolute inset-x-0 top-0 z-0 h-screen overflow-hidden bg-[var(--app-bg)]">
        <WaveField className="cosmos-bg-mask-bottom" />
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

      <div className="relative z-10">
        <LandingHero />
      </div>

      <div className="relative z-10 h-[25vh]" />

      <div className="relative z-20">
        <div
          className="h-16"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--app-bg))' }}
        />
        <TideStory />
        <CreatorRail />
        <ModePortals />
        <MemoryMechanicSection />
        <LanguagesSection />
        <FinalCTA />
      </div>
    </div>
  )
}
