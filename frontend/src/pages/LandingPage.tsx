import HeroSection from '@/components/landing/HeroSection'
import ScrollStorySection from '@/components/landing/ScrollStorySection'
import VoiceTutorSection from '@/components/landing/VoiceTutorSection'
import LanguagesSection from '@/components/landing/LanguagesSection'
import CtaFooterSection from '@/components/landing/CtaFooterSection'

export default function LandingPage() {
  return (
    <div className="theme-cosmos min-h-screen bg-[var(--app-bg)] text-foreground">
      {/* Layer 1: Hero image only, fading down into page black */}
      <div className="absolute inset-x-0 top-0 z-0 h-screen bg-[var(--app-bg)]">
        <div
          className="cosmos-bg-mask-bottom h-full w-full bg-cover bg-center opacity-[0.85]"
          style={{ backgroundImage: "url('/brand/cosmos/cosmos-hero.webp')" }}
        />
      </div>

      {/* Layer 2: Hero - transparent, parallax text over image */}
      <div className="relative z-10">
        <HeroSection />
      </div>

      {/* Spacer: image fully visible before sections cover it */}
      <div className="relative z-10 h-[25vh]" />

      {/* Layer 3: Opaque sections scroll up over the fixed image */}
      <div className="relative z-20">
        {/* Gradient fade from transparent to section bg for smooth transition */}
        <div
          className="h-16"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--app-bg))' }}
        />
        <ScrollStorySection />
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
