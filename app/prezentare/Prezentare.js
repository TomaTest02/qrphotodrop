'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { QrCode, Lock, Sparkle, Heart, CheckCircle, ArrowRight, Check } from '@phosphor-icons/react';
import styles from './prezentare.module.css';

gsap.registerPlugin(ScrollTrigger);

const HEADLINE = 'Toate pozele de la invitați, adunate singure.';

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

function LineTitle({ children }) {
  return (
    <span className={styles.lineMask}><span className={styles.line} data-line>{children}</span></span>
  );
}

export default function Prezentare() {
  const root = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia?.('(pointer: fine)').matches;
    const q = (sel) => Array.from(root.current.querySelectorAll(sel));
    const removers = [];

    const ctx = gsap.context(() => {
      if (!reduce) {
        // ── HERO: photo opens through a clip mask, headline rises word-by-word ──
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.fromTo(q('[data-hero-img]'),
          { clipPath: 'inset(0 0 100% 0)', scale: 1.18 },
          { clipPath: 'inset(0 0 0% 0)', scale: 1, duration: 1.3 }, 0)
          .from(q('[data-word]'), { yPercent: 118, duration: 0.9, stagger: 0.07 }, 0.15)
          .from(q('[data-hero-fade]'), { y: 24, opacity: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out' }, 0.4)
          .from(q('[data-hero-badge]'), { scale: 0.5, opacity: 0, duration: 0.7, ease: 'back.out(1.6)' }, 0.95);

        // Hero photo settles/scales subtly as the next section rises over it
        gsap.to(q('[data-hero-parallax]'), {
          yPercent: -6, scale: 0.96, ease: 'none',
          scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: 0.6 },
        });

        // ── STEP photos: unveil through a directional clip mask + zoom settle ──
        q('[data-clip]').forEach((el) => {
          const dir = el.dataset.clip;
          const from = dir === 'left' ? 'inset(0 100% 0 0)' : dir === 'right' ? 'inset(0 0 0 100%)' : 'inset(0 0 100% 0)';
          gsap.fromTo(el, { clipPath: from, scale: 1.14 }, {
            clipPath: 'inset(0 0 0 0)', scale: 1, duration: 1.15, ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 80%', once: true },
          });
        });

        // ── STEP text: titles rise through line masks, content + number settle ──
        q('[data-step]').forEach((step) => {
          const stl = gsap.timeline({ scrollTrigger: { trigger: step, start: 'top 74%', once: true } });
          stl.from(step.querySelectorAll('[data-line]'), { yPercent: 120, duration: 0.85, ease: 'expo.out', stagger: 0.1 })
            .from(step.querySelectorAll('[data-step-fade]'), { y: 22, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08 }, '-=0.45')
            .from(step.querySelectorAll('[data-num]'), { scale: 0.2, opacity: 0, duration: 0.6, ease: 'back.out(1.7)' }, '-=0.7');
        });

        // ── SIGNATURE: photos DROP into the collage and settle (memories arriving) ──
        const rot = [-7, 6, -5, 0];
        q('[data-drop]').forEach((el, i) => {
          gsap.from(el, {
            yPercent: -55, opacity: 0, rotation: rot[i] ?? 0, scale: 0.9,
            duration: 0.95, ease: 'back.out(1.2)', delay: i * 0.13,
            scrollTrigger: { trigger: '[data-collage]', start: 'top 72%', once: true },
          });
        });

        // ── Designs marquee — reactive: slows on hover ──
        const track = q('[data-marquee]')[0];
        if (track) {
          const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 28, repeat: -1 });
          const slow = () => gsap.to(loop, { timeScale: 0.12, duration: 0.5, overwrite: true });
          const fast = () => gsap.to(loop, { timeScale: 1, duration: 0.5, overwrite: true });
          track.addEventListener('pointerenter', slow);
          track.addEventListener('pointerleave', fast);
          removers.push(() => { track.removeEventListener('pointerenter', slow); track.removeEventListener('pointerleave', fast); });
        }
      }

      // ── Magnetic CTAs (fine pointer only) — icon moves independently ──
      if (fine && !reduce) {
        q('[data-magnetic]').forEach((btn) => {
          const inner = btn.querySelector('[data-magnetic-inner]');
          const xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' });
          const yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
          const ix = inner ? gsap.quickTo(inner, 'x', { duration: 0.5, ease: 'power3' }) : null;
          const move = (e) => {
            const r = btn.getBoundingClientRect();
            const rx = e.clientX - (r.left + r.width / 2);
            const ry = e.clientY - (r.top + r.height / 2);
            xTo(rx * 0.3); yTo(ry * 0.5); if (ix) ix(rx * 0.18);
          };
          const leave = () => { xTo(0); yTo(0); if (ix) ix(0); };
          btn.addEventListener('pointermove', move);
          btn.addEventListener('pointerleave', leave);
          removers.push(() => { btn.removeEventListener('pointermove', move); btn.removeEventListener('pointerleave', leave); });
        });
      }
    }, root);

    return () => { removers.forEach((r) => r()); ctx.revert(); };
  }, []);

  return (
    <div className={styles.page} ref={root}>
      {/* Bară de sus (fără meniu) */}
      <header className={styles.topbar}>
        <span className={styles.logo}>QRPhotoDrop</span>
        <a href="/contact" className={styles.topCta}>Contactează-ne</a>
      </header>

      {/* HERO */}
      <section className={styles.hero} data-hero>
        <div className={styles.heroGrid}>
          <div className={styles.heroText}>
            <span className={styles.eyebrow} data-hero-fade>Album digital pentru evenimente</span>
            <h1 className={styles.h1} aria-label={HEADLINE}>
              {HEADLINE.split(' ').map((w, i) => (
                <span key={i} className={styles.wordMask} aria-hidden="true">
                  <span className={styles.word} data-word>{w}</span>
                </span>
              ))}
            </h1>
            <p className={styles.subtitle} data-hero-fade>
              Invitații scanează un cod QR și încarcă pozele, clipurile și urările direct de pe telefon —
              fără aplicație, fără cont. Tu le primești pe toate, gata organizate.
            </p>
            <div className={styles.heroActions} data-hero-fade>
              <a href="/upload/DEMO" className={styles.btnPrimary} data-magnetic>
                Încearcă demo live <span className={styles.btnIcon} data-magnetic-inner><ArrowRight size={17} weight="bold" /></span>
              </a>
              <a href="/preturi" className={styles.btnOutline}>Vezi prețuri</a>
            </div>
            <div className={styles.trust} data-hero-fade>
              <span>Fără aplicație</span><span className={styles.trustDot} />
              <span>Fără cont</span><span className={styles.trustDot} />
              <span>Calitate originală</span>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={`${styles.frame} ${styles.heroFrame}`} data-hero-parallax>
              <img src="/images/hero/wedding.jpg" alt="Cuplu la nuntă" data-hero-img />
            </div>
            <div className={styles.heroBadge} data-hero-badge>
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
      <section className={`${styles.slide} ${styles.slideAlt}`} data-step>
        <div className={styles.slideGrid}>
          <div className={styles.slideVisual}>
            <span className={styles.slideNum} data-num>1</span>
            <div className={`${styles.frame} ${styles.slideFrame}`}>
              <img src="/images/mockups/classic_burgundy.png" alt="Cartonaș cu cod QR pe masă" data-clip="up" />
            </div>
          </div>
          <div className={styles.slideText}>
            <span className={styles.slideKicker} data-step-fade>Pasul întâi</span>
            <h2 className={styles.slideTitle}><LineTitle>Pui codul QR pe mese</LineTitle></h2>
            <p className={styles.slideDesc} data-step-fade>
              Primești un cod QR unic pentru evenimentul tău, pe un cartonaș elegant. Îl pui pe mese,
              la intrare sau pe panouri — oriunde îl văd invitații.
            </p>
            <ul className={styles.slideList}>
              <li data-step-fade><Check className={styles.slideCheck} size={18} weight="bold" /> Cod QR unic, generat instant</li>
              <li data-step-fade><Check className={styles.slideCheck} size={18} weight="bold" /> Design de cartonaș pe stilul evenimentului</li>
              <li data-step-fade><Check className={styles.slideCheck} size={18} weight="bold" /> Îl printezi singur sau ți-l printăm noi</li>
            </ul>
          </div>
        </div>
      </section>

      {/* PAS 2 — scanează & încarcă */}
      <section className={styles.slide} data-step>
        <div className={`${styles.slideGrid} ${styles.reverse}`}>
          <div className={styles.slideVisual}>
            <span className={styles.slideNum} data-num>2</span>
            <div className={`${styles.frame} ${styles.slideFrame}`}>
              <img src="/images/events/selfie_wedding.png" alt="Invitați care fac o poză cu telefonul" data-clip="right" />
            </div>
          </div>
          <div className={styles.slideText}>
            <span className={styles.slideKicker} data-step-fade>Pasul doi</span>
            <h2 className={styles.slideTitle}><LineTitle>Invitații scanează și încarcă</LineTitle></h2>
            <p className={styles.slideDesc} data-step-fade>
              Cu telefonul, scanează codul și încarcă poze, clipuri și urări în câteva secunde —
              direct din browser. Fără aplicație instalată, fără cont creat.
            </p>
            <ul className={styles.slideList}>
              <li data-step-fade><Check className={styles.slideCheck} size={18} weight="bold" /> Merge pe orice telefon, instant</li>
              <li data-step-fade><Check className={styles.slideCheck} size={18} weight="bold" /> Poze, clipuri video și mesaje de urare</li>
              <li data-step-fade><Check className={styles.slideCheck} size={18} weight="bold" /> Zero pași de instalare pentru invitați</li>
            </ul>
          </div>
        </div>
      </section>

      {/* PAS 3 — primești amintirile (photo-drop) */}
      <section className={`${styles.slide} ${styles.slideAlt}`} data-step>
        <div className={styles.slideGrid}>
          <div className={styles.slideVisual}>
            <span className={styles.slideNum} data-num>3</span>
            <div className={styles.collage} data-collage>
              <img className={styles.collageBig} src="/images/hero/wedding.jpg" alt="Amintire eveniment" data-drop />
              <img src="/images/hero/party.png" alt="Amintire petrecere" data-drop />
              <img src="/images/hero/toast.jpg" alt="Amintire toast" data-drop />
              <div className={styles.collagePill} data-drop><span>♥</span> 218 amintiri</div>
            </div>
          </div>
          <div className={styles.slideText}>
            <span className={styles.slideKicker} data-step-fade>Pasul trei</span>
            <h2 className={styles.slideTitle}><LineTitle>Primești toate amintirile</LineTitle></h2>
            <p className={styles.slideDesc} data-step-fade>
              Pozele, clipurile și urările se adună automat în contul tău de organizator.
              Le vezi în timp real și le descarci oricând, la calitate maximă.
            </p>
            <ul className={styles.slideList}>
              <li data-step-fade><Check className={styles.slideCheck} size={18} weight="bold" /> Panou de organizator cu tot ce s-a încărcat</li>
              <li data-step-fade><Check className={styles.slideCheck} size={18} weight="bold" /> Descarci tot ca arhivă, la calitate maximă</li>
              <li data-step-fade><Check className={styles.slideCheck} size={18} weight="bold" /> Opțional: galerie publică pentru toți invitații</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Showcase design-uri cartonaș (marquee reactiv) */}
      <section className={styles.designs} data-step>
        <div className={styles.sectionHead}>
          <span className={styles.eyebrow}>Personalizat</span>
          <h2 className={styles.sectionTitle}><LineTitle>Alegi designul cartonașului</LineTitle></h2>
          <p className={styles.sectionDesc} data-step-fade>Cartonașe elegante, pe stilul evenimentului tău — cu codul QR integrat frumos.</p>
        </div>
        <div className={styles.marqueeWrap}>
          <div className={styles.marqueeTrack} data-marquee>
            {[...DESIGNS, ...DESIGNS].map((d, i) => (
              <div key={i} className={styles.marqueeCard}>
                <img src={d.src} alt={`Design cartonaș ${d.name}`} loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* De ce QRPhotoDrop */}
      <section className={styles.why} data-step>
        <div className={styles.sectionHead}>
          <span className={styles.eyebrow}>De ce QRPhotoDrop</span>
          <h2 className={styles.sectionTitle}><LineTitle>Simplu pentru invitați, complet pentru tine</LineTitle></h2>
        </div>
        <div className={styles.whyGrid}>
          {BENEFITS.map(({ Icon, title, desc }) => (
            <div key={title} className={styles.whyCard} data-step-fade>
              <div className={styles.whyIcon}><Icon size={26} weight="light" /></div>
              <div className={styles.whyTitle}>{title}</div>
              <p className={styles.whyDesc}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <span className={styles.ctaEyebrow}>Vezi cu ochii tăi</span>
          <h2 className={styles.ctaTitle}>Deschide un demo live în 10 secunde</h2>
          <p className={styles.ctaSubtitle}>Exact ce văd invitații tăi când scanează codul QR de pe masă.</p>
          <div className={styles.ctaActions}>
            <a href="/upload/DEMO" className={styles.ctaBtnPrimary} data-magnetic>
              Deschide demo <span className={styles.btnIcon} data-magnetic-inner><ArrowRight size={17} weight="bold" /></span>
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
