'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Camera, Heart, Envelope, Lock, CaretRight } from '@phosphor-icons/react';
import styles from './Mockup.module.css';

gsap.registerPlugin(ScrollTrigger);

export default function Mockup() {
  const containerRef = useRef(null);
  const phoneRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Intro scroll animation
      gsap.fromTo(phoneRef.current, 
        { y: 80, opacity: 0, rotation: 8 },
        {
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 80%',
          },
          y: 0,
          opacity: 1,
          rotation: 0,
          duration: 1.2,
          ease: 'back.out(1.2)',
          overwrite: 'auto'
        }
      );

      // Ambient floating effect for mockup
      gsap.to(phoneRef.current, {
        y: '+=10',
        rotation: '+=1',
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className={styles.section} ref={containerRef}>
      <div className={`${styles.glow} ${styles.glowLeft}`} />
      <div className={`${styles.glow} ${styles.glowRight}`} />

      <div className={styles.inner}>
        <div className={styles.content}>
          <span className={styles.eyebrow}>Experiență Live</span>
          <h2 className={styles.title}>Scanezi, încarci, admiri. Atât de simplu.</h2>
          <p className={styles.desc}>
            Oaspeții tăi nu trebuie să își creeze conturi sau să descarce vreo aplicație. Pur și simplu scanează codul QR de pe mese sau panou, deschid camera și își încarcă instant cele mai bune momente surprinse în timpul evenimentului.
          </p>

          <div className={styles.qrContainer}>
            <div className={styles.qrWrapper}>
              {/* Premium custom styled QR Code SVG */}
              <svg viewBox="0 0 29 29" className={styles.qrImage} fill="currentColor" color="#2d2c4a">
                <path d="M0 0h7v7H0zm1 1v5h5V1zm8 0h3v1h-2v1h2v1h-3v3h1v-2h2v3h-3zm5 0h7v7h-7zm1 1v5h5V1zm8 0h3v3h-1v-2h-2zm-9 4h2v1h-2zm7 3v3h-1v-2h-2v-1zm-13 1h7v7H0zm1 1v5h5V9zm12 0h2v1h-2zm4 0h3v3h-1v-2h-2zm-12 3h2v1h-2zm4 0h1v1h-1zm1 1h2v2h-1v-1h-1zm3-2h2v1h-2zm5 1h2v2h-1v-1h-1zm-6 2h1v1h-1zm3 0h3v3h-1v-2h-2zm-10 1h2v1h-2zm6 2h2v1h-2zm4 0h1v1h-1z" />
              </svg>
            </div>
            <div className={styles.qrText}>
              <div className={styles.qrTitle}>Scanează pentru Demo</div>
              <p className={styles.qrDesc}>
                Îndreaptă camera telefonului către ecran pentru a simula fluxul complet pe care îl vor parcurge invitații tăi.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mockupWrapper}>
          <div className={styles.phoneFrame} ref={phoneRef}>
            <div className={styles.phoneSpeaker} />
            <div className={styles.phoneContent} style={{ background: '#faf7f2', padding: '26px 20px', justifyContent: 'flex-start' }}>
              {/* Badge brand */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 14px', background: '#fbeef0', borderRadius: '999px', fontSize: '11px', fontWeight: 700, color: '#710927', marginBottom: '16px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#710927' }} /> QRPhotoDrop
              </div>

              {/* Inima */}
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'radial-gradient(circle, #fcdfe6 0%, #f6c3d1 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Heart size={24} weight="fill" color="#d4607f" />
              </div>

              {/* Nume + dată + locație */}
              <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '23px', color: '#2d2c4a', marginBottom: '6px' }}>Nunta Noastră</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11.5px', color: '#9a8f86', marginBottom: '14px' }}>
                <span>14 septembrie 2026</span>
                <span>Casa Nobililor, Iași</span>
              </div>

              <p style={{ fontSize: '12px', color: '#7a7068', lineHeight: 1.5, marginBottom: '18px', maxWidth: '230px' }}>
                Ajută-ne să ne vedem povestea prin ochii tăi. Trimite-ne pozele tale sau lasă-ne un mesaj special.
              </p>

              {/* Buton principal */}
              <div style={{ width: '100%', background: '#710927', color: '#fff', borderRadius: '14px', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: '11px', marginBottom: '9px', textAlign: 'left' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Camera size={17} color="#fff" /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700 }}>Trimite poze & videoclipuri</div>
                  <div style={{ fontSize: '10px', opacity: 0.82 }}>Din galerie sau direct cu camera</div>
                </div>
                <CaretRight size={14} weight="bold" />
              </div>

              {/* Buton secundar */}
              <div style={{ width: '100%', background: '#fff', border: '1px solid #ecddd0', borderRadius: '14px', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: '11px', textAlign: 'left' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: '#f5efe6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Envelope size={17} color="#2d2c4a" /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#2d2c4a' }}>Scrie o urare</div>
                  <div style={{ fontSize: '10px', color: '#a59a90' }}>Un mesaj din inimă pentru miri</div>
                </div>
                <CaretRight size={14} weight="bold" color="#b3a99f" />
              </div>

              {/* Footer privat */}
              <p style={{ marginTop: '18px', fontSize: '10px', color: '#b0a79e', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Lock size={11} weight="light" /> Galeria invitaților este dezactivată
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
