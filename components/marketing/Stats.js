'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './Stats.module.css';

gsap.registerPlugin(ScrollTrigger);

// Doar afirmații ADEVĂRATE și verificabile. (Cifrele inventate — „10.000+ evenimente",
// „2M+ poze", „99.9% uptime" — au fost scoase: erau publicitate înșelătoare.)
const stats = [
  { number: '0 secunde', label: 'Timp Instalare', desc: 'Funcționează instant în browser, fără cont sau aplicație.' },
  { number: 'Fără cont', label: 'Pentru Invitați', desc: 'Scanează codul QR și încarcă direct. Nimic de instalat.' },
  { number: 'Calitate originală', label: 'Zero Compresie', desc: 'Pozele și clipurile se păstrează exact cum au fost făcute.' },
  { number: '1.5 GB', label: 'Per Clip Video', desc: 'Chiar și filmările lungi, la calitate maximă.' }
];

export default function Stats() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(`.${styles.card}`, 
        { opacity: 0, y: 30, scale: 0.95 },
        {
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
          },
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1,
          stagger: 0.12,
          ease: 'power3.out',
          overwrite: 'auto'
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.section} ref={containerRef}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          {stats.map((s, i) => (
            <div key={i} className={styles.card}>
              <div className={styles.number}>{s.number}</div>
              <div className={styles.label}>{s.label}</div>
              <p className={styles.desc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
