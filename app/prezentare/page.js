import Prezentare from './Prezentare';

export const metadata = {
  title: 'Album digital pentru evenimente',
  description:
    'Invitații scanează un cod QR și încarcă poze, clipuri și urări direct de pe telefon — fără aplicație, fără cont. Vezi cum funcționează, în 3 pași simpli.',
  // Pagină de prezentare pentru vânzări — se dă prin link direct, nu prin Google
  robots: { index: false, follow: false },
};

export default function PrezentarePage() {
  return <Prezentare />;
}
