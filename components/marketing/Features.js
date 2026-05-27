'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Shield, Download, Smartphone, QrCode, Tv, Headphones } from 'lucide-react';
import styles from './Features.module.css';

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    icon: Shield,
    title: 'Găzduire Securizată AWS',
    desc: 'Pozele și videoclipurile sunt stocate în siguranță deplină pe servere Amazon Web Services, cu redundanță și backup automat.'
  },
  {
    icon: Download,
    title: 'Calitate 100% Originală',
    desc: 'Fără compresie deranjantă ca pe WhatsApp. Oaspeții descarcă amintirile la rezoluția și claritatea lor nativă.'
  },
  {
    icon: Smartphone,
    title: 'Fără Aplicație sau Cont',
    desc: 'Uită de configurări obositoare. Invitații scanează QR code-ul și încarcă pozele instant, direct din browserul telefonului.'
  },
  {
    icon: QrCode,
    title: 'Design QR Personalizat',
    desc: 'Primești fișiere gata de tipărit cu design-ul codului tău QR, adaptat stilului evenimentului tău (wedding, botez sau corporate).'
  },
  {
    icon: Tv,
    title: 'Live Slideshow / Ecran TV',
    desc: 'Opțiune de a proiecta în timp real pe un videoproiector sau ecran în sală pozele pe care invitații le încarcă pe parcursul serii.'
  },
  {
    icon: Headphones,
    title: 'Asistență Tehnică Premium',
    desc: 'Suntem alături de tine la fiecare pas. Asistență rapidă prin WhatsApp pentru configurare și suport pe toată durata evenimentului.'
  }
];

export default function Features() {
  const containerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Fade in header
      gsap.fromTo(`.${styles.header}`, 
        { opacity: 0, y: 30 },
        {
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
          },
          opacity: 1,
          y: 0,
          duration: 1,
          ease: 'power3.out',
          overwrite: 'auto'
        }
      );

      // Staggered cards entry
      gsap.fromTo(`.${styles.card}`, 
        { opacity: 0, y: 40, scale: 0.96 },
        {
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 85%',
          },
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 1.2,
          stagger: 0.1,
          ease: 'power3.out',
          overwrite: 'auto'
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.section} ref={containerRef}>
      <div className={`${styles.glow} ${styles.glowTopLeft}`} />
      <div className={`${styles.glow} ${styles.glowBottomRight}`} />

      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>Dotări Premium</span>
          <h2 className={styles.title}>Tot ce ai nevoie pentru amintiri de neprețuit</h2>
          <p className={styles.desc}>
            Tehnologie modernă, securitate solidă și simplitate absolută gândite special pentru ca tu și invitații tăi să vă bucurați de fiecare cadru.
          </p>
        </div>

        <div className={styles.grid}>
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <div key={index} className={styles.card}>
                <div className={styles.iconWrapper}>
                  <Icon size={24} strokeWidth={1.5} />
                </div>
                <h3 className={styles.cardTitle}>{feat.title}</h3>
                <p className={styles.cardDesc}>{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
