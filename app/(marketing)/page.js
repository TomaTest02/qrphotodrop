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
    canonical: 'https://qrphotodrop.com',
  },
  openGraph: {
    title: 'QRPhotoDrop — Album Digital pentru Evenimente',
    description: 'Sute de poze și clipuri WOW de la invitați, chiar a 2-a zi după eveniment. Fără aplicație, fără cont.',
    url: 'https://qrphotodrop.com',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'QRPhotoDrop — Album Digital pentru Evenimente' }],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://qrphotodrop.com/#organization',
      name: 'QRPhotoDrop',
      url: 'https://qrphotodrop.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://qrphotodrop.com/og-image.jpg',
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
      '@id': 'https://qrphotodrop.com/#website',
      url: 'https://qrphotodrop.com',
      name: 'QRPhotoDrop',
      publisher: { '@id': 'https://qrphotodrop.com/#organization' },
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

