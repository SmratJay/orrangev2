import type { Metadata } from 'next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import CallToActionSection from '@/components/landing/CallToActionSection';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'ORRANGE — P2P USDC to INR Settlement',
  description: 'Peer-to-peer crypto off-ramp. Convert USDC to INR instantly via verified merchants. No banks, no friction.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <LandingHeader />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CallToActionSection />
      <LandingFooter />
    </div>
  );
}
