'use client';

import { useState, use, useEffect, useRef } from 'react';
import {
  Camera, Image, VideoCamera, Lock, ArrowLeft, UploadSimple,
  Check, Heart, ChatBubble, Envelope, MapPin, Calendar,
  Plus, X, Play, CloudArrowUp, Sparkle
} from '@phosphor-icons/react';
import DemoNavBar from '@/components/marketing/DemoNavBar';
import styles from './upload.module.css';

// ─── Floating petals animation component ──────────────────────────────────────
function FloatingPetals() {
  return (
    <div className={styles.petalsWrap} aria-hidden="true">
      {[...Array(12)].map((_, i) => (
        <span key={i} className={styles.petal} style={{ '--i': i }} />
      ))}
    </div>
  );
}

// ─── Step indicator ────────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div className={styles.stepDots}>
      {[...Array(total)].map((_, i) => (
        <span key={i} className={`${styles.dot} ${i === current ? styles.dotActive : i < current ? styles.dotDone : ''}`} />
      ))}
    </div>
  );
}

// ─── File preview thumbnail ────────────────────────────────────────────────────
function FileThumbnail({ file }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (file.type.startsWith('video/')) {
    return (
      <div className={styles.thumbVideo}>
        <Play size={22} weight="light" style={{ opacity: 0.7 }} />
        <span className={styles.thumbName}>{file.name.slice(0, 18)}{file.name.length > 18 ? '…' : ''}</span>
      </div>
    );
  }
  return src ? <img className={styles.thumb} src={src} alt={file.name} /> : <div className={styles.thumbLoading} />;
}

export default function GuestUploadPage({ params }) {
  const { eventCode } = use(params);
  // Views: landing → mediaChoice → preview → uploading → uploadSuccess → wish → wishSuccess
  const [view, setView] = useState('landing');
  const [event, setEvent] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadCurrent, setUploadCurrent] = useState(0);
  const [wishForm, setWishForm] = useState({ firstName: '', lastName: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [publicPhotos, setPublicPhotos] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isDemo = eventCode?.toUpperCase() === 'DEMO';

  useEffect(() => {
    if (isDemo) {
      setEvent({
        id: 'DEMO',
        event_name: 'Nunta Andreei & Mihai',
        event_date: '2026-09-14T16:00:00.000Z',
        event_type: 'nunta',
        event_code: 'DEMO',
        status: 'active',
        couple_names: 'Andreea & Mihai',
        location: 'Casa Nobililor, Iași'
      });
      return;
    }
    fetch(`/api/events?code=${eventCode}`)
      .then(r => r.json())
      .then(data => { 
        if (data.event) setEvent(data.event); 
        if (data.photos) setPublicPhotos(data.photos);
      })
      .catch(() => {});
  }, [eventCode, isDemo]);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter(f => {
      if (f.type.startsWith('image/') && f.size > 20 * 1024 * 1024) return false;
      if (f.type.startsWith('video/') && f.size > 200 * 1024 * 1024) return false;
      return true;
    });
    if (valid.length > 0) {
      setFiles(valid);
      setView('preview');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    if (dropped.length > 0) {
      setFiles(dropped);
      setView('preview');
    }
  };

  const removeFile = (idx) => {
    const updated = files.filter((_, i) => i !== idx);
    setFiles(updated);
    if (updated.length === 0) setView('mediaChoice');
  };

  const uploadFiles = async (filesToUpload) => {
    setView('uploading');
    setUploadTotal(filesToUpload.length);
    setUploadCurrent(0);
    setUploadProgress(0);

    if (isDemo) {
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        setUploadCurrent(i + 1);
        setUploadProgress(Math.round((i / filesToUpload.length) * 100));
        await new Promise(resolve => setTimeout(resolve, 900));

        const fileType = file.type.startsWith('video/') ? 'video' : 'photo';
        let publicUrl = '';
        if (fileType === 'photo') {
          try {
            publicUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                  const canvas = document.createElement('canvas');
                  const MAX = 800;
                  let w = img.width, h = img.height;
                  if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
                  else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
                  canvas.width = w; canvas.height = h;
                  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                  resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.onerror = () => resolve('');
                img.src = event.target.result;
              };
              reader.onerror = () => resolve('');
              reader.readAsDataURL(file);
            });
          } catch { publicUrl = ''; }
        }

        const demoUploads = JSON.parse(localStorage.getItem('qrphotodrop_demo_uploads') || '[]');
        demoUploads.unshift({
          id: 'demo-upload-' + Date.now() + '-' + i,
          event_id: 'DEMO',
          file_type: fileType,
          original_name: file.name,
          public_url: publicUrl,
          size_bytes: file.size,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('qrphotodrop_demo_uploads', JSON.stringify(demoUploads));
        setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
      }
      setView('uploadSuccess');
      return;
    }

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setUploadCurrent(i + 1);
      setUploadProgress(Math.round((i / filesToUpload.length) * 100));
      try {
        const fileType = file.type.startsWith('video/') ? 'video' : 'photo';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('eventCode', eventCode);
        formData.append('fileType', fileType);
        formData.append('originalName', file.name);

        const uploadRes = await fetch('/api/upload/direct', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          if (errData.error === 'Storage limit exceeded for this event') {
            alert('Albumul a atins capacitatea maximă! Nu se mai pot adăuga poze.');
            setView('mediaChoice');
            return;
          }
          throw new Error(errData.error || 'Upload failed');
        }
      } catch (err) { console.error('Upload error:', err); }
      setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
    }
    setView('uploadSuccess');
  };

  const handleWishSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    if (isDemo) {
      await new Promise(resolve => setTimeout(resolve, 700));
      const demoWishes = JSON.parse(localStorage.getItem('qrphotodrop_demo_wishes') || '[]');
      demoWishes.unshift({
        id: 'demo-wish-' + Date.now(),
        event_id: 'DEMO',
        first_name: wishForm.firstName,
        last_name: wishForm.lastName,
        email: wishForm.email,
        message: wishForm.message,
        created_at: new Date().toISOString()
      });
      localStorage.setItem('qrphotodrop_demo_wishes', JSON.stringify(demoWishes));
      setView('wishSuccess');
      setLoading(false);
      return;
    }
    try {
      await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...wishForm, eventCode }),
      });
      setView('wishSuccess');
    } catch { alert('Eroare la trimitere. Încearcă din nou.'); }
    setLoading(false);
  };

  const eventName = event?.couple_names || event?.event_name || 'Evenimentul nostru';
  const eventDate = event?.event_date
    ? new Date(event.event_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const location = event?.location || '';

  // ── LANDING ────────────────────────────────────────────────────────────────
  if (view === 'landing') return (
    <PageShell isDemo={isDemo}>
      <FloatingPetals />
      <div className={styles.landingWrap}>
        <div className={styles.brandPill}>
          <span className={styles.brandDot} />
          QRPhotoDrop
        </div>

        <div className={styles.heartRing}>
          <Heart size={38} weight="light" fill="#e8829e" stroke="#c45c7e" />
        </div>

        <h1 className={styles.landingTitle}>{eventName}</h1>
        {eventDate && (
          <div className={styles.landingMeta}>
            <span><Calendar size={13} weight="light" /> {eventDate}</span>
            {location && <span><MapPin size={13} weight="light" /> {location}</span>}
          </div>
        )}

        <p className={styles.landingTagline}>
          Ajută-ne să ne vedem povestea prin ochii tăi.<br />
          Trimite-ne pozele tale sau lasă-ne un mesaj special.
        </p>

        {isDemo && (
          <div className={styles.demoBanner}>
            <span><Sparkle size={16} /></span>
            <span>
              <strong>Demo activ</strong> — Pozele apar instant în{' '}
              <a href="/dashboard/demo" target="_blank">Dashboard Organizator →</a>
            </span>
          </div>
        )}

        <div className={styles.landingActions}>
          <button className={styles.actionCardPrimary} onClick={() => setView('mediaChoice')}>
            <div className={styles.actionCardIcon}><Camera size={26} weight="light" /></div>
            <div className={styles.actionCardBody}>
              <strong>Trimite poze & videoclipuri</strong>
              <span>Din galerie sau direct cu camera</span>
            </div>
            <span className={styles.actionCardArrow}>→</span>
          </button>

          <button className={styles.actionCardSecondary} onClick={() => setView('wish')}>
            <div className={styles.actionCardIcon}><Envelope size={26} weight="light" /></div>
            <div className={styles.actionCardBody}>
              <strong>Scrie o urare</strong>
              <span>Un mesaj din inimă pentru miri</span>
            </div>
            <span className={styles.actionCardArrow}>→</span>
          </button>
        </div>

        <p className={styles.landingFooter}>
          {event?.is_gallery_public ? (
            <Sparkle size={12} weight="light" /> 
          ) : (
            <Lock size={12} weight="light" /> 
          )}
          {event?.is_gallery_public ? 'Album public activ' : 'Pozele tale sunt private și accesibile doar mirilor'}
        </p>

        {event?.is_gallery_public && publicPhotos.length > 0 && (
          <div style={{ marginTop: 'var(--space-2xl)', padding: '0 var(--space-md)' }}>
            <h3 style={{ fontSize: '18px', textAlign: 'center', marginBottom: 'var(--space-lg)', fontFamily: 'var(--font-serif)' }}>Galeria Evenimentului</h3>
            <div style={{ columnCount: 2, columnGap: '12px' }}>
              {publicPhotos.map((photo) => (
                <div key={photo.id} style={{ breakInside: 'avoid', marginBottom: '12px' }}>
                  <img
                    src={photo.public_url || `${process.env.NEXT_PUBLIC_R2_URL}/${photo.r2_key}`}
                    alt={photo.original_name}
                    style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'block' }}
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );

  // ── MEDIA CHOICE ──────────────────────────────────────────────────────────
  if (view === 'mediaChoice') return (
    <PageShell isDemo={isDemo} onBack={() => setView('landing')}>
      <div className={styles.stepHeader}>
        <StepDots current={0} total={3} />
        <h2 className={styles.stepTitle}>Alege sursa</h2>
        <p className={styles.stepSubtitle}>De unde vrei să încarci amintirile?</p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className={styles.dropZoneIcon}>
          {dragOver
            ? <Sparkle size={40} weight="light" style={{ color: '#710927' }} />
            : <CloudArrowUp size={40} weight="light" style={{ color: '#710927', opacity: 0.7 }} />
          }
        </div>
        <p className={styles.dropZoneText}>
          {dragOver ? 'Eliberează pentru a adăuga' : 'Trage pozele sau clipurile aici'}
        </p>
        <p className={styles.dropZoneHint}>sau apasă pentru a selecta</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      <div className={styles.orDivider}><span>sau alege</span></div>

      <div className={styles.sourceGrid}>
        <label className={styles.sourceCard}>
          <div className={styles.sourceCardInner}>
            <span className={styles.sourceIcon}><Image size={26} weight="light" /></span>
            <strong>Din galerie</strong>
            <span>Selectează mai multe</span>
          </div>
          <input type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
        </label>

        <label className={styles.sourceCard}>
          <div className={styles.sourceCardInner}>
            <span className={styles.sourceIcon}><Camera size={26} weight="light" /></span>
            <strong>Fa o poză</strong>
            <span>Deschide camera</span>
          </div>
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: 'none' }} />
        </label>

        <label className={styles.sourceCard}>
          <div className={styles.sourceCardInner}>
            <span className={styles.sourceIcon}><VideoCamera size={26} weight="light" /></span>
            <strong>Înregistrează</strong>
            <span>Clipuri scurte</span>
          </div>
          <input type="file" accept="video/*" capture="environment" onChange={handleFileSelect} style={{ display: 'none' }} />
        </label>
      </div>

      <p className={styles.fileNote}>Poze până la 20MB · Clipuri până la 200MB</p>
    </PageShell>
  );

  // ── PREVIEW ───────────────────────────────────────────────────────────────
  if (view === 'preview') return (
    <PageShell isDemo={isDemo} onBack={() => setView('mediaChoice')}>
      <div className={styles.stepHeader}>
        <StepDots current={1} total={3} />
        <h2 className={styles.stepTitle}>Verifică selecția</h2>
        <p className={styles.stepSubtitle}>{files.length} {files.length === 1 ? 'fișier selectat' : 'fișiere selectate'}</p>
      </div>

      <div className={styles.previewGrid}>
        {files.map((file, idx) => (
          <div key={idx} className={styles.previewItem}>
            <FileThumbnail file={file} />
            <button className={styles.removeBtn} onClick={() => removeFile(idx)} title="Elimină"><X size={14} /></button>
          </div>
        ))}

        {/* Add more */}
        <label className={styles.addMoreCard}>
          <span className={styles.addMoreIcon}><Plus size={22} weight="light" style={{ color: '#710927' }} /></span>
          <span className={styles.addMoreText}>Adaugă</span>
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => {
              const extra = Array.from(e.target.files || []);
              setFiles(prev => [...prev, ...extra]);
            }}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <button className={styles.uploadBtn} onClick={() => uploadFiles(files)}>
        <CloudArrowUp size={18} weight="light" />
        Încarcă {files.length} {files.length === 1 ? 'fișier' : 'fișiere'}
      </button>

      <p className={styles.privacyNote}><Lock size={12} weight="light" /> Fișierele sunt criptate și accesibile doar organizatorilor</p>
    </PageShell>
  );

  // ── UPLOADING ─────────────────────────────────────────────────────────────
  if (view === 'uploading') return (
    <PageShell isDemo={isDemo}>
      <div className={styles.uploadingWrap}>
        <div className={styles.uploadingOrb}>
          <div className={styles.uploadingOrbInner}>
            <span className={styles.uploadingPercent}>{uploadProgress}%</span>
          </div>
          <svg className={styles.uploadingRing} viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(113,9,39,0.1)" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke="url(#uploadGrad)" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 54}`}
              strokeDashoffset={`${2 * Math.PI * 54 * (1 - uploadProgress / 100)}`}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.4s ease' }}
            />
            <defs>
              <linearGradient id="uploadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#710927" />
                <stop offset="100%" stopColor="#c45c7e" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h2 className={styles.uploadingTitle}>Se încarcă amintirile…</h2>
        <p className={styles.uploadingCount}>
          Fișier {uploadCurrent} din {uploadTotal}
        </p>

        <div className={styles.uploadingSteps}>
          {['Comprimare imagine', 'Criptare securizată', 'Transfer în cloud'].map((s, i) => (
            <div key={i} className={`${styles.uploadingStep} ${uploadProgress > i * 33 ? styles.uploadingStepDone : ''}`}>
              <span className={styles.uploadingStepDot} />
              <span>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );

  // ── UPLOAD SUCCESS ────────────────────────────────────────────────────────
  if (view === 'uploadSuccess') return (
    <PageShell isDemo={isDemo}>
      <FloatingPetals />
      <div className={styles.successWrap}>
        <div className={styles.successOrb}>
          <Check size={40} weight="light" style={{ color: '#fff' }} />
        </div>
        <h2 className={styles.successTitle}>Mulțumim din suflet!</h2>
        <p className={styles.successMsg}>
          {uploadTotal} {uploadTotal === 1 ? 'fotografie a fost adăugată' : 'fotografii au fost adăugate'} la galeria evenimentului.<br />
          Mirilor le va fi drag să le vadă!
        </p>

        <div className={styles.successActions}>
          <button className={styles.successBtnPrimary} onClick={() => setView('wish')}>
            <Envelope size={16} weight="light" /> Lasă și o urare
          </button>
          <button className={styles.successBtnSecondary} onClick={() => { setView('landing'); setFiles([]); setUploadProgress(0); }}>
            Adaugă mai multe poze
          </button>
        </div>

        {isDemo && (
          <a href="/dashboard/demo" target="_blank" className={styles.successDemoLink}>
            <Sparkle size={13} weight="light" /> Vezi în Dashboard Organizator
          </a>
        )}
      </div>
    </PageShell>
  );

  // ── WISH ──────────────────────────────────────────────────────────────────
  if (view === 'wish') return (
    <PageShell isDemo={isDemo} onBack={() => setView('landing')}>
      <div className={styles.stepHeader}>
        <div className={styles.wishEmojiBig}><Envelope size={44} weight="light" style={{ color: '#710927' }} /></div>
        <h2 className={styles.stepTitle}>Scrie o urare</h2>
        <p className={styles.stepSubtitle}>Un mesaj care va rămâne pentru totdeauna</p>
      </div>

      <form onSubmit={handleWishSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.field}>
            <label className={styles.label}>Prenume <span className={styles.req}>*</span></label>
            <input
              className={styles.input}
              required
              placeholder="Maria"
              value={wishForm.firstName}
              onChange={(e) => setWishForm(p => ({ ...p, firstName: e.target.value }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Nume <span className={styles.req}>*</span></label>
            <input
              className={styles.input}
              required
              placeholder="Popescu"
              value={wishForm.lastName}
              onChange={(e) => setWishForm(p => ({ ...p, lastName: e.target.value }))}
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Email <span className={styles.optional}>(opțional)</span></label>
          <input
            className={styles.input}
            type="email"
            placeholder="maria@gmail.com"
            value={wishForm.email}
            onChange={(e) => setWishForm(p => ({ ...p, email: e.target.value }))}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Mesajul tău <span className={styles.req}>*</span></label>
          <textarea
            className={styles.textarea}
            required
            rows={5}
            placeholder="Dragi Andreea și Mihai, vă dorim toată fericirea din lume…"
            value={wishForm.message}
            onChange={(e) => setWishForm(p => ({ ...p, message: e.target.value }))}
          />
          <span className={styles.charHint}>{wishForm.message.length} caractere</span>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? (
            <span className={styles.loadingDots}><span /><span /><span /></span>
          ) : (
            <><Envelope size={16} weight="light" /> Trimite urarea</>
          )}
        </button>
      </form>
    </PageShell>
  );

  // ── WISH SUCCESS ──────────────────────────────────────────────────────────
  if (view === 'wishSuccess') return (
    <PageShell isDemo={isDemo}>
      <FloatingPetals />
      <div className={styles.successWrap}>
        <div className={`${styles.successOrb} ${styles.successOrbWish}`}>
          <Envelope size={36} weight="light" style={{ color: '#fff' }} />
        </div>
        <h2 className={styles.successTitle}>Urarea ta a ajuns!</h2>
        <p className={styles.successMsg}>
          Mirilor le va face extrem de mare plăcere să citească mesajul tău.<br />
          Mulțumim că ești parte din ziua lor specială!
        </p>

        <div className={styles.successActions}>
          <button className={styles.successBtnPrimary} onClick={() => setView('mediaChoice')}>
            <Camera size={16} weight="light" /> Trimite și poze
          </button>
          <button className={styles.successBtnSecondary} onClick={() => { setView('landing'); setWishForm({ firstName: '', lastName: '', email: '', message: '' }); }}>
            Înapoi la început
          </button>
        </div>
      </div>
    </PageShell>
  );

  return null;
}

// ─── Shared page shell ─────────────────────────────────────────────────────────
function PageShell({ children, isDemo, onBack }) {
  return (
    <>
      {isDemo && <DemoNavBar />}
      <div className={styles.page} style={isDemo ? { paddingTop: '80px' } : {}}>
        <div className={styles.bg}>
          <div className={styles.bgBlob1} />
          <div className={styles.bgBlob2} />
        </div>
        <div className={styles.card}>
          {onBack && (
            <button className={styles.backBtn} onClick={onBack}>
              <ArrowLeft size={16} weight="light" /> Înapoi
            </button>
          )}
          {children}
        </div>
      </div>
    </>
  );
}
