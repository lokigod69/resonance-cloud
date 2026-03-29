import HeroSection from '@/components/landing/HeroSection'
import DemoReelSection from '@/components/landing/DemoReelSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import LanguagesSection from '@/components/landing/LanguagesSection'
import CtaFooterSection from '@/components/landing/CtaFooterSection'

export default function LandingPage() {
  return (
    <div className="min-h-screen gradient-bg text-foreground overflow-x-hidden">
      <HeroSection />
      <DemoReelSection />
      <HowItWorksSection />
      <LanguagesSection />
      <CtaFooterSection />
    </div>
  )
}
