'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './CTABanner.module.css';

gsap.registerPlugin(ScrollTrigger);

export default function CTABanner() {
  const ref = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(ref.current.children[0].children, 
        { y: 40, opacity: 0 },
        {
          scrollTrigger: { trigger: ref.current, start: 'top 80%' },
          y: 0, 
          opacity: 1, 
          duration: 1, 
          stagger: 0.12, 
          ease: 'power2.out',
          overwrite: 'auto'
        }
      );
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.banner} ref={ref}>
      <div className={styles.inner}>
        <span className={styles.eyebrow}>Nu mai aștepta</span>
        <h2 className={styles.title}>
          Nu aștepți 2 luni, ai sute de poze WOW!
        </h2>
        <p className={styles.subtitle}>
          Alege pachetul care ți se potrivește și lasă invitații să-ți umple albumul cu momente de neuitat.
        </p>
        <div className={styles.actions}>
          <a href="/preturi" className={styles.btnPrimary}>Alege Pachetul</a>
          <a href="/contact" className={styles.btnOutline}>Contactează-ne</a>
        </div>
      </div>
    </section>
  );
}
