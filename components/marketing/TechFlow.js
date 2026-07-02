'use client';

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { 
  Check, QrCode, Shield, Phone, Lock, DownloadSimple
} from '@phosphor-icons/react';
import styles from './TechFlow.module.css';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const STEPS = [
  {
    num: '01',
    title: 'Comanda și Activarea Contului',
    short: 'Achiziție rapidă și configurare securizată.',
    desc: 'Selectezi pachetul dorit de pe site-ul de prezentare și finalizezi comanda. Sistemul îți trimite instant o parolă temporară pe email. La prima logare, introduci numărul de telefon pentru securizarea prin cod SMS și îți setezi propria parolă securizată.',
    badge: 'Pasul 1 — Pornire rapidă'
  },
  {
    num: '02',
    title: 'Personalizarea Catalogului de Cartonașe',
    short: 'Alegerea modelului ideal pentru mese.',
    desc: 'Accesezi dashboard-ul de organizator unde ai codul tău QR unic și link-ul. Alegi din catalog designul preferat de cartonaș (Classic Burgundy, Cream Elegant, Gold Minimalist) pe care îl poți descărca direct digital sau poți cere tipărirea fizică profesională direct din cont.',
    badge: 'Pasul 2 — Design & QR'
  },
  {
    num: '03',
    title: 'Distribuirea Codului QR și a Link-ului',
    short: 'Zero friction pentru invitații tăi.',
    desc: 'Amplasezi cartonașele printate pe mesele invitaților sau le trimiți link-ul scurt direct prin WhatsApp, SMS ori rețele sociale. Invitații nu trebuie să instaleze nicio aplicație sau să-și creeze vreun cont pe telefon pentru a trimite amintirile.',
    badge: 'Pasul 3 — Distribuire'
  },
  {
    num: '04',
    title: 'Încărcarea Amintirilor de către Invitați',
    short: 'Upload poze, video și urări text.',
    desc: 'Invitații scanează QR-ul sau deschid link-ul și sunt redirecționați pe o pagină simplă cu 2 butoane: „Încarcă poze/video” sau „Lasă o urare”. Pot selecta zeci de fișiere simultan din galeria lor sau pot face o fotografie live cu camera, totul însoțit de nume, prenume și email (opțional).',
    badge: 'Pasul 4 — Upload Invitați'
  },
  {
    num: '05',
    title: 'Centralizarea Live și Arhiva ZIP',
    short: 'Management facil și descărcare rapidă.',
    desc: 'Toate fotografiile, videoclipurile și mesajele de felicitare sosesc instant în dashboard-ul tău, organizate separat în două tab-uri. Oricând dorești, generezi arhiva ZIP direct pe email-ul tău pentru a descărca toate amintirile la rezoluție maximă.',
    badge: 'Pasul 5 — Centralizare'
  }
];

export default function TechFlow({ type = 'nunta' }) {
  const [currentStep, setCurrentStep] = useState(0); // 0-indexed: 0, 1, 2, 3, 4
  const currentStepRef = useRef(0);

  const containerRef = useRef(null);
  const trackHighlightRef = useRef(null);
  const stepBlocksRef = useRef([]);
  const scrollTriggerRef = useRef(null);

  const updateStep = (newStep) => {
    if (currentStepRef.current !== newStep) {
      currentStepRef.current = newStep;
      setCurrentStep(newStep);
    }
  };

  const handleStepClick = (idx) => {
    updateStep(idx);
    
    if (typeof window !== 'undefined') {
      const isDesktop = window.innerWidth > 992;
      if (isDesktop && scrollTriggerRef.current) {
        const start = scrollTriggerRef.current.start;
        const end = scrollTriggerRef.current.end;
        const range = end - start;
        const stepProgress = (idx + 0.5) / STEPS.length;
        const targetScroll = start + stepProgress * range;
        
        window.scrollTo({
          top: targetScroll,
          behavior: 'smooth'
        });
      } else {
        const block = stepBlocksRef.current[idx];
        if (block) {
          block.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      let mm = gsap.matchMedia();

      mm.add("(min-width: 993px)", () => {
        // Single timeline that pins the section and scrubs the track highlight
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top top',
            end: '+=1500',
            pin: true,
            scrub: 0.5,
            onUpdate: (self) => {
              const progress = self.progress;
              let idx = Math.floor(progress * STEPS.length);
              if (idx > STEPS.length - 1) idx = STEPS.length - 1;
              updateStep(idx);
            }
          }
        });

        tl.fromTo(trackHighlightRef.current,
          { scaleY: 0 },
          { scaleY: 1, ease: 'none' }
        );

        scrollTriggerRef.current = tl.scrollTrigger;

        return () => {
          if (tl.scrollTrigger) tl.scrollTrigger.kill();
          tl.kill();
        };
      });

      mm.add("(max-width: 992px)", () => {
        // Mobile layout highlight track animation
        gsap.fromTo(trackHighlightRef.current,
          { scaleY: 0 },
          {
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top center',
              end: 'bottom center',
              scrub: 0.5,
            },
            scaleY: 1,
            ease: 'none'
          }
        );

        // Mobile active step trigger
        const triggers = stepBlocksRef.current.map((block, idx) => {
          if (!block) return null;
          return ScrollTrigger.create({
            trigger: block,
            start: 'top center+=120',
            end: 'bottom center-=120',
            onEnter: () => updateStep(idx),
            onEnterBack: () => updateStep(idx),
          });
        });

        return () => {
          triggers.forEach(t => t && t.kill());
        };
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const activeStep = STEPS[currentStep];

  // Helper for step customization text based on page event type
  const getEventName = () => {
    if (type === 'botez') return 'Botez';
    if (type === 'aniversare') return 'Aniversare';
    if (type === 'corporate') return 'Corporate';
    return 'Nuntă';
  };

  const getEventEmoji = () => {
    if (type === 'botez') return '👶🍼';
    if (type === 'aniversare') return '🎂🎉';
    if (type === 'corporate') return '💼🚀';
    return '🤵👰';
  };

  return (
    <section className={styles.techSection} ref={containerRef}>
      <div className={styles.techInner}>
        
        {/* Header */}
        <div className={styles.techHeader}>
          <span className={styles.techEyebrow}>Cum Funcționează Platforma SaaS</span>
          <h2 className={styles.techTitle}>Traseul Amintirilor: Pas cu Pas</h2>
          <p className={styles.techSubtitle}>
            Vezi în detaliu fluxul complet al aplicației noastre. De la cumpărare, la personalizarea cartonașelor cu coduri QR, încărcarea simplă a invitaților și descărcarea arhivei centralizate.
          </p>
        </div>

        {/* Roadmap Content Grid */}
        <div className={styles.roadmapGrid}>
          
          {/* LEFT SIDE: Vertical Timeline Selectors */}
          <div className={styles.timelineContainer}>
            <div className={styles.timelineTrack} />
            <div 
              className={styles.timelineTrackHighlight} 
              ref={trackHighlightRef}
            />

            <div className={styles.stepsList}>
              {STEPS.map((step, idx) => {
                const isActive = idx === currentStep;
                return (
                  <div 
                    key={step.num} 
                    className={`${styles.stepBlock} ${isActive ? styles.stepBlockActive : ''}`}
                    onClick={() => handleStepClick(idx)}
                    ref={el => stepBlocksRef.current[idx] = el}
                  >
                    {/* Node on the vertical line */}
                    <div className={`${styles.timelineNode} ${isActive ? styles.timelineNodeActive : ''}`}>
                      {isActive ? <Check size={12} strokeWidth={3} /> : idx + 1}
                    </div>

                    <div className={styles.stepContent}>
                      <span className={styles.stepNum}>{step.num}</span>
                      <h4 className={styles.stepTitle}>{step.title}</h4>
                      <p className={styles.stepShort}>{step.short}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE: Visual Mockup Showcase */}
          <div className={styles.mockupContainer}>
            <div className={styles.mockupHeader} key={`hdr-${currentStep}`}>
              <span className={styles.mockupBadge}>{activeStep.badge}</span>
              <p className={styles.mockupExplanation}>
                {currentStep === 3
                  ? activeStep.desc.replace('evenimentului tău', `evenimentului tău de ${getEventName().toLowerCase()}`)
                  : activeStep.desc
                }
              </p>
            </div>

            {/* MOCKUP SHOWCASE CARD */}
            <div className={styles.mockupVisualWrapper} key={`vis-${currentStep}`}>
              
              {/* STEP 1 VISUAL: Phone Setup / First Login */}
              {currentStep === 0 && (
                <div className={styles.phoneVisualFrame}>
                  <div className={styles.phoneBezel}>
                    <div className={styles.phoneNotch} />
                    <div className={styles.phoneScreen}>
                      <div className={styles.phoneAppHeaderBurgundy}>
                        <span className={styles.phoneAppTitle}>Finalizează Logarea</span>
                        <span className={styles.phoneAppSub}>Securizare Cont Organizator</span>
                      </div>
                      <div className={styles.firstLoginContent}>
                        <div className={styles.mockFormGroup}>
                          <label className={styles.mockLabel}>Telefon organizator</label>
                          <div className={styles.mockInputWrapper}>
                            <Phone size={11} className={styles.mockInputIcon} />
                            <span className={styles.mockInputValue}>+40 774 043 791</span>
                          </div>
                        </div>

                        <div className={styles.mockFormGroup}>
                          <label className={styles.mockLabel}>Cod SMS de verificare</label>
                          <div className={styles.mockInputWrapper}>
                            <Shield size={11} className={styles.mockInputIcon} />
                            <span className={styles.mockInputValue}>1 2 3 4 5 6</span>
                          </div>
                        </div>

                        <div className={styles.mockFormGroup}>
                          <label className={styles.mockLabel}>Setați parolă nouă</label>
                          <div className={styles.mockInputWrapper}>
                            <Lock size={11} className={styles.mockInputIcon} />
                            <span className={styles.mockInputValue}>••••••••••••</span>
                          </div>
                        </div>

                        <div className={styles.mockSuccessBox}>
                          <div className={styles.mockSuccessIcon}>✓</div>
                          <span className={styles.mockSuccessText}>Cont activat cu succes!</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2 VISUAL: Catalog / Dashboard Card Selector */}
              {currentStep === 1 && (
                <div className={styles.laptopVisualFrame}>
                  <div className={styles.laptopScreen}>
                    <div className={styles.laptopTopBar}>
                      <span className={styles.laptopLogo}>QRPhotoDrop</span>
                      <span className={styles.laptopTabActive}>📋 Evenimentul meu</span>
                    </div>
                    <div className={styles.laptopBody}>
                      <div className={styles.laptopSectionTitle}>Alege un design din catalog</div>
                      <div className={styles.cardDesignsRow}>
                        
                        <div className={`${styles.designCatalogCard} ${styles.designCardBurgundy}`}>
                          <div className={styles.designVisualArea}>
                            <span className={styles.designCardTitle}>Classic Burgundy</span>
                            <span className={styles.designQrSymbol}>[QR]</span>
                          </div>
                          <div className={styles.designCardFooter}>
                            <span>Selectat</span>
                            <span className={styles.checkIconGreen}>✓</span>
                          </div>
                        </div>

                        <div className={styles.designCatalogCard}>
                          <div className={styles.designVisualArea} style={{ background: '#faf7f2', color: '#710927' }}>
                            <span className={styles.designCardTitle}>Cream Elegant</span>
                            <span className={styles.designQrSymbol}>[QR]</span>
                          </div>
                          <div className={styles.designCardFooter}>
                            <span>Descarcă</span>
                          </div>
                        </div>

                        <div className={styles.designCatalogCard}>
                          <div className={styles.designVisualArea} style={{ background: '#fcfaf2', color: '#b58c4f' }}>
                            <span className={styles.designCardTitle}>Gold Minimalist</span>
                            <span className={styles.designQrSymbol}>[QR]</span>
                          </div>
                          <div className={styles.designCardFooter}>
                            <span>Descarcă</span>
                          </div>
                        </div>

                      </div>

                      <button type="button" className={styles.laptopPrintBtn}>
                        📦 Cere administratorului să-ți printeze aceste cartonașe (Taxat extra)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 VISUAL: QR Code & Direct Link Delivery */}
              {currentStep === 2 && (
                <div className={styles.qrShareWrapper}>
                  {/* Decorative Place Card */}
                  <div className={styles.placeCardGraphic}>
                    <div className={styles.placeCardInner}>
                      <span className={styles.placeCardTitle}>{getEventName()} {getEventEmoji()}</span>
                      <div className={styles.placeCardQrBox}>
                        <QrCode size={48} className={styles.burgundyColorIcon} />
                      </div>
                      <p className={styles.placeCardInstruct}>Vrem să ne vedem povestea prin ochii tăi! Scanează codul QR pentru a trimite instant pozele de la eveniment.</p>
                      <span className={styles.placeCardLogo}>qrphotodrop.com</span>
                    </div>
                  </div>

                  {/* Mock WhatsApp message bubble */}
                  <div className={styles.chatBubbleGraphic}>
                    <div className={styles.chatHeader}>
                      <span className={styles.chatAuthor}>Invitați {getEventName()} WhatsApp</span>
                      <span className={styles.chatStatus}>online</span>
                    </div>
                    <div className={styles.chatMessage}>
                      Salutare tuturor! Aici puteți pune toate pozele de la eveniment. Doar scanați cartonașul de pe mese sau deschideți linkul: <br />
                      <strong style={{ color: '#2d1b69' }}>qrphotodrop.com/upload/{type}-code 🥂</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4 VISUAL: Phone Guest Upload Screen */}
              {currentStep === 3 && (
                <div className={styles.phoneVisualFrame}>
                  <div className={styles.phoneBezel}>
                    <div className={styles.phoneNotch} />
                    <div className={styles.phoneScreen}>
                      <div className={styles.phoneAppHeaderBurgundy}>
                        <span className={styles.phoneAppTitle}>{getEventName()} Noastră {getEventEmoji()}</span>
                        <span className={styles.phoneAppSub}>Nu ai nevoie de cont</span>
                      </div>
                      <div className={styles.guestUploadButtonsBox}>
                        
                        <div className={styles.guestActionBtnMock}>
                          <span className={styles.guestActionIcon}>📸</span>
                          <div style={{ textAlign: 'left' }}>
                            <span className={styles.guestActionTitle}>Încarcă Poză / Video</span>
                            <span className={styles.guestActionDesc}>Din galerie sau direct cu camera</span>
                          </div>
                        </div>

                        <div className={styles.guestActionBtnMock} style={{ background: '#ffffff', borderColor: '#2d1b69' }}>
                          <span className={styles.guestActionIcon}>✍️</span>
                          <div style={{ textAlign: 'left' }}>
                            <span className={styles.guestActionTitle} style={{ color: '#2d1b69' }}>Lasă o Urare</span>
                            <span className={styles.guestActionDesc}>Scrie un mesaj mirilor</span>
                          </div>
                        </div>

                        {/* Preview of file upload success */}
                        <div className={styles.guestSuccessMessageCard}>
                          <span className={styles.successCheckSymbol}>✓</span>
                          <div>
                            <span className={styles.successHeadingText}>Fotografie trimisă!</span>
                            <span className={styles.successSubtext}>Mulțumim că putem să ne vedem povestea prin ochii tăi!</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5 VISUAL: Organizer Centralization & ZIP */}
              {currentStep === 4 && (
                <div className={styles.laptopVisualFrame}>
                  <div className={styles.laptopScreen}>
                    <div className={styles.laptopTopBar}>
                      <span className={styles.laptopLogo}>QRPhotoDrop</span>
                      <span className={styles.laptopTabActive}>📋 Evenimentul meu</span>
                    </div>
                    <div className={styles.laptopBodyDashboard}>
                      
                      {/* Dashboard Stats */}
                      <div className={styles.dashboardStatsRow}>
                        <div className={styles.miniStatCard}>
                          <span className={styles.miniStatValue}>142</span>
                          <span className={styles.miniStatLabel}>Poze colectate</span>
                        </div>
                        <div className={styles.miniStatCard}>
                          <span className={styles.miniStatValue}>35</span>
                          <span className={styles.miniStatLabel}>Urări text</span>
                        </div>
                        <div className={styles.miniStatCard} style={{ borderColor: '#10b981' }}>
                          <span className={styles.miniStatValue} style={{ color: '#10b981' }}>● Live</span>
                          <span className={styles.miniStatLabel}>Conexiune activă</span>
                        </div>
                      </div>

                      {/* Organizer Dashboard Tabs Layout */}
                      <div className={styles.dashboardTabHeaders}>
                        <span className={styles.dashboardTabHeaderActive}>📸 Fotografii & Video</span>
                        <span className={styles.dashboardTabHeader}>💌 Urări de la invitați</span>
                      </div>

                      {/* Photo Grid Preview */}
                      <div className={styles.mockPhotoGrid}>
                        <div className={styles.mockPhotoItem}>
                          <span className={styles.mockPhotoEmoji}>🤵👰</span>
                          <div className={styles.mockPhotoFooter}>
                            <span className={styles.mockPhotoSender}>Elena Sandu</span>
                            <span className={styles.mockPhotoDownloadIcon}><DownloadSimple size={8} weight="bold" /></span>
                          </div>
                        </div>
                        <div className={styles.mockPhotoItem}>
                          <span className={styles.mockPhotoEmoji}>🥂</span>
                          <div className={styles.mockPhotoFooter}>
                            <span className={styles.mockPhotoSender}>Andrei Popescu</span>
                            <span className={styles.mockPhotoDownloadIcon}><DownloadSimple size={8} weight="bold" /></span>
                          </div>
                        </div>
                        <div className={styles.mockPhotoItem}>
                          <span className={styles.mockPhotoEmoji}>💃</span>
                          <div className={styles.mockPhotoFooter}>
                            <span className={styles.mockPhotoSender}>Marius Radu</span>
                            <span className={styles.mockPhotoDownloadIcon}><DownloadSimple size={8} weight="bold" /></span>
                          </div>
                        </div>
                      </div>

                      {/* ZIP Download Bar */}
                      <div className={styles.dashboardZipBar}>
                        <span className={styles.zipIconSymbol}>📦</span>
                        <div style={{ textAlign: 'left', flex: 1 }}>
                          <span className={styles.zipTitleText}>Generează Arhiva cu amintiri</span>
                          <span className={styles.zipDescText}>Vei primi un email când arhiva ZIP este gata.</span>
                        </div>
                        <button type="button" className={styles.zipActionBtnMock}>Generează ZIP</button>
                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
