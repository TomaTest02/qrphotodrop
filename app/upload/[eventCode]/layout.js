// Pagini private ale evenimentelor (invitați) — nu le indexăm în Google.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function UploadLayout({ children }) {
  return children;
}
