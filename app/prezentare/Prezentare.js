'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  QrCode, Lock, Sparkle, Heart,
  CheckCircle, ArrowRight, Check,
} from '@phosphor-icons/react';
import styles from './prezentare.module.css';

gsap.registerPlugin(ScrollTrigger);

const DESIGNS = [
  { src: '/images/designs/boho.jpg', name: 'Boho' },
  { src: '/images/designs/floral-roz.jpg', name: 'Floral Roz' },
  { src: '/images/designs/auriu-elegant.jpg', name: 'Auriu Elegant' },
  { src: '/images/designs/negru-auriu.jpg', name: 'Negru & Auriu' },
  { src: '/images/designs/verde-botanic.jpg', name: 'Verde Botanic' },
];

const BENEFITS = [
  { Icon: CheckCircle, title: 'Fără aplicație', desc: 'Totul din browser. Invitații nu descarcă și nu instalează nimic.' },
  { Icon: Sparkle, title: 'Calitate originală', desc: 'Fișierele se păstrează la rezoluție maximă, fără compresie.' },
  { Icon: Lock, title: 'Album privat', desc: 'Amintirile ajung direct la tine, vizibile doar organizatorului.' },
  { Icon: Heart, title: 'Gata imediat', desc: 'Vezi pozele chiar în timpul evenimentului, nu peste luni.' },
];

export default function Prezentare() {
  const root = useRef(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = gsap.context(() => {
      // Reveal direcțional / fade la scroll
      gsap.utils.toArray('[data-reveal]').forEach((el) => {
        const t = el.dataset.reveal;
        const vars = {
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        };
        if (t === 'left') vars.x = -55;
        else if (t === 'right') vars.x = 55;
        else if (t === 'pop') { vars.scale = 0.3; vars.duration = 0.6; vars.ease = 'back.out(1.7)'; }
        else vars.y = 45;
        gsap.from(el, vars);
      });

      // Grupuri în cascadă (stagger)
      gsap.utils.toArray('[data-stagger]').forEach((c) => {
        gsap.from(c.children, {
          y: 40, opacity: 0, duration: 0.7, ease: 'power2.out', stagger: 0.12,
          scrollTrigger: { trigger: c, start: 'top 85%', once: true },
        });
      });

      // Plutire delicată pe accente
      gsap.utils.toArray('[data-float]').forEach((el, i) => {
        gsap.to(el, { y: '+=10', duration: 3 + i * 0.4, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <div className={styles.page} ref={root}>
      {/* Bară de sus (fără meniu) */}
      <header className={styles.topbar}>
        <span className={styles.logo}>QRPhotoDrop</span>
        <a href="/contact" className={styles.topCta}>Contactează-ne</a>
      </header>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroText} data-stagger>
            <span className={styles.eyebrow}>Album digital pentru evenimente</span>
            <h1 className={styles.h1}>Toate pozele de la invitați, adunate singure.</h1>
            <p className={styles.subtitle}>
              Invitații scanează un cod QR și încarcă pozele, clipurile și urările direct de pe telefon —
              fără aplicație, fără cont. Tu le primești pe toate, gata organizate.
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
          </div>

          <div className={styles.heroVisual} data-reveal="right">
            <img className={styles.heroPhoto} src="/images/hero/wedding.jpg" alt="Cuplu la nuntă" />
            <div className={styles.heroBadge} data-float>
              <span className={styles.heroBadgeQr}><QrCode size={26} weight="light" /></span>
              <span className={styles.heroBadgeText}>
                <strong>Scan & Share</strong>
                <span>218 amintiri adunate</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PAS 1 — QR pe mese */}
      <section className={`${styles.slide} ${styles.slideAlt}`}>
        <div className={styles.slideGrid}>
          <div className={styles.slideVisual} data-reveal="left">
            <span className={styles.slideNum} data-reveal="pop">1</span>
            <img className={styles.slidePhoto} src="/images/mockups/classic_burgundy.png" alt="Cartonaș cu cod QR pe masă" />
          </div>
          <div className={styles.slideText} data-reveal="right">
            <span className={styles.slideKicker}>Pasul întâi</span>
            <h2 className={styles.slideTitle}>Pui codul QR pe mese</h2>
            <p className={styles.slideDesc}>
              Primești un cod QR unic pentru evenimentul tău, pe un cartonaș elegant. Îl pui pe mese,
              la intrare sau pe panouri — oriunde îl văd invitații.
            </p>
            <ul className={styles.slideList}>
              <li><Check className={styles.slideCheck} size={18} weight="bold" /> Cod QR unic, generat instant</li>
              <li><Check className={styles.slideCheck} size={18} weight="bold" /> Design de cartonaș pe stilul evenimentului</li>
              <li><Check className={styles.slideCheck} size={18} weight="bold" /> Îl printezi singur sau ți-l printăm noi</li>
            </ul>
          </div>
        </div>
      </section>

      {/* PAS 2 — scanează & încarcă */}
      <section className={styles.slide}>
        <div className={`${styles.slideGrid} ${styles.reverse}`}>
          <div className={styles.slideVisual} data-reveal="right">
            <span className={styles.slideNum} data-reveal="pop">2</span>
            <img className={styles.slidePhoto} src="/images/events/selfie_wedding.png" alt="Invitați care fac o poză cu telefonul" />
          </div>
          <div className={styles.slideText} data-reveal="left">
            <span className={styles.slideKicker}>Pasul doi</span>
            <h2 className={styles.slideTitle}>Invitații scanează și încarcă</h2>
            <p className={styles.slideDesc}>
              Cu telefonul, scanează codul și încarcă poze, clipuri și urări în câteva secunde —
              direct din browser. Fără aplicație instalată, fără cont creat.
            </p>
            <ul className={styles.slideList}>
              <li><Check className={styles.slideCheck} size={18} weight="bold" /> Merge pe orice telefon, instant</li>
              <li><Check className={styles.slideCheck} size={18} weight="bold" /> Poze, clipuri video și mesaje de urare</li>
              <li><Check className={styles.slideCheck} size={18} weight="bold" /> Zero pași de instalare pentru invitați</li>
            </ul>
          </div>
        </div>
      </section>

      {/* PAS 3 — primești amintirile */}
      <section className={`${styles.slide} ${styles.slideAlt}`}>
        <div className={styles.slideGrid}>
          <div className={styles.slideVisual} data-reveal="left">
            <span className={styles.slideNum} data-reveal="pop">3</span>
            <div className={styles.collage}>
              <img className={styles.collageBig} src="/images/hero/wedding.jpg" alt="Amintire eveniment" />
              <img src="/images/hero/party.png" alt="Amintire petrecere" />
              <img src="/images/hero/toast.jpg" alt="Amintire toast" />
              <div className={styles.collagePill} data-float><span>♥</span> 218 amintiri</div>
            </div>
          </div>
          <div className={styles.slideText} data-reveal="right">
            <span className={styles.slideKicker}>Pasul trei</span>
            <h2 className={styles.slideTitle}>Primești toate amintirile</h2>
            <p className={styles.slideDesc}>
              Pozele, clipurile și urările se adună automat în contul tău de organizator.
              Le vezi în timp real și le descarci oricând, la calitate maximă.
            </p>
            <ul className={styles.slideList}>
              <li><Check className={styles.slideCheck} size={18} weight="bold" /> Panou de organizator cu tot ce s-a încărcat</li>
              <li><Check className={styles.slideCheck} size={18} weight="bold" /> Descarci tot ca arhivă, la calitate maximă</li>
              <li><Check className={styles.slideCheck} size={18} weight="bold" /> Opțional: galerie publică pentru toți invitații</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Showcase design-uri cartonaș */}
      <section className={styles.designs}>
        <div className={styles.sectionHead} data-reveal="up">
          <span className={styles.eyebrow}>Personalizat</span>
          <h2 className={styles.sectionTitle}>Alegi designul cartonașului</h2>
          <p className={styles.sectionDesc}>Cartonașe elegante, pe stilul evenimentului tău — cu codul QR integrat frumos.</p>
        </div>
        <div className={styles.designRow} data-stagger>
          {DESIGNS.map((d) => (
            <div key={d.name} className={styles.designCard}>
              <img src={d.src} alt={`Design cartonaș ${d.name}`} loading="lazy" />
            </div>
          ))}
        </div>
      </section>

      {/* De ce QRPhotoDrop */}
      <section className={styles.why}>
        <div className={styles.sectionHead} data-reveal="up">
          <span className={styles.eyebrow}>De ce QRPhotoDrop</span>
          <h2 className={styles.sectionTitle}>Simplu pentru invitați, complet pentru tine</h2>
        </div>
        <div className={styles.whyGrid} data-stagger>
          {BENEFITS.map(({ Icon, title, desc }) => (
            <div key={title} className={styles.whyCard}>
              <div className={styles.whyIcon}><Icon size={26} weight="light" /></div>
              <div className={styles.whyTitle}>{title}</div>
              <p className={styles.whyDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className={styles.cta}>
        <div className={styles.ctaInner} data-stagger>
          <span className={styles.ctaEyebrow}>Vezi cu ochii tăi</span>
          <h2 className={styles.ctaTitle}>Deschide un demo live în 10 secunde</h2>
          <p className={styles.ctaSubtitle}>Exact ce văd invitații tăi când scanează codul QR de pe masă.</p>
          <div className={styles.ctaActions}>
            <a href="/upload/DEMO" className={styles.ctaBtnPrimary}>
              Deschide demo <ArrowRight size={17} weight="bold" />
            </a>
            <a href="/contact" className={styles.ctaBtnOutline}>Contactează-ne</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>QRPhotoDrop</div>
        <div>amintirile evenimentului tău · <a href="https://qrphotodrop.com" className={styles.footerLink}>qrphotodrop.com</a></div>
      </footer>
    </div>
  );
}
