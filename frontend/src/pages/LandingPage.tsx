import HeroSection from '@/components/landing/HeroSection'
import ScrollStorySection from '@/components/landing/ScrollStorySection'
import LanguagesSection from '@/components/landing/LanguagesSection'
import CtaFooterSection from '@/components/landing/CtaFooterSection'
import { HERO_VIDEO_URL } from '@/components/landing/landingData'

export default function LandingPage() {
  return (
    <div className="min-h-screen text-foreground overflow-x-clip">
      {/* Layer 1: Fixed video background — stays behind everything */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-contain opacity-60"
        >
          <source src={HERO_VIDEO_URL} type="video/mp4" />
        </video>
      </div>

      {/* Layer 2: Hero — transparent, parallax text + vignette over video */}
      <div className="relative z-10">
        <HeroSection />
      </div>

      {/* Spacer: video fully visible for a moment before sections cover it */}
      <div className="relative z-10 h-[25vh]" />

      {/* Layer 3: Opaque sections scroll up over the fixed video */}
      <div className="relative z-20">
        {/* Gradient fade from transparent → section bg for smooth transition */}
        <div className="h-16 bg-gradient-to-b from-transparent to-[#0d0e16]" />
        <ScrollStorySection />
        <LanguagesSection />
        <CtaFooterSection />
      </div>
    </div>
  )
}
