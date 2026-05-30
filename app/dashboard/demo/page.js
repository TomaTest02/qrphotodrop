'use client';

import { useState, useEffect } from 'react';
import { SquaresFour, User, ArrowsClockwise, Archive, Check, Spinner, Camera, VideoCamera, ChatCircle, DownloadSimple, ImageBroken, Play, Package, Pencil, Sparkle, Printer, X, Copy, Checks, Rocket, WarningCircle } from '@phosphor-icons/react';
import DemoNavBar from '@/components/marketing/DemoNavBar';
import styles from './dashboard-demo.module.css';

const DEFAULT_MOCK_UPLOADS = [
  {
    id: 'mock-upload-1',
    event_id: 'DEMO',
    file_type: 'photo',
    original_name: 'Toast_Champagne_Mese.jpg',
    public_url: '', // will show a placeholder graphic
    size_bytes: 4200000,
    sender_name: 'Elena Sandu',
    sender_email: 'elena.sandu@yahoo.com',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 mins ago
  },
  {
    id: 'mock-upload-2',
    event_id: 'DEMO',
    file_type: 'photo',
    original_name: 'Pregatiri_Miri_Detalii.jpg',
    public_url: '',
    size_bytes: 5800000,
    sender_name: 'Andrei Popescu',
    sender_email: 'andrei.popescu@gmail.com',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
  },
  {
    id: 'mock-upload-3',
    event_id: 'DEMO',
    file_type: 'video',
    original_name: 'Dansul_Mirilor_Dans.mp4',
    public_url: '',
    size_bytes: 45000000,
    sender_name: 'Marius Radu',
    sender_email: 'marius.radu@gmail.com',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() // 4 hours ago
  }
];

const DEFAULT_MOCK_WISHES = [
  {
    id: 'mock-wish-1',
    event_id: 'DEMO',
    first_name: 'Mihai',
    last_name: 'Popescu',
    email: 'mihai.popescu@gmail.com',
    message: 'Casă de piatră, dragilor! Să fiți fericiți, să vă iubiți toată viața și să aveți parte de cele mai frumoase momente împreună! 🥂❤️',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() // 45 mins ago
  },
  {
    id: 'mock-wish-2',
    event_id: 'DEMO',
    first_name: 'Ioana',
    last_name: 'Vasile',
    email: 'ioana.v@gmail.com',
    message: 'O nuntă de vis! Ne bucurăm enorm că v-am fost alături în această zi atât de specială pentru voi. Să aveți parte de o căsnicie binecuvântată!',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() // 3 hours ago
  }
];

export default function OrganizerDemoDashboard() {
  const [activeTab, setActiveTab] = useState('poze'); // poze, clipuri, urari
  const [activeView, setActiveView] = useState('eveniment'); // eveniment, cont
  const [uploads, setUploads] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [selectedDesign, setSelectedDesign] = useState('Classic Burgundy');
  const [archiveState, setArchiveState] = useState('idle'); // idle, generating, ready
  const [copied, setCopied] = useState(false);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [printOrdered, setPrintOrdered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [cardText, setCardText] = useState('');
  const [cardTextMode, setCardTextMode] = useState('preset'); // 'preset' | 'custom'

  const PRESET_TEXTS = [
    'Vrem să ne vedem povestea prin ochii tăi! Scanează codul QR pentru a ne trimite instant pozele de la eveniment.',
    'Captureaz-ne ziua din perspectiva ta! Scanează codul QR și trimite-ne pozele preferate.',
    'Fiecare amintire contează! Scanează codul QR și adaugă-ți pozele la galeria noastră de nuntă.',
  ];

  const loadData = () => {
    // Load database values from localStorage or set defaults
    const storedUploads = localStorage.getItem('qrphotodrop_demo_uploads');
    if (!storedUploads) {
      localStorage.setItem('qrphotodrop_demo_uploads', JSON.stringify(DEFAULT_MOCK_UPLOADS));
      setUploads(DEFAULT_MOCK_UPLOADS);
    } else {
      const parsed = JSON.parse(storedUploads);
      // Sanitize stale blob: URLs — they expire when the tab that created them closes
      const cleaned = parsed.map(u =>
        u.public_url && u.public_url.startsWith('blob:') ? { ...u, public_url: '' } : u
      );
      // If anything changed, persist the cleaned list so next load is also clean
      if (cleaned.some((u, i) => u.public_url !== parsed[i].public_url)) {
        localStorage.setItem('qrphotodrop_demo_uploads', JSON.stringify(cleaned));
      }
      setUploads(cleaned);
    }

    const storedWishes = localStorage.getItem('qrphotodrop_demo_wishes');
    if (!storedWishes) {
      localStorage.setItem('qrphotodrop_demo_wishes', JSON.stringify(DEFAULT_MOCK_WISHES));
      setWishes(DEFAULT_MOCK_WISHES);
    } else {
      setWishes(JSON.parse(storedWishes));
    }

    const storedDesign = localStorage.getItem('qrphotodrop_demo_selected_design');
    if (storedDesign) {
      setSelectedDesign(storedDesign);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();

    // Auto-refresh when user switches back to this tab (e.g. after uploading as guest)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleSelectDesign = (designName) => {
    setSelectedDesign(designName);
    localStorage.setItem('qrphotodrop_demo_selected_design', designName);
  };

  const handleOpenPrintModal = () => {
    setCardText(PRESET_TEXTS[0]);
    setCardTextMode('preset');
    setPrintModalOpen(true);
  };

  const handlePrintConfirm = () => {
    if (!cardText.trim()) return;
    setPrintOrdered(true);
    // Log request to admin support log
    const supportLogs = JSON.parse(localStorage.getItem('qrphotodrop_demo_support_logs') || '[]');
    supportLogs.unshift({
      id: 'support-log-' + Date.now(),
      email: 'demo@qrphotodrop.ro',
      type: 'Comandă Printare',
      message: `Design: "${selectedDesign}" | Text pe cartonaș: "${cardText.trim()}"`,
      created_at: new Date().toISOString()
    });
    localStorage.setItem('qrphotodrop_demo_support_logs', JSON.stringify(supportLogs));
    setPrintModalOpen(false);
    setTimeout(() => {
      setPrintOrdered(false);
      alert('Cererea ta de printare profesională a fost trimisă către echipa QRPhotoDrop. Te vom contacta în cel mai scurt timp cu un deviz!');
    }, 300);
  };

  const handlePrintRequest = () => {
    handleOpenPrintModal();
  };

  const handleGenerateArchive = () => {
    setArchiveState('generating');
    setTimeout(() => {
      setArchiveState('ready');
    }, 2500); // 2.5s delay simulation
  };

  const handleSupportSubmit = (e) => {
    e.preventDefault();
    if (!supportMessage) return;

    // Log support ticket in localStorage
    const supportLogs = JSON.parse(localStorage.getItem('qrphotodrop_demo_support_logs') || '[]');
    supportLogs.unshift({
      id: 'support-log-' + Date.now(),
      email: 'demo@qrphotodrop.ro',
      type: 'Suport Tehnic',
      message: supportMessage,
      created_at: new Date().toISOString()
    });
    localStorage.setItem('qrphotodrop_demo_support_logs', JSON.stringify(supportLogs));

    setSupportSuccess(true);
    setSupportMessage('');
    setTimeout(() => setSupportSuccess(false), 4000);
  };

  const getUploadUrl = () => {
    if (mounted && typeof window !== 'undefined') {
      return `${window.location.origin}/upload/DEMO`;
    }
    return 'https://qrphotodrop.ro/upload/DEMO';
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getUploadUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const photos = uploads.filter(u => u.file_type === 'photo');
  const videos = uploads.filter(u => u.file_type === 'video');

  return (
    <>
      <DemoNavBar />
      <div className={styles.wrapper}>
        
        {/* SIDEBAR MOCK */}
        <aside className={styles.sidebar}>
          <a href="/" className={styles.logo}>QRPhotoDrop</a>
          
          <nav className={styles.nav}>
            <button
              onClick={() => setActiveView('eveniment')}
              className={`${styles.navLink} ${activeView === 'eveniment' ? styles.navActive : ''}`}
            >
              <SquaresFour size={16} weight="light" /> Evenimentul meu
            </button>
            <button
              onClick={() => setActiveView('cont')}
              className={`${styles.navLink} ${activeView === 'cont' ? styles.navActive : ''}`}
            >
              <User size={16} weight="light" /> Contul meu
            </button>
          </nav>

          <div className={styles.sidebarFooter}>
            <p className={styles.userEmail}>demo@qrphotodrop.ro</p>
            <a href="/" className={styles.logoutBtn}>Deconectează-te</a>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className={styles.content}>
          
          {/* TOP DEMO ALERT BANNER */}
          <div className={styles.demoAlert}>
            <Rocket size={15} weight="light" style={{ flexShrink: 0 }} /> <strong>Mod Sandbox Demo:</strong> Aceasta este interfața pe care o folosește <strong>Organizatorul evenimentului</strong>. Poți genera arhiva, alege designul cartonașelor cu QR de printat și vizualiza fișierele trimise. Deschide 
            <a href="/upload/DEMO" target="_blank" style={{ textDecoration: 'underline', fontWeight: 800, color: 'var(--color-burgundy)', marginLeft: '4px' }}>
              Ecranul de Upload Invitat (DEMO)
            </a> ca să încarci propriile poze și să le vezi sosite aici în timp real!
          </div>

          {activeView === 'eveniment' ? (
            <div className={styles.eventDashboard}>
              
              {/* Header block */}
              <div className={styles.dashboardHeader}>
                <div>
                  <h1 className={styles.title}>Nunta Noastră Demo</h1>
                  <p className={styles.meta}>Nuntă · 28 Mai 2026</p>
                </div>
                <div className={styles.headerActions}>
                  <button onClick={loadData} className={styles.refreshBtn} title="Reîmprospătează datele">
                    <ArrowsClockwise size={14} weight="light" /> Reîmprospătează
                  </button>
                  {archiveState === 'idle' && (
                    <button onClick={handleGenerateArchive} className={styles.archiveBtn}>
                      <Archive size={15} weight="light" /> Generează arhiva
                    </button>
                  )}
                  {archiveState === 'generating' && (
                    <button disabled className={styles.archiveBtn} style={{ background: '#b58c77', cursor: 'wait' }}>
                      <Spinner size={15} weight="light" style={{ animation: 'spin 1s linear infinite' }} /> Se generează...
                    </button>
                  )}
                  {archiveState === 'ready' && (
                    <button disabled className={styles.archiveBtn} style={{ background: '#10b981' }}>
                      <Check size={15} weight="light" /> Gata (Vezi email)
                    </button>
                  )}
                </div>
              </div>

              {/* Archive generating message banner */}
              {archiveState === 'generating' && (
                <div className={styles.archiveBannerPending}>
                  <WarningCircle size={15} weight="light" style={{ flexShrink: 0 }} /> Arhiva este în curs de generare, durează câteva minute. Va fi trimis un email când este gata. Recomandăm descărcarea arhivei printr-o conexiune Wi-Fi!
                </div>
              )}
              {archiveState === 'ready' && (
                <div className={styles.archiveBannerSuccess}>
                  <Check size={15} weight="light" style={{ flexShrink: 0 }} /> Arhiva a fost trimisă cu succes la <strong>demo@qrphotodrop.ro</strong>! Verifică email-ul pentru link-ul de descărcare securizat.
                </div>
              )}

              {/* Stats Grid */}
              <div className={styles.stats}>
                <div className={styles.statCard}>
                  <p className={styles.statValue}>{photos.length}</p>
                  <p className={styles.statLabel}>Fotografii</p>
                </div>
                <div className={styles.statCard}>
                  <p className={styles.statValue}>{videos.length}</p>
                  <p className={styles.statLabel}>Clipuri Video</p>
                </div>
                <div className={styles.statCard}>
                  <p className={styles.statValue}>{wishes.length}</p>
                  <p className={styles.statLabel}>Urări primite</p>
                </div>
              </div>

              {/* QR Code and Copy Link Section */}
              <div className={styles.qrSection}>
                <h3 className={styles.sectionTitle}>Codul QR al evenimentului</h3>
                <div className={styles.qrCard}>
                  <div className={styles.qrCodeGraphic}>
                    {/* Simulated QR API fetch pointing to DEMO upload page */}
                    <img 
                      src={`/api/qrcode?text=${encodeURIComponent(getUploadUrl())}&size=200`} 
                      alt="Cod QR Demo"
                      className={styles.qrImage}
                    />
                  </div>
                  <div className={styles.qrInfo}>
                    <p className={styles.qrInstruction}>
                      Acest QR conține link-ul ce permite invitaților, prin scanare, să acceseze și să încarce elemente direct în platforma web (fără cont sau aplicație de instalat).
                    </p>
                    <div className={styles.qrLinkWrap}>
                      <span className={styles.qrLink}>{getUploadUrl()}</span>
                      <button onClick={handleCopyLink} className={styles.copyBtn}>
                         {copied ? <><Checks size={13} weight="light" /> Copiat</> : <><Copy size={13} weight="light" /> Copiază link</>}
                      </button>
                    </div>
                    <p className={styles.eventCodeLabel}>
                      Cod Eveniment: <strong>DEMO</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Design Selector Block */}
              <div className={styles.designSection}>
                <h3 className={styles.sectionTitle}>Alege un design din catalog</h3>
                <p className={styles.sectionSubtitle}>
                  Alege un model din catalog pentru discuția cu echipa QRPhotoDrop sau descarcă în format digital!
                </p>
                
                <div className={styles.designGrid}>
                  {[
                    { name: 'Classic Burgundy', image: '/images/mockups/classic_burgundy.png' },
                    { name: 'Cream Elegant', image: '/images/mockups/cream_elegant.png' },
                    { name: 'Gold Minimalist', image: '/images/mockups/gold_minimalist.png' }
                  ].map((design) => {
                    const isSelected = selectedDesign === design.name;
                    return (
                      <div 
                        key={design.name} 
                        onClick={() => handleSelectDesign(design.name)}
                        className={`${styles.designCard} ${isSelected ? styles.designSelected : ''}`}
                      >
                        <div className={styles.designPreview}>
                          <img src={design.image} alt={design.name} className={styles.designPreviewImg} />
                        </div>
                        <div className={styles.designCardInfo}>
                          <span className={styles.designCardName}>{design.name}</span>
                          <span className={styles.designCardStatus}>
                            {isSelected ? <><Check size={12} weight="light" /> Selectat</> : 'Alege model'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.designActions}>
                  <button onClick={handlePrintRequest} className={styles.printBtn}>
                    <Package size={16} weight="light" /> Cere administratorului să printeze cartonașele (Taxat extra)
                  </button>
                </div>
              </div>

              {/* Content Tabs */}
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${activeTab === 'poze' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('poze')}
                >
                  <Camera size={14} weight="light" /> Fotografii ({photos.length})
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'clipuri' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('clipuri')}
                >
                  <VideoCamera size={14} weight="light" /> Clipuri ({videos.length})
                </button>
                <button
                  className={`${styles.tab} ${activeTab === 'urari' ? styles.tabActive : ''}`}
                  onClick={() => setActiveTab('urari')}
                >
                  <ChatCircle size={14} weight="light" /> Urări ({wishes.length})
                </button>
              </div>

              {/* Tab Content Display */}
              {activeTab === 'poze' && (
                <div className={styles.photoGrid}>
                  {photos.length === 0 ? (
                    <p className={styles.emptyTab}>Nicio fotografie încă. Încarcă una din perspectiva invitatului!</p>
                  ) : (
                    photos.map((photo) => (
                      <div key={photo.id} className={styles.photoItem}>
                        {photo.public_url ? (
                          <img
                            src={photo.public_url}
                            alt={photo.original_name}
                            className={styles.photoImg}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div
                          className={styles.photoPlaceholderGraphic}
                          style={{ display: photo.public_url ? 'none' : 'flex' }}
                        >
                          <ImageBroken size={24} weight="light" style={{ opacity: 0.4 }} />
                          <span style={{ fontSize: '10px', marginTop: '6px' }}>Imagine indisponibilă</span>
                        </div>
                        <div className={styles.photoFooter}>
                          <p className={styles.photoName} title={photo.original_name}>
                            {photo.original_name}
                          </p>
                          <p className={styles.photoSender}>
                            De la: {photo.sender_name || 'Invitat Anonim'}
                          </p>
                          <a href="#" onClick={(e) => e.preventDefault()} className={styles.photoDownload}>
                            ⬇ Descarcă
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'clipuri' && (
                <div className={styles.photoGrid}>
                  {videos.length === 0 ? (
                    <p className={styles.emptyTab}>Niciun clip video încă. Încarcă unul din perspectiva invitatului!</p>
                  ) : (
                    videos.map((video) => (
                      <div key={video.id} className={styles.photoItem}>
                        {video.public_url ? (
                          <video
                            src={video.public_url}
                            className={styles.photoImg}
                            controls
                          />
                        ) : (
                          // Placeholder graphic for default mock video
                          <div className={styles.photoPlaceholderGraphic} style={{ background: 'var(--color-violet-pale)' }}>
                            <Play size={24} weight="light" style={{ opacity: 0.4 }} />
                            <span style={{ fontSize: '10px', marginTop: '6px' }}>Clip video</span>
                          </div>
                        )}
                        <div className={styles.photoFooter}>
                          <p className={styles.photoName} title={video.original_name}>
                            {video.original_name}
                          </p>
                          <p className={styles.photoSender}>
                            De la: {video.sender_name || 'Invitat Anonim'}
                          </p>
                          <a href="#" onClick={(e) => e.preventDefault()} className={styles.photoDownload}>
                            ⬇ Descarcă
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'urari' && (
                <div className={styles.wishesList}>
                  {wishes.length === 0 ? (
                    <p className={styles.emptyTab}>Nicio urare încă. Trimite una din perspectiva invitatului!</p>
                  ) : (
                    wishes.map((wish) => (
                      <div key={wish.id} className={styles.wishCard}>
                        <div className={styles.wishHeader}>
                          <span className={styles.wishAuthor}>
                            {wish.first_name} {wish.last_name} 
                            {wish.email && <span className={styles.wishEmail}> ({wish.email})</span>}
                          </span>
                          <span className={styles.wishDate}>
                            {new Date(wish.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <p className={styles.wishMessage}>{wish.message}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          ) : (
            
            /* ACCOUNT SETTINGS VIEW */
            <div className={styles.accountView}>
              <h1 className={styles.title}>Contul meu</h1>
              <p className={styles.accountSub}>Administrează detaliile contului tău demo de organizator.</p>

              <div className={styles.accountGrid}>
                {/* Profile Card */}
                <div className={styles.accountCard}>
                  <h3 className={styles.cardSectionTitle}>Detalii cont</h3>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.inputLabel}>Adresă de Email</label>
                    <input 
                      type="email" 
                      value="demo@qrphotodrop.ro" 
                      disabled 
                      className={styles.accountInput} 
                    />
                    <p className={styles.inputHelp}>Email-ul nu poate fi schimbat în modul DEMO.</p>
                  </div>

                  <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                    <label className={styles.inputLabel}>Parolă actuală</label>
                    <input 
                      type="password" 
                      value="••••••••••••" 
                      disabled 
                      className={styles.accountInput} 
                    />
                  </div>

                  <button 
                    onClick={() => alert('Parola a fost resetată cu succes (simulare în modul DEMO).')} 
                    className={styles.accountBtn}
                  >
                    Resetează parola
                  </button>
                </div>

                {/* Support Form Card */}
                <div className={styles.accountCard}>
                  <h3 className={styles.cardSectionTitle}>Mesaj pentru suport (Administrator)</h3>
                  <p className={styles.supportHelp}>
                    Ai o nelămurire? Trimite un mesaj direct administratorului platformei SaaS. Răspundem repede!
                  </p>

                  {supportSuccess ? (
                    <div className={styles.supportSuccessBanner}>
                      <Check size={15} weight="light" /> Mesajul tău a fost trimis! Echipa noastră va răspunde în cel mai scurt timp.
                    </div>
                  ) : (
                    <form onSubmit={handleSupportSubmit} className={styles.supportForm}>
                      <textarea
                        required
                        rows={4}
                        placeholder="Scrie mesajul tău pentru suport..."
                        value={supportMessage}
                        onChange={(e) => setSupportMessage(e.target.value)}
                        className={styles.supportTextarea}
                      />
                      <button type="submit" className={styles.supportSubmitBtn}>
                        Trimite mesajul
                      </button>
                    </form>
                  )}
                </div>
              </div>

            </div>
          )}

        </main>
      </div>

      {/* ===== PRINT MODAL ===== */}
      {printModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setPrintModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            
            <button className={styles.modalClose} onClick={() => setPrintModalOpen(false)}><X size={16} weight="light" /></button>

            <div className={styles.modalHeader}>
              <span className={styles.modalEmoji}><Printer size={36} weight="light" style={{ color: '#710927' }} /></span>
              <h2 className={styles.modalTitle}>Personalizează textul de pe cartonaș</h2>
              <p className={styles.modalSubtitle}>
                Alege un mesaj din variantele noastre sau scrie textul tău personalizat — îl vom imprima exact pe cartonașul <strong>{selectedDesign}</strong>.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className={styles.modeSwitcher}>
              <button
                className={`${styles.modeBtn} ${cardTextMode === 'preset' ? styles.modeBtnActive : ''}`}
                onClick={() => { setCardTextMode('preset'); setCardText(PRESET_TEXTS[0]); }}
              >
                <Sparkle size={14} weight="light" /> Variante recomandate
              </button>
              <button
                className={`${styles.modeBtn} ${cardTextMode === 'custom' ? styles.modeBtnActive : ''}`}
                onClick={() => { setCardTextMode('custom'); setCardText(''); }}
              >
                <Pencil size={14} weight="light" /> Text personalizat
              </button>
            </div>

            {/* Preset Options */}
            {cardTextMode === 'preset' && (
              <div className={styles.presetList}>
                {PRESET_TEXTS.map((text, i) => (
                  <div
                    key={i}
                    className={`${styles.presetOption} ${cardText === text ? styles.presetSelected : ''}`}
                    onClick={() => setCardText(text)}
                  >
                    <div className={styles.presetRadio}>
                      <span className={styles.presetRadioDot} />
                    </div>
                    <p className={styles.presetText}>{text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Text */}
            {cardTextMode === 'custom' && (
              <div className={styles.customTextArea}>
                <label className={styles.customLabel}>Textul tău (maxim 200 caractere)</label>
                <textarea
                  className={styles.customTextarea}
                  rows={4}
                  maxLength={200}
                  placeholder="Ex: Îți mulțumim că ești alături de noi! Scanează QR-ul și trimite-ne o poză..."
                  value={cardText}
                  onChange={(e) => setCardText(e.target.value)}
                />
                <span className={styles.charCount}>{cardText.length}/200</span>
              </div>
            )}

            {/* Preview Card */}
            {cardText.trim() && (
              <div className={styles.cardPreviewWrap}>
                <p className={styles.previewLabel}>Previzualizare cartonaș:</p>
                <div className={styles.cardPreview}>
                  <div className={styles.cardPreviewInner}>
                    <p className={styles.cardPreviewText}>{cardText}</p>
                    <div className={styles.cardPreviewQr}>
                      <div className={styles.cardPreviewQrGrid} />
                      <span className={styles.cardPreviewQrLabel}>QR CODE</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className={styles.modalActions}>
              <button className={styles.modalCancelBtn} onClick={() => setPrintModalOpen(false)}>
                Anulează
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={handlePrintConfirm}
                disabled={!cardText.trim()}
              >
                <Package size={15} weight="light" /> Trimite cererea de printare
              </button>
            </div>

          </div>
        </div>
      )}

    </>
  );
}
