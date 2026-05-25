'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import styles from './HowItWorks.module.css';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { num: '01', title: 'Alegi pachetul', desc: 'Selectezi tipul evenimentului și primești instant codul QR unic și acces la dashboard-ul de organizator.' },
  { num: '02', title: 'Distribui invitaților', desc: 'Cartonașe pe mese, link pe WhatsApp, QR pe panouri decorative — alegi tu cum e mai frumos.' },
  { num: '03', title: 'Primești amintirile', desc: 'Pozele, clipurile și urările se adună automat. Le descarci ca arhivă ZIP oricând dorești.' },
];

export default function HowItWorks() {
  const sectionRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const stepRefs = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Pin the left side while the right side scrolls
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: 'bottom bottom',
        pin: leftRef.current,
        pinSpacing: false,
      });

      // Highlight steps as they scroll into view
      stepRefs.current.forEach((step, i) => {
        ScrollTrigger.create({
          trigger: step,
          start: 'top center',
          end: 'bottom center',
          onEnter: () => gsap.to(step, { opacity: 1, duration: 0.5 }),
          onLeave: () => gsap.to(step, { opacity: 0.3, duration: 0.5 }),
          onEnterBack: () => gsap.to(step, { opacity: 1, duration: 0.5 }),
          onLeaveBack: () => gsap.to(step, { opacity: 0.3, duration: 0.5 }),
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.section} ref={sectionRef}>
      <div className={styles.container}>
        
        {/* Pinned Left Side */}
        <div className={styles.leftCol} ref={leftRef}>
          <div className={styles.leftContent}>
            <span className={styles.eyebrow}>Simplu & Elegant</span>
            <h2 className={styles.title}>Cum funcționează</h2>
            <p className={styles.description}>
              Fără aplicații instalate, fără conturi create. Doar scanezi și trimiți bucurie.
            </p>
          </div>
        </div>

        {/* Scrolling Right Side */}
        <div className={styles.rightCol} ref={rightRef}>
          <div className={styles.stepsSpacer} />
          {STEPS.map((step, i) => (
            <div 
              key={step.num} 
              className={styles.step}
              ref={(el) => (stepRefs.current[i] = el)}
              style={{ opacity: i === 0 ? 1 : 0.3 }}
            >
              <div className={styles.stepContent}>
                <p className={styles.number}>{step.num}</p>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            </div>
          ))}
          <div className={styles.stepsSpacer} />
        </div>

      </div>
    </section>
  );
}
