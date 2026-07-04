import ContactForm from './ContactForm';

export const metadata = {
  title: 'Contact',
  description: 'Contactează echipa QRPhotoDrop. Răspundem rapid cu o ofertă personalizată pentru evenimentul tău.',
  alternates: {
    canonical: 'https://qrphotodrop.com/contact',
  },
  openGraph: {
    title: 'Contact — QRPhotoDrop',
    description: 'Contactează echipa QRPhotoDrop. Răspundem rapid cu o ofertă personalizată.',
    url: 'https://qrphotodrop.com/contact',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'QRPhotoDrop — Contact' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Contact — QRPhotoDrop',
    description: 'Contactează echipa QRPhotoDrop. Răspundem rapid cu o ofertă personalizată.',
    images: ['/og-image.png'],
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'QRPhotoDrop',
  url: 'https://qrphotodrop.com',
  telephone: '+40720726619',
  email: 'qrphotodrop@gmail.com',
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '09:00',
      closes: '18:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Saturday', 'Sunday'],
      opens: '10:00',
      closes: '16:00',
    },
  ],
  priceRange: '249-559 RON',
  areaServed: 'România',
  inLanguage: 'ro-RO',
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ContactForm />
    </>
  );
}
