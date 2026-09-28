// Pagină de aplicație — fără valoare în căutări, nu o indexăm.
export const metadata = {
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({ children }) {
  return children;
}
