import { Playfair_Display, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  display: "swap",
  preload: true,
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
  preload: true,
});

export const metadata = {
  metadataBase: new URL('https://qrphotodrop.com'),
  title: {
    default: 'QRPhotoDrop — Album Digital pentru Evenimente',
    template: '%s — QRPhotoDrop',
  },
  description:
    'Colectează poze, clipuri și urări de la invitații tăi prin scanarea unui cod QR. Fără aplicație, fără cont. Simplu și elegant.',
  keywords: ['album digital', 'QR code nuntă', 'poze invitați', 'botez', 'aniversare', 'corporate', 'fotografii eveniment', 'cod QR'],
  authors: [{ name: 'QRPhotoDrop', url: 'https://qrphotodrop.com' }],
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
    url: 'https://qrphotodrop.com',
    siteName: 'QRPhotoDrop',
    locale: 'ro_RO',
    type: 'website',
    images: [
      {
        url: '/og-image.svg',
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
    images: ['/og-image.svg'],
  },
  alternates: {
    canonical: 'https://qrphotodrop.com',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
