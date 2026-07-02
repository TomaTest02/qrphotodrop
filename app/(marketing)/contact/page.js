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
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'QRPhotoDrop',
  url: 'https://qrphotodrop.com',
  telephone: '+40774043791',
  email: 'contact@qrphotodrop.com',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Str. Ghe. Ghe. Manu 100', // TODO: UPDATE WITH ACTUAL ADDRESS
    addressLocality: 'Iași',
    addressRegion: 'IS',
    postalCode: '700000',
    addressCountry: 'RO',
  },
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
