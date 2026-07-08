import PricingSection from '@/components/marketing/PricingSection';

export const revalidate = 3600; // ISR: 1 oră

export const metadata = {
  title: 'Prețuri',
  description: 'Pachete transparente pentru nuntă, botez, aniversare și corporate. Fără costuri ascunse. De la 249 RON.',
  alternates: {
    canonical: 'https://qrphotodrop.com/preturi',
  },
  openGraph: {
    title: 'Prețuri — QRPhotoDrop',
    description: 'Pachete transparente pentru nuntă, botez, aniversare și corporate. Fără costuri ascunse.',
    url: 'https://qrphotodrop.com/preturi',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'QRPhotoDrop — Prețuri' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prețuri — QRPhotoDrop',
    description: 'Pachete transparente pentru nuntă, botez, aniversare și corporate. Fără costuri ascunse.',
    images: ['/og-image.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'Pachete QRPhotoDrop',
  description: 'Pachete pentru colectarea pozelor la evenimente',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      item: {
        '@type': 'Offer',
        name: 'Pachet Basic',
        description: 'Până la 100 invitați, 75 GB stocare, 1 lună disponibilitate',
        price: '279',
        priceCurrency: 'RON',
        url: 'https://qrphotodrop.com/preturi',
      },
    },
    {
      '@type': 'ListItem',
      position: 2,
      item: {
        '@type': 'Offer',
        name: 'Pachet Standard',
        description: 'Până la 250 invitați, 150 GB stocare, 2 luni disponibilitate',
        price: '399',
        priceCurrency: 'RON',
        url: 'https://qrphotodrop.com/preturi',
      },
    },
    {
      '@type': 'ListItem',
      position: 3,
      item: {
        '@type': 'Offer',
        name: 'Pachet Premium',
        description: 'Până la 500 invitați, 200 GB stocare, 3 luni disponibilitate',
        price: '649',
        priceCurrency: 'RON',
        url: 'https://qrphotodrop.com/preturi',
      },
    },
  ],
};

export default function PreturiPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PricingSection />
    </>
  );
}
