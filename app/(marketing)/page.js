import Hero from '@/components/marketing/Hero';
import HowItWorks from '@/components/marketing/HowItWorks';
import EventTypes from '@/components/marketing/EventTypes';
import PricingSection from '@/components/marketing/PricingSection';
import FAQ from '@/components/marketing/FAQ';
import CTABanner from '@/components/marketing/CTABanner';

export const metadata = {
  title: 'QRPhotoDrop — Album Digital pentru Evenimente',
  description: 'Sute de poze și clipuri WOW de la invitați, chiar a 2-a zi după eveniment. Fără aplicație, fără cont.',
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <EventTypes />
      <PricingSection />
      <FAQ />
      <CTABanner />
    </>
  );
}
