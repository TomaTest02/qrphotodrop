import { QrCode, Download } from 'lucide-react';
import styles from './HowItWorks.module.css';

const STEPS = [
  { num: '01', title: 'Alegi pachetul', desc: 'Selectezi tipul evenimentului și primești instant codul QR unic și acces la dashboard-ul de organizator.' },
  { num: '02', title: 'Distribui invitaților', desc: 'Cartonașe pe mese, link pe WhatsApp, QR pe panouri decorative — alegi tu cum e mai frumos.' },
  { num: '03', title: 'Primești amintirile', desc: 'Pozele, clipurile și urările se adună automat. Le descarci ca arhivă ZIP oricând dorești.' },
];

export default function HowItWorks() {
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
              <p className={styles.mockSub}>Alege tipul evenimentului</p>
              <div className={styles.mockTypes}>
                <div className={`${styles.mockType} ${styles.mockTypeActive}`}>
                  <span>👰 Nuntă</span>
                  <span className={styles.check}>✓</span>
                </div>
                <div className={styles.mockType}>
                  <span>👶 Botez</span>
                </div>
                <div className={styles.mockType}>
                  <span>💼 Corporate</span>
                </div>
              </div>
              <div className={styles.sliderContainer}>
                <div className={styles.sliderTrack}>
                  <div className={styles.sliderFill} />
                  <div className={styles.sliderKnob} />
                </div>
                <div className={styles.sliderInfo}>
                  <span>Pachet: 150 invitați</span>
                  <strong className={styles.goldText}>499 RON</strong>
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
                  <span className={styles.chatLink}>qrphotodrop.ro/nunta 🥂</span>
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
                <Download size={22} className={styles.downloadIcon} />
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
    <section className={styles.section}>
      <div className={styles.container}>
        
        {/* Centered Top Header */}
        <div className={styles.headerContent}>
          <span className={styles.eyebrow}>Simplu & Elegant</span>
          <h2 className={styles.title}>Cum funcționează</h2>
          <p className={styles.description}>
            Fără aplicații instalate, fără conturi create. Doar scanezi și trimiți bucurie.
          </p>
        </div>

        {/* List of steps fully visible and open */}
        <div className={styles.stepsContainer}>
          {STEPS.map((step, i) => (
            <div key={step.num} className={styles.step}>
              <div className={styles.stepHeader}>
                <p className={styles.number}>{step.num}</p>
                <h3 className={styles.stepTitle}>{step.title}</h3>
              </div>

              <div className={styles.accordionContent}>
                <div className={styles.accordionInner}>
                  <div className={styles.accordionText}>
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
