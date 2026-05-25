'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Camera, Sparkles, GlassWater, Music } from 'lucide-react';
import styles from './Hero.module.css';

gsap.registerPlugin(ScrollTrigger);

export default function Hero() {
  const heroRef = useRef(null);
  const containerRef = useRef(null);
  const photosRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Initial state
      gsap.set(`.${styles.eyebrow}`, { opacity: 0, y: 20 });
      gsap.set(`.${styles.titleInner}`, { yPercent: 100 });
      gsap.set(`.${styles.subtitle}`, { opacity: 0, y: 30 });
      gsap.set(`.${styles.actions}`, { opacity: 0, y: 20 });
      gsap.set(photosRef.current, { 
        opacity: 0, 
        scale: 0.8, 
        y: 100, 
        rotation: () => gsap.utils.random(-30, 30) 
      });

      // Intro sequence
      tl.to(`.${styles.eyebrow}`, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 0.2
      })
      .to(`.${styles.titleInner}`, {
        yPercent: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power4.out',
      }, '-=0.6')
      .to(`.${styles.subtitle}`, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
      }, '-=0.8')
      .to(`.${styles.actions}`, {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
      }, '-=0.8')
      .to(photosRef.current, {
        opacity: 1,
        scale: 1,
        y: 0,
        rotation: (i) => [-15, 10, 15, -8][i],
        duration: 1.5,
        stagger: 0.1,
        ease: 'back.out(1.2)',
      }, '-=1.2');

      // Parallax effect on scroll
      gsap.to(containerRef.current, {
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
        yPercent: 40,
        opacity: 0,
        ease: 'none'
      });

      // Subtle float animation for photos
      photosRef.current.forEach((photo, i) => {
        gsap.to(photo, {
          y: '+=15',
          rotation: '+=2',
          duration: 3 + i,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.5
        });
      });

    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.hero} ref={heroRef}>
      <div className={styles.noise} />
      <div className={styles.bgGlow} />

      <div className={styles.photosContainer}>
        <div 
          className={`${styles.photo} ${styles.photo1}`} 
          ref={el => photosRef.current[0] = el}
        >
          <div className={styles.photoInner}>
            <Camera size={48} className={styles.photoIcon} />
          </div>
        </div>
        <div 
          className={`${styles.photo} ${styles.photo2}`} 
          ref={el => photosRef.current[1] = el}
        >
          <div className={styles.photoInner}>
            <Sparkles size={48} className={styles.photoIcon} />
          </div>
        </div>
        <div 
          className={`${styles.photo} ${styles.photo3}`} 
          ref={el => photosRef.current[2] = el}
        >
          <div className={styles.photoInner}>
            <GlassWater size={48} className={styles.photoIcon} />
          </div>
        </div>
        <div 
          className={`${styles.photo} ${styles.photo4}`} 
          ref={el => photosRef.current[3] = el}
        >
          <div className={styles.photoInner}>
            <Music size={48} className={styles.photoIcon} />
          </div>
        </div>
      </div>

      <div className={styles.container} ref={containerRef}>
        <span className={styles.eyebrow}>
          Creează amintiri nemuritoare
        </span>

        <div className={styles.titleWrapper}>
          <span className={styles.titleLine}>
            <span className={styles.titleInner}>Toate momentele voastre,</span>
          </span>
          <span className={styles.titleLine}>
            <span className={styles.titleInner}>într-un singur <span className={styles.italic}>loc.</span></span>
          </span>
        </div>

        <div className={styles.subtitleWrapper}>
          <p className={styles.subtitle}>
            Catalogul tău digital unde invitații adună cele mai frumoase poze și clipuri. Fără aplicații, doar scanând un cod QR de pe masă.
          </p>
        </div>

        <div className={styles.actions}>
          <a href="/preturi" className={styles.primaryBtn}>
            Alege pachetul tău
          </a>
          <a href="/upload/DEMO" className={styles.secondaryBtn}>
            Testează Demo
          </a>
        </div>
      </div>
    </section>
  );
}
