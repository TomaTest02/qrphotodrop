'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './Hero.module.css';

export default function Hero() {
  const heroRef = useRef(null);
  const containerRef = useRef(null);
  const photosRef = useRef([]);

  useEffect(() => {
    let ctx;
    
    Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger')
    ]).then(([gsapModule, scrollModule]) => {
      const gsap = gsapModule.default;
      const { ScrollTrigger } = scrollModule;
      gsap.registerPlugin(ScrollTrigger);

      ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Initial state — use force3D for GPU layer
      gsap.set(`.${styles.eyebrow}`, { opacity: 0, y: 20, force3D: true });
      gsap.set(`.${styles.titleInner}`, { y: '100%', force3D: true });
      gsap.set(`.${styles.subtitle}`, { opacity: 0, y: 30, force3D: true });
      gsap.set(`.${styles.actions}`, { opacity: 0, y: 20, force3D: true });
      gsap.set(photosRef.current, { 
        opacity: 0, 
        scale: 0.8, 
        y: 60, 
        rotation: (i) => [-25, -20, 25, 18, -18, 18][i] || 0,
        force3D: true
      });

      // Intro sequence
      tl.to(`.${styles.eyebrow}`, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.2,
        force3D: true
      })
      .to(`.${styles.titleInner}`, {
        y: '0%',
        duration: 1,
        stagger: 0.12,
        ease: 'power4.out',
        force3D: true
      }, '-=0.5')
      .to(`.${styles.subtitle}`, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        force3D: true
      }, '-=0.6')
      .to(`.${styles.actions}`, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        force3D: true
      }, '-=0.6')
      .to(photosRef.current, {
        opacity: 1,
        scale: 1,
        y: 0,
        rotation: (i) => [-12, -10, 12, 8, -8, 8][i] || 0,
        duration: 1.2,
        stagger: 0.08,
        ease: 'back.out(1.2)',
        force3D: true
      }, '-=1');

      // Parallax effect on scroll
      gsap.to(containerRef.current, {
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
        yPercent: 30,
        opacity: 0,
        ease: 'none',
        force3D: true
      });

      // Subtle float — only Y axis, lighter and GPU-friendly
      photosRef.current.forEach((photo, i) => {
        if (!photo) return;
        gsap.to(photo, {
          y: '+=6',
          duration: 3.5 + i * 0.5,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.4,
          force3D: true
        });
      });

    }, heroRef);
    }); // end Promise.then

    return () => ctx?.revert();
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
            <Image 
              src="/images/hero/wedding.jpg" 
              alt="Nuntă" 
              fill
              sizes="(max-width: 480px) 65px, (max-width: 768px) 80px, (max-width: 992px) 140px, 190px"
              quality={60}
              priority
              fetchPriority="high"
              className={styles.heroImage}
            />
          </div>
        </div>
        <div 
          className={`${styles.photo} ${styles.photo2}`} 
          ref={el => photosRef.current[1] = el}
        >
          <div className={styles.photoInner}>
            <Image 
              src="/images/hero/botez.jpg" 
              alt="Botez" 
              fill
              sizes="(max-width: 480px) 65px, (max-width: 768px) 80px, (max-width: 992px) 140px, 190px"
              quality={60}
              priority
              className={styles.heroImage}
            />
          </div>
        </div>
        <div 
          className={`${styles.photo} ${styles.photo3}`} 
          ref={el => photosRef.current[2] = el}
        >
          <div className={styles.photoInner}>
            <Image 
              src="/images/hero/toast.jpg" 
              alt="Cocktails" 
              fill
              sizes="(max-width: 480px) 65px, (max-width: 768px) 80px, (max-width: 992px) 140px, 190px"
              quality={60}
              loading="lazy"
              className={styles.heroImage}
            />
          </div>
        </div>
        <div 
          className={`${styles.photo} ${styles.photo4}`} 
          ref={el => photosRef.current[3] = el}
        >
          <div className={styles.photoInner}>
            <Image 
              src="/images/hero/corporate.jpg" 
              alt="Eveniment Corporate" 
              fill
              sizes="(max-width: 480px) 65px, (max-width: 768px) 80px, (max-width: 992px) 140px, 190px"
              quality={60}
              loading="lazy"
              className={styles.heroImage}
            />
          </div>
        </div>
        <div 
          className={`${styles.photo} ${styles.photo5}`} 
          ref={el => photosRef.current[4] = el}
        >
          <div className={styles.photoInner}>
            <Image 
              src="/images/hero/aniversare.jpg" 
              alt="Aniversare" 
              fill
              sizes="(max-width: 480px) 65px, (max-width: 768px) 80px, (max-width: 992px) 140px, 190px"
              quality={60}
              loading="lazy"
              className={styles.heroImage}
            />
          </div>
        </div>
        <div 
          className={`${styles.photo} ${styles.photo6}`} 
          ref={el => photosRef.current[5] = el}
        >
          <div className={styles.photoInner}>
            <Image 
              src="/images/hero/botez2.jpg" 
              alt="Botez Decor" 
              fill
              sizes="(max-width: 480px) 65px, (max-width: 768px) 80px, (max-width: 992px) 140px, 190px"
              quality={60}
              loading="lazy"
              className={styles.heroImage}
            />
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
