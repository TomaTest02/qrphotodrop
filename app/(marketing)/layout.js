import Navbar from '@/components/marketing/Navbar';
import Footer from '@/components/marketing/Footer';
import SmoothScroll from '@/components/SmoothScroll';

export default function MarketingLayout({ children }) {
  return (
    <SmoothScroll>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </SmoothScroll>
  );
}
