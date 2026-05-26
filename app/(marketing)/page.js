import Hero from '@/components/marketing/Hero';
import Stats from '@/components/marketing/Stats';
import HowItWorks from '@/components/marketing/HowItWorks';
import Mockup from '@/components/marketing/Mockup';
import EventTypes from '@/components/marketing/EventTypes';
import Features from '@/components/marketing/Features';
import Testimonials from '@/components/marketing/Testimonials';
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
      <Stats />
      <HowItWorks />
      <Mockup />
      <EventTypes />
      <Features />
      <Testimonials />
      <PricingSection />
      <FAQ />
      <CTABanner />
    </>
  );
}

