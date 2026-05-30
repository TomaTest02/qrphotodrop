import PricingSection from '@/components/marketing/PricingSection';
import FAQ from '@/components/marketing/FAQ';
import CTABanner from '@/components/marketing/CTABanner';
import TechFlow from '@/components/marketing/TechFlow';
import EventSelectorDropdown from '@/components/marketing/EventSelectorDropdown';
import { QrCode, Stack, Link } from '@phosphor-icons/react';
import Image from 'next/image';
import styles from './event-type.module.css';


const CONTENT = {
  nunta: {
    title: 'Nuntă',
    hero: 'Nu aștepți 2 luni, ai sute de poze și clipuri WOW de la invitați chiar a 2-a zi după nuntă',
    desc: 'QRPhotoDrop transformă nunta ta într-un album digital viu. Invitații scanează codul QR, încarcă poze și clipuri direct din browser — fără aplicații, fără conturi.',
    bgImage: '/images/events/hero_nunta.png'
  },
  botez: {
    title: 'Botez',
    hero: 'Păstrează fiecare moment prețios din ziua botezului',
    desc: 'QRPhotoDrop îți oferă un album digital dedicat botezului. Nașii, bunicii și invitații trimit poze și urări dintr-o singură scanare.',
    bgImage: '/images/events/hero_botez.png'
  },
  aniversare: {
    title: 'Aniversare',
    hero: 'Surprinde fiecare moment al aniversării tale speciale',
    desc: 'Fie că e ziua ta, a partenerului sau a familiei — QRPhotoDrop adună pozele și urările într-un album digital elegant.',
    bgImage: '/images/events/hero_aniversare.png'
  },
  corporate: {
    title: 'Corporate',
    hero: 'Documentează teambuilding-uri, conferințe și gale corporate',
    desc: 'QRPhotoDrop oferă o soluție profesională pentru colectarea conținutului de la evenimentele corporate. Simplu, rapid, fără complicații tehnice.',
    bgImage: '/images/events/hero_corporate.png'
  },
};


export async function generateMetadata({ params }) {
  const { type } = await params;
  const content = CONTENT[type] || CONTENT.nunta;
  return {
    title: `QRPhotoDrop — ${content.title}`,
    description: content.desc,
  };
}

export default async function EventTypePage({ params }) {
  const { type } = await params;
  const content = CONTENT[type];

  if (!content) {
    return <div style={{ padding: '100px 20px', textAlign: 'center' }}><h1>Pagină negăsită</h1></div>;
  }

  return (
    <>
      {/* Hero */}
      <section className={styles.heroSection}>
        {content.bgImage && (
          <div className={styles.heroBgContainer}>
            <Image
              src={content.bgImage}
              alt={`Fundal ${content.title}`}
              fill
              priority
              className={styles.heroBgImage}
            />
            <div className={styles.heroBgOverlay} />
          </div>
        )}

        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>
            {content.title}
          </span>

          <h1 className={styles.title}>
            {content.hero}
          </h1>
          <p className={styles.desc}>
            {content.desc}
          </p>
          <div className={styles.ctaGroup}>
            <a href="/preturi" className={styles.primaryCta}>
              Vezi prețurile →
            </a>
            <a href="/upload/DEMO" className={styles.secondaryCta}>
              Încearcă DEMO
            </a>
          </div>
        </div>
      </section>

      {/* Acces options */}
      <section className={styles.accessSection}>
        <div className={styles.accessInner}>
          <h2 className={styles.accessTitle}>
            3 moduri de acces pentru invitați
          </h2>
          <div className={styles.accessGrid}>
            {[
              { icon: QrCode, title: 'Cod QR digital', desc: 'Trimis pe WhatsApp sau afișat pe ecran.' },
              { icon: Layers, title: 'Cartonașe fizice', desc: 'Printat pe cartonașe elegante pe masă.' },
              { icon: Link, title: 'Link direct', desc: 'Distribuit pe orice canal digital.' },
            ].map((item, i) => {
              const IconComponent = item.icon;
              return (
                <div key={i} className={styles.accessCard}>
                  <div className={styles.accessIconWrapper}>
                    <IconComponent size={28} className={styles.accessIcon} />
                  </div>
                  <h3 className={styles.accessCardTitle}>{item.title}</h3>
                  <p className={styles.accessCardDesc}>{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Technical Workflow Breakdown */}
      <TechFlow type={type} />

      <PricingSection defaultType={type} />
      <FAQ />
    </>
  );
}
