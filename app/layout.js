import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  style: ["normal", "italic"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata = {
  metadataBase: new URL('https://qrphotodrop.ro'),
  title: {
    default: 'QRPhotoDrop — Album Digital pentru Evenimente',
    template: '%s — QRPhotoDrop',
  },
  description:
    'Colectează poze, clipuri și urări de la invitații tăi prin scanarea unui cod QR. Fără aplicație, fără cont. Simplu și elegant.',
  keywords: ['album digital', 'QR code nuntă', 'poze invitați', 'botez', 'aniversare', 'corporate', 'fotografii eveniment', 'cod QR'],
  authors: [{ name: 'QRPhotoDrop', url: 'https://qrphotodrop.ro' }],
  creator: 'QRPhotoDrop',
  publisher: 'QRPhotoDrop',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    title: 'QRPhotoDrop — Album Digital pentru Evenimente',
    description:
      'Sute de poze și clipuri WOW de la invitați, chiar a 2-a zi după eveniment.',
    url: 'https://qrphotodrop.ro',
    siteName: 'QRPhotoDrop',
    locale: 'ro_RO',
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'QRPhotoDrop — Album Digital pentru Evenimente',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QRPhotoDrop — Album Digital pentru Evenimente',
    description: 'Sute de poze și clipuri WOW de la invitați, chiar a 2-a zi după eveniment.',
    images: ['/og-image.jpg'],
  },
  alternates: {
    canonical: 'https://qrphotodrop.ro',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro" className={`${playfair.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
