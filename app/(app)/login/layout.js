// Pagină de aplicație — fără valoare în căutări, nu o indexăm.
export const metadata = {
  robots: { index: false, follow: true },
};

export default function LoginLayout({ children }) {
  return children;
}
