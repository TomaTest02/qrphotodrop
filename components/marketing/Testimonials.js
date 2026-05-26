'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './Testimonials.module.css';

gsap.registerPlugin(ScrollTrigger);

const testimonials = [
  {
    quote: 'A fost cea mai bună decizie! Am strâns peste 800 de poze de la invitați, unele mult mai distractive și naturale decât cele oficiale. QR-ul a funcționat impecabil.',
    name: 'Andreea & Mihai',
    role: 'Nuntă Brașov',
    initials: 'AM'
  },
  {
    quote: 'O metodă excelentă de a colecta toate fotografiile făcute de colegi la petrecerea anuală a companiei. QR code-urile personalizate s-au integrat superb în decorul sălii.',
    name: 'Roxana I.',
    role: 'Event Manager, Tech Corp',
    initials: 'RI'
  },
  {
    quote: 'Fără aplicații de descărcat, fără stres. Bunicii și prietenii au putut încărca pozele cu micuțul nostru în câteva secunde. O amintire prețioasă pentru toată viața!',
    name: 'Simona & Vlad',
    role: 'Botez București',
    initials: 'SV'
  }
];

export default function Testimonials() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Fade in header
      gsap.from(`.${styles.header}`, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
        },
        opacity: 0,
        y: 30,
        duration: 1,
        ease: 'power3.out'
      });

      // Cards staggered fade in
      gsap.from(`.${styles.card}`, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 70%',
        },
        opacity: 0,
        y: 40,
        scale: 0.96,
        duration: 1.2,
        stagger: 0.12,
        ease: 'power3.out'
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.section} ref={containerRef}>
      <div className={`${styles.glow} ${styles.glowCenter}`} />

      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Gânduri Bune</span>
          <h2 className={styles.title}>Ce spun organizatorii și gazdele</h2>
          <p className={styles.desc}>
            Peste 10.000 de evenimente au prins viață prin lentila invitaților. Iată experiențele unora dintre ei.
          </p>
        </div>

        <div className={styles.grid}>
          {testimonials.map((t, index) => (
            <div key={index} className={styles.card}>
              <span className={styles.quoteIcon}>“</span>
              <p className={styles.quoteText}>{t.quote}</p>
              
              <div className={styles.author}>
                <div className={styles.avatar}>
                  {t.initials}
                </div>
                <div className={styles.meta}>
                  <span className={styles.name}>{t.name}</span>
                  <span className={styles.role}>{t.role}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
