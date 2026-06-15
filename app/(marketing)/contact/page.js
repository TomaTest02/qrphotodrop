import ContactForm from './ContactForm';

export const metadata = {
  title: 'Contact',
  description: 'Contactează echipa QRPhotoDrop. Răspundem rapid cu o ofertă personalizată pentru evenimentul tău.',
  alternates: {
    canonical: 'https://qrphotodrop.ro/contact',
  },
  openGraph: {
    title: 'Contact — QRPhotoDrop',
    description: 'Contactează echipa QRPhotoDrop. Răspundem rapid cu o ofertă personalizată.',
    url: 'https://qrphotodrop.ro/contact',
    type: 'website',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'QRPhotoDrop',
  url: 'https://qrphotodrop.ro',
  telephone: '+40774043791',
  email: 'contact@qrphotodrop.ro',
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
  servesCuisine: 'n/a',
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
