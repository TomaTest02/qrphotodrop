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
  title: "QRPhotoDrop — Album Digital pentru Evenimente",
  description:
    "Colectează poze, clipuri și urări de la invitații tăi prin scanarea unui cod QR. Fără aplicație, fără cont. Simplu și elegant.",
  keywords: "album digital, QR, nuntă, botez, aniversare, corporate, poze invitați",
  openGraph: {
    title: "QRPhotoDrop — Album Digital pentru Evenimente",
    description:
      "Sute de poze și clipuri WOW de la invitați, chiar a 2-a zi după eveniment.",
    url: "https://qrphotodrop.ro",
    siteName: "QRPhotoDrop",
    locale: "ro_RO",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro" className={`${playfair.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
