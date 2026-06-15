export const metadata = {
  title: 'Sanity Studio',
  description: 'Sanity Studio CMS',
  robots: {
    index: false,
    follow: false,
  },
};

export default function StudioLayout({ children }) {
  return <>{children}</>;
}
