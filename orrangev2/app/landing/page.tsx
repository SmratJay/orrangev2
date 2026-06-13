import type { Metadata } from 'next';
import { LandingHeader } from '@/components/landing/LandingHeader';
import HeroSection from '@/components/landing/HeroSection';
import { SettlementArchitecture } from '@/components/landing/SettlementArchitecture';
import { ComparisonSection } from '@/components/landing/ComparisonSection';
import CallToActionSection from '@/components/landing/CallToActionSection';
import LandingFooter from '@/components/landing/LandingFooter';

export const metadata: Metadata = {
  title: 'ORRANGE — The Fastest Way to Settle Crypto',
  description: 'Convert USDC to INR in under 2 minutes. Non-custodial P2P settlement with 48+ verified merchants. Smart contract secured.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <LandingHeader />
      <HeroSection />
      <SettlementArchitecture />
      <ComparisonSection />
      <CallToActionSection />
      <LandingFooter />
    </div>
  );
}
