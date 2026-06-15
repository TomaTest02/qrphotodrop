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

export const revalidate = 3600; // ISR: regenerează la fiecare oră

export const metadata = {
  title: 'QRPhotoDrop — Album Digital pentru Evenimente',
  description: 'Sute de poze și clipuri WOW de la invitați, chiar a 2-a zi după eveniment. Fără aplicație, fără cont.',
  alternates: {
    canonical: 'https://qrphotodrop.ro',
  },
  openGraph: {
    title: 'QRPhotoDrop — Album Digital pentru Evenimente',
    description: 'Sute de poze și clipuri WOW de la invitați, chiar a 2-a zi după eveniment. Fără aplicație, fără cont.',
    url: 'https://qrphotodrop.ro',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://qrphotodrop.ro/#organization',
      name: 'QRPhotoDrop',
      url: 'https://qrphotodrop.ro',
      logo: {
        '@type': 'ImageObject',
        url: 'https://qrphotodrop.ro/og-image.jpg',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+40774043791',
        contactType: 'customer service',
        availableLanguage: 'Romanian',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://qrphotodrop.ro/#website',
      url: 'https://qrphotodrop.ro',
      name: 'QRPhotoDrop',
      publisher: { '@id': 'https://qrphotodrop.ro/#organization' },
      inLanguage: 'ro-RO',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Cum funcționează QRPhotoDrop?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Invitații scanează codul QR de pe masă cu camera telefonului și pot încărca poze, clipuri și urări direct din browser, fără aplicație.',
          },
        },
        {
          '@type': 'Question',
          name: 'Cât timp sunt disponibile pozele?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Pozele sunt disponibile 1-3 luni după eveniment, în funcție de pachetul ales (Basic: 1 lună, Standard: 2 luni, Premium: 3 luni).',
          },
        },
        {
          '@type': 'Question',
          name: 'Este nevoie de o aplicație pentru invitați?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Nu, invitații nu au nevoie de nicio aplicație. Totul funcționează direct din browser, prin scanarea codului QR.',
          },
        },
      ],
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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

