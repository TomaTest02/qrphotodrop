'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './Stats.module.css';

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { number: '10,000+', label: 'Evenimente', desc: 'Nunți, botezuri și petreceri memorabile.' },
  { number: '2M+', label: 'Poze Descărcate', desc: 'Amintiri prețioase salvate la calitate originală.' },
  { number: '99.9%', label: 'Uptime Server', desc: 'Acces rapid și garantat în orice moment.' },
  { number: '0 secunde', label: 'Timp Instalare', desc: 'Funcționează instant în browser, fără cont sau aplicație.' }
];

export default function Stats() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(`.${styles.card}`, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 85%',
        },
        opacity: 0,
        y: 30,
        scale: 0.95,
        duration: 1,
        stagger: 0.12,
        ease: 'power3.out'
      });
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
