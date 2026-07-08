'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { QrCode, DownloadSimple } from '@phosphor-icons/react';
import styles from './HowItWorks.module.css';

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  { num: '01', title: 'Alegi pachetul', desc: 'Selectezi tipul evenimentului și primești instant codul QR unic și acces la dashboard-ul de organizator.' },
  { num: '02', title: 'Distribui invitaților', desc: 'Cartonașe pe mese, link pe WhatsApp, QR pe panouri decorative — alegi tu cum e mai frumos.' },
  { num: '03', title: 'Primești amintirile', desc: 'Pozele, clipurile și urările se adună automat. Le descarci ca arhivă ZIP oricând dorești.' },
];

export default function HowItWorks() {
  const containerRef = useRef(null);
  const trackHighlightRef = useRef(null);
  const nodesRef = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // 1. Highlight line progress animation
      gsap.fromTo(trackHighlightRef.current,
        { height: '0%' },
        {
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top center+=100',
            end: 'bottom center+=100',
            scrub: 0.5,
          },
          height: '100%',
          ease: 'none'
        }
      );

      // 2. Node activation animations
      nodesRef.current.forEach((node, i) => {
        if (!node) return;
        
        gsap.fromTo(node,
          {
            backgroundColor: '#faf7f2', // var(--color-cream)
            borderColor: '#d9c3a6', // var(--color-cream-darker)
            color: '#525072', // var(--color-text-muted)
            scale: 1,
            boxShadow: '0 0 0px rgba(113, 9, 39, 0)'
          },
          {
            scrollTrigger: {
              trigger: node,
              start: 'top center+=150',
              end: 'bottom center-=150',
              toggleActions: 'play reverse play reverse',
            },
            backgroundColor: '#710927', // var(--color-burgundy)
            borderColor: '#710927',
            color: '#ffffff',
            scale: 1.15,
            boxShadow: '0 0 20px rgba(113, 9, 39, 0.4)',
            duration: 0.3,
            ease: 'power2.out'
          }
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  function renderVisual(index) {
    if (index === 0) {
      return (
        <div className={styles.visualCardInner}>
          <div className={styles.dashboardMock}>
            <div className={styles.mockHeader}>
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.dot} />
              <span className={styles.mockTitle}>Dashboard</span>
            </div>
            <div className={styles.mockBody}>
              <div className={styles.sliderContainer}>
                <div className={styles.sliderTrack}>
                  <div className={styles.sliderFill} />
                  <div className={styles.sliderKnob} />
                </div>
                <div className={styles.sliderInfo}>
                  <span>Pachet: Standard (150 GB)</span>
                  <strong className={styles.goldText}>399 RON</strong>
                </div>
              </div>
              <button className={styles.mockBtn}>
                Generează cod QR →
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className={styles.visualCardInner}>
          <div className={styles.phoneMock}>
            <div className={styles.phoneHeader}>
              <div className={styles.phoneCamera} />
              <div className={styles.phoneSpeaker} />
            </div>
            <div className={styles.phoneScreen}>
              <div className={styles.chatHeader}>
                <div className={styles.avatar}>A</div>
                <div>
                  <p className={styles.chatName}>Invitați WhatsApp</p>
                  <p className={styles.chatStatus}>online</p>
                </div>
              </div>
              <div className={styles.chatBody}>
                <div className={styles.chatBubble}>
                  <p className={styles.bubbleText}>
                    Salutare tuturor! Aici puteți pune toate pozele de la eveniment. Doar scanați sau deschideți linkul:
                  </p>
                  <span className={styles.chatLink}>qrphotodrop.com/nunta 🥂</span>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.tableCardMock}>
            <div className={styles.cardHeader}>Scan & Share</div>
            <div className={styles.cardQr}>
              <QrCode size={36} className={styles.goldIcon} />
            </div>
            <div className={styles.cardFooter}>Nunta Noastră</div>
          </div>
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className={styles.visualCardInner}>
          <div className={styles.memoriesMock}>
            <div className={styles.photoWall}>
              <div className={`${styles.wallPhoto} ${styles.wallPhoto1}`}>
                <div className={styles.wallPhotoInner} />
                <div className={styles.wallPhotoLabel}>Maria & Andrei</div>
              </div>
              <div className={`${styles.wallPhoto} ${styles.wallPhoto2}`}>
                <div className={styles.wallPhotoInner} />
                <div className={styles.wallPhotoLabel}>Casă de piatră! 💖</div>
              </div>
              <div className={`${styles.wallPhoto} ${styles.wallPhoto3}`}>
                <div className={styles.wallPhotoInner} />
                <div className={styles.wallPhotoLabel}>Super petrecere! 🎉</div>
              </div>
            </div>
            <div className={styles.downloadCard}>
              <div className={styles.downloadIconWrapper}>
                <DownloadSimple size={22} className={styles.downloadIcon} weight="bold" />
              </div>
              <span className={styles.downloadTitle}>Descarcă ZIP</span>
              <span className={styles.downloadProgress}>142 poze (428 MB)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <section className={styles.section} ref={containerRef}>
      <div className={styles.container}>
        
        {/* Centered Top Header */}
        <div className={styles.headerContent}>
          <span className={styles.eyebrow}>Simplu & Elegant</span>
          <h2 className={styles.title}>Cum funcționează</h2>
          <p className={styles.description}>
            Fără aplicații instalate, fără conturi create. Doar scanezi și trimiți bucurie.
          </p>
        </div>

        {/* List of steps with scrollable route timeline */}
        <div className={styles.stepsContainer}>
          <div className={styles.trackBg} />
          <div className={styles.trackHighlight} ref={trackHighlightRef} />

          {STEPS.map((step, i) => (
            <div key={step.num} className={styles.step}>
              <div className={styles.timelineCol}>
                <div 
                  className={styles.node} 
                  ref={el => nodesRef.current[i] = el}
                >
                  {step.num}
                </div>
              </div>

              <div className={styles.contentCol}>
                <div className={styles.accordionInner}>
                  <div className={styles.accordionText}>
                    <h3 className={styles.stepTitle}>{step.title}</h3>
                    <p className={styles.stepDesc}>{step.desc}</p>
                  </div>
                  <div className={styles.visualShowcase}>
                    {renderVisual(i)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
