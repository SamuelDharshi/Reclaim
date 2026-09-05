import { Navbar } from '@/components/landing/Navbar'
import { HeroSection } from '@/components/landing/HeroSection'
import { ProblemSection } from '@/components/landing/ProblemSection'
import { HowItWorksSection } from '@/components/landing/HowItWorksSection'
import { GuardrailsSection } from '@/components/landing/GuardrailsSection'
import { DemoSection } from '@/components/landing/DemoSection'
import { FooterSection } from '@/components/landing/FooterSection'

export default function LandingPage() {
  return (
    <div className="dark" style={{ background: '#020617' }}>
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <GuardrailsSection />
        <DemoSection />
      </main>
      <FooterSection />
    </div>
  )
}
