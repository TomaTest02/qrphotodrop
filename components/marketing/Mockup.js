'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Image from 'next/image';
import { Camera, Image as ImageIcon } from 'lucide-react';
import styles from './Mockup.module.css';

gsap.registerPlugin(ScrollTrigger);

export default function Mockup() {
  const containerRef = useRef(null);
  const phoneRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Intro scroll animation
      gsap.from(phoneRef.current, {
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 80%',
        },
        y: 80,
        opacity: 0,
        rotation: 8,
        duration: 1.2,
        ease: 'back.out(1.2)'
      });

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
              <svg viewBox="0 0 29 29" className={styles.qrImage} fill="currentColor" color="#0f0206">
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
            <div className={styles.phoneContent}>
              <div className={styles.phoneHeader}>
                <div className={styles.phoneBrand}>QRPhotoDrop</div>
                <div className={styles.phoneSubtitle}>Albumul Evenimentului</div>
              </div>

              <div className={styles.phoneBody}>
                <div className={styles.uploadCircle}>
                  <Camera size={28} className={styles.uploadIcon} />
                  <span className={styles.uploadText}>Adaugă Poze</span>
                </div>

                <div style={{ width: '100%' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', marginBottom: '8px', textAlign: 'left', width: '100%', paddingLeft: '4px' }}>
                    Încărcate recent
                  </div>
                  <div className={styles.previewGrid}>
                    <div className={styles.previewCard}>
                      <Image src="/images/hero/wedding.jpg" alt="Wedding" fill className={styles.previewImage} sizes="80px" />
                    </div>
                    <div className={styles.previewCard}>
                      <Image src="/images/hero/botez.jpg" alt="Botez" fill className={styles.previewImage} sizes="80px" />
                    </div>
                    <div className={styles.previewCard}>
                      <Image src="/images/hero/toast.jpg" alt="Toast" fill className={styles.previewImage} sizes="80px" />
                    </div>
                    <div className={styles.previewCard}>
                      <Image src="/images/hero/corporate.jpg" alt="Corporate" fill className={styles.previewImage} sizes="80px" />
                    </div>
                    <div className={styles.previewCard}>
                      <Image src="/images/hero/aniversare.jpg" alt="Aniversare" fill className={styles.previewImage} sizes="80px" />
                    </div>
                    <div className={styles.previewCard + ' ' + styles.previewEmpty}>
                      <ImageIcon size={18} />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.phoneFooter}>
                Securizat prin AWS S3 Cloud
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
