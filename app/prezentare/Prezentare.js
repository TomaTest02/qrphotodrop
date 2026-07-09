'use client';

import {
  QrCode, DeviceMobile, Images, Lock, Sparkle, Heart,
  CheckCircle, ArrowRight,
} from '@phosphor-icons/react';
import styles from './prezentare.module.css';

const STEPS = [
  {
    num: '01',
    Icon: QrCode,
    title: 'Pui codul QR pe mese',
    desc: 'Primești un cod QR unic pentru evenimentul tău. Îl pui pe mese, la intrare sau pe invitații — oriunde îl văd invitații.',
  },
  {
    num: '02',
    Icon: DeviceMobile,
    title: 'Invitații scanează și încarcă',
    desc: 'Cu telefonul, scanează codul și încarcă poze, clipuri și urări în câteva secunde. Fără aplicație instalată, fără cont creat.',
  },
  {
    num: '03',
    Icon: Images,
    title: 'Primești toate amintirile',
    desc: 'Pozele și clipurile se adună automat în contul tău. Le vezi și le descarci oricând, la calitate maximă.',
  },
];

const BENEFITS = [
  { Icon: CheckCircle, title: 'Fără aplicație', desc: 'Totul din browser. Invitații nu descarcă și nu instalează nimic.' },
  { Icon: Sparkle, title: 'Calitate originală', desc: 'Fișierele se păstrează la rezoluție maximă, fără compresie.' },
  { Icon: Lock, title: 'Album privat', desc: 'Amintirile ajung direct la tine, vizibile doar organizatorului.' },
  { Icon: Heart, title: 'Gata imediat', desc: 'Vezi pozele chiar în timpul evenimentului, nu peste luni.' },
];

export default function Prezentare() {
  return (
    <div className={styles.page}>
      {/* Bară de sus (fără meniu) */}
      <header className={styles.topbar}>
        <span className={styles.logo}>QRPhotoDrop</span>
        <a href="/contact" className={styles.topCta}>Contactează-ne</a>
      </header>

      {/* Hero */}
      <section className={`${styles.hero} ${styles.reveal}`}>
        <span className={styles.eyebrow}>Album digital pentru evenimente</span>
        <h1 className={styles.h1}>Toate pozele și clipurile de la invitați, adunate automat</h1>
        <p className={styles.subtitle}>
          Invitații scanează un cod QR și încarcă pozele, clipurile și urările direct de pe telefon —
          fără aplicație și fără cont. Tu le primești pe toate, organizate și gata de descărcat.
        </p>
        <div className={styles.heroActions}>
          <a href="/upload/DEMO" className={styles.btnPrimary}>
            Încearcă demo live <ArrowRight size={17} weight="bold" />
          </a>
          <a href="/preturi" className={styles.btnOutline}>Vezi prețuri</a>
        </div>
        <div className={styles.trust}>
          <span>Fără aplicație</span>
          <span className={styles.trustDot} />
          <span>Fără cont</span>
          <span className={styles.trustDot} />
          <span>Calitate originală</span>
        </div>
      </section>

      {/* Cei 3 pași */}
      <section className={styles.steps}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <span className={styles.eyebrow}>Simplu de tot</span>
            <h2 className={styles.sectionTitle}>Cum funcționează, în 3 pași</h2>
            <p className={styles.sectionDesc}>Fără instalări, fără complicații. Atât.</p>
          </div>

          <div className={styles.stepGrid}>
            {STEPS.map(({ num, Icon, title, desc }) => (
              <div key={num} className={styles.stepCard}>
                <span className={styles.stepNum}>{num}</span>
                <div className={styles.stepIcon}><Icon size={32} weight="light" /></div>
                <h3 className={styles.stepTitle}>{title}</h3>
                <p className={styles.stepDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* De ce QRPhotoDrop */}
      <section className={styles.why}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHead}>
            <span className={styles.eyebrow}>De ce QRPhotoDrop</span>
            <h2 className={styles.sectionTitle}>Simplu pentru invitați, complet pentru tine</h2>
          </div>

          <div className={styles.whyGrid}>
            {BENEFITS.map(({ Icon, title, desc }) => (
              <div key={title} className={styles.whyCard}>
                <div className={styles.whyIcon}><Icon size={26} weight="light" /></div>
                <div className={styles.whyTitle}>{title}</div>
                <p className={styles.whyDesc}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <span className={styles.ctaEyebrow}>Vezi cu ochii tăi</span>
          <h2 className={styles.ctaTitle}>Deschide un demo live în 10 secunde</h2>
          <p className={styles.ctaSubtitle}>
            Exact ce văd invitații tăi când scanează codul QR de pe masă.
          </p>
          <div className={styles.ctaActions}>
            <a href="/upload/DEMO" className={styles.ctaBtnPrimary}>
              Deschide demo <ArrowRight size={17} weight="bold" />
            </a>
            <a href="/contact" className={styles.ctaBtnOutline}>Contactează-ne</a>
          </div>
        </div>
      </section>

      {/* Footer minimal */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>QRPhotoDrop</div>
        <div>amintirile evenimentului tău · <a href="https://qrphotodrop.com" className={styles.footerLink}>qrphotodrop.com</a></div>
      </footer>
    </div>
  );
}
