'use client';

import { useState, use, useEffect, useRef, useCallback } from 'react';
import {
  Camera, Image, VideoCamera, Lock, ArrowLeft, UploadSimple,
  Check, Heart, ChatCircle, Envelope, MapPin, Calendar,
  Plus, X, Play, CloudArrowUp, Sparkle
} from '@phosphor-icons/react';
import DemoNavBar from '@/components/marketing/DemoNavBar';
import styles from './upload.module.css';

// Upload direct în R2 cu progres REAL. `fetch` nu raportează progresul upload-ului,
// XMLHttpRequest da → invitatul vede procentul crescând (important la clipuri mari).
function putWithProgress(url, file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('R2 PUT ' + xhr.status)));
    xhr.onerror = () => reject(new Error('R2 PUT network error'));
    xhr.send(file);
  });
}

// PUT pentru o bucată multipart. NU setăm Content-Type (URL-ul presemnat pentru
// UploadPart nu-l semnează → l-am rupe). Progresul e raportat ca fracție 0..1.
function putPart(url, blob, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('part PUT ' + xhr.status)));
    xhr.onerror = () => reject(new Error('part PUT network error'));
    xhr.send(blob);
  });
}

async function putPartWithRetry(url, blob, onProgress, retries = 3) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await putPart(url, blob, onProgress);
      return;
    } catch (err) {
      lastErr = err;
      if (onProgress) onProgress(0); // resetăm progresul bucății pentru reîncercare
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw lastErr;
}

// Upload multipart complet pentru un fișier mare. Întoarce 'ok' | 'storageFull';
// aruncă la orice altă eroare (ca să putem cădea pe single-PUT).
async function uploadMultipart(eventCode, file, fileType, onProgress) {
  const createRes = await fetch('/api/upload/multipart/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventCode, contentType: file.type, fileType, sizeBytes: file.size }),
  });
  if (!createRes.ok) {
    const e = await createRes.json().catch(() => ({}));
    if (e.error === 'Storage limit exceeded for this event') return 'storageFull';
    throw new Error(e.error || 'multipart create failed');
  }
  const { uploadId, r2Key, partUrls, partSize } = await createRes.json();

  try {
    const totalParts = partUrls.length;
    const frac = new Array(totalParts).fill(0);
    const report = () => onProgress(frac.reduce((a, b) => a + b, 0) / totalParts);

    let next = 0;
    const worker = async () => {
      while (next < totalParts) {
        const idx = next++;
        const start = idx * partSize;
        const blob = file.slice(start, Math.min(start + partSize, file.size));
        await putPartWithRetry(partUrls[idx], blob, (f) => { frac[idx] = f; report(); });
        frac[idx] = 1;
        report();
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(MULTIPART_CONCURRENCY, totalParts) }, worker)
    );

    const completeRes = await fetch('/api/upload/multipart/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r2Key, uploadId, eventCode, fileType, originalName: file.name }),
    });
    if (!completeRes.ok) {
      const e = await completeRes.json().catch(() => ({}));
      if (e.error === 'Storage limit exceeded for this event') return 'storageFull';
      throw new Error(e.error || 'multipart complete failed');
    }
    return 'ok';
  } catch (err) {
    // Curățăm uploadul neterminat (best-effort). R2 îl abandonează oricum în 7 zile.
    fetch('/api/upload/multipart/abort', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r2Key, uploadId }),
    }).catch(() => {});
    throw err;
  }
}

// ─── Limite de mărime — o SINGURĂ sursă de adevăr ────────────────────────────
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;        // 20 MB / poză
const MAX_VIDEO_BYTES = 1024 * 1024 * 1024;      // 1 GB / clip
const MAX_BATCH_BYTES = 2 * 1024 * 1024 * 1024;  // 2 GB total / o încărcare
const MULTIPART_THRESHOLD = 100 * 1024 * 1024;   // peste 100MB → upload multipart (bucăți paralele)
const MULTIPART_CONCURRENCY = 3;                 // câte bucăți urcăm simultan

const sumBytes = (files) => files.reduce((s, f) => s + f.size, 0);

// Împarte fișierele în acceptate / prea mari. FOLOSIT DE TOATE căile de selecție
// (galerie, „Adaugă", drag & drop) ca să nu mai dispară fișiere în tăcere.
function splitFiles(list) {
  const valid = [];
  const tooBig = [];
  for (const f of list) {
    const isVideo = f.type.startsWith('video/');
    const isImage = f.type.startsWith('image/');
    if (!isVideo && !isImage) continue; // ignorăm ce nu e media
    const max = isVideo ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
    if (f.size > max) tooBig.push(f);
    else valid.push(f);
  }
  return { valid, tooBig };
}

function tooBigMessage(files) {
  const names = files.map(f => f.name).join(', ');
  return `Prea mare, nu se poate încărca: ${names}. Limite: poze max 20MB, clipuri max 1GB.`;
}

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
  const [rejectMsg, setRejectMsg] = useState('');
  const [batchPopup, setBatchPopup] = useState(false);
  const [publicPhotos, setPublicPhotos] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isDemo = eventCode?.toUpperCase() === 'DEMO';

  const loadEvent = useCallback(() => {
    // Nu interogăm serverul când tab-ul e ascuns — economisim invocări (Vercel free).
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    fetch(`/api/events?code=${eventCode}`)
      .then(r => r.json())
      .then(data => {
        if (data.event) setEvent(data.event);
        if (data.photos) setPublicPhotos(data.photos);
      })
      .catch(() => {});
  }, [eventCode]);

  // Încărcare inițială (o singură dată)
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
    loadEvent();
  }, [isDemo, loadEvent]);

  // Polling pentru galeria publică — DOAR când galeria e publică (altfel nu se
  // afișează poze, deci nu are rost să interogăm). Pauză când tab-ul e ascuns.
  const galleryPublic = !isDemo && !!event?.is_gallery_public;
  useEffect(() => {
    if (!galleryPublic) return undefined;
    const id = setInterval(loadEvent, 60000); // 60s (era 30s)
    const onVisible = () => { if (document.visibilityState === 'visible') loadEvent(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [galleryPublic, loadEvent]);

  const handleFileSelect = (e) => {
    const { valid, tooBig } = splitFiles(Array.from(e.target.files || []));
    setRejectMsg(tooBig.length ? tooBigMessage(tooBig) : '');
    if (valid.length > 0) {
      setFiles(valid);
      setView('preview');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const { valid, tooBig } = splitFiles(Array.from(e.dataTransfer.files || []));
    setRejectMsg(tooBig.length ? tooBigMessage(tooBig) : '');
    if (valid.length > 0) {
      setFiles(valid);
      setView('preview');
    }
  };

  const removeFile = (idx) => {
    const updated = files.filter((_, i) => i !== idx);
    setFiles(updated);
    if (updated.length === 0) setView('mediaChoice');
  };

  const uploadFiles = async (filesToUpload) => {
    // Plafon total per încărcare — pop-up care cere invitatului să trimită mai puține odată
    if (sumBytes(filesToUpload) > MAX_BATCH_BYTES) {
      setBatchPopup(true);
      return;
    }
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
                // window.Image — evităm shadowing-ul de importul Phosphor `Image`.
                const img = new window.Image();
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

    const STORAGE_FULL = 'Storage limit exceeded for this event';
    let succeeded = 0;
    let storageFull = false;
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setUploadCurrent(i + 1);
      setUploadProgress(Math.round((i / filesToUpload.length) * 100));
      const fileType = file.type.startsWith('video/') ? 'video' : 'photo';
      const onFrac = (frac) => setUploadProgress(Math.round(((i + frac) / filesToUpload.length) * 100));

      // Fișiere mari → upload multipart (bucăți în paralel). Dacă eșuează din orice
      // motiv, cădem pe metoda clasică single-PUT de mai jos (plasă de siguranță).
      if (file.size > MULTIPART_THRESHOLD) {
        try {
          const res = await uploadMultipart(eventCode, file, fileType, onFrac);
          if (res === 'storageFull') { storageFull = true; break; }
          succeeded++;
          setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
          continue;
        } catch (err) {
          console.error('Multipart failed, fallback to single PUT:', err);
        }
      }

      try {
        // 1. Cerem un URL presemnat — funcția Vercel doar SEMNEAZĂ, fișierul NU trece prin ea
        const signRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventCode, contentType: file.type, fileType, sizeBytes: file.size }),
        });
        if (!signRes.ok) {
          const errData = await signRes.json().catch(() => ({}));
          if (errData.error === STORAGE_FULL) { storageFull = true; break; }
          throw new Error(errData.error || 'Sign failed');
        }
        const { uploadUrl, r2Key } = await signRes.json();

        // 2. Încărcăm fișierul DIRECT în R2 (browser → R2), fără limita de 4.5MB a Vercel.
        //    Progres real per fișier → bară care se mișcă (nu pare blocat la clipuri mari).
        await putWithProgress(uploadUrl, file, (frac) => {
          setUploadProgress(Math.round(((i + frac) / filesToUpload.length) * 100));
        });

        // 3. Confirmăm — inserăm rândul cu metadate în baza de date
        const confirmRes = await fetch('/api/upload/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ r2Key, eventCode, fileType, sizeBytes: file.size, originalName: file.name }),
        });
        if (!confirmRes.ok) throw new Error('Confirm failed');
        succeeded++;
      } catch (err) {
        console.error('Upload presigned error:', err);
        // Fallback: fișiere mici (≤4MB) pot merge prin funcție dacă presigned/CORS eșuează
        if (file.size <= 4 * 1024 * 1024) {
          try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('eventCode', eventCode);
            fd.append('fileType', fileType);
            fd.append('originalName', file.name);
            const directRes = await fetch('/api/upload/direct', { method: 'POST', body: fd });
            if (directRes.ok) { succeeded++; }
            else {
              const e = await directRes.json().catch(() => ({}));
              if (e.error === STORAGE_FULL) { storageFull = true; break; }
            }
          } catch (e2) { console.error('Upload fallback error:', e2); }
        }
      }
      setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
    }

    if (storageFull) {
      setView('limitReached');
      return;
    }

    // Feedback onest: nu declarăm succes dacă în realitate au eșuat fișiere.
    if (succeeded === 0) {
      alert('Nu am putut încărca fișierele. Verifică conexiunea și încearcă din nou.');
      setView('mediaChoice');
      return;
    }
    if (succeeded < filesToUpload.length) {
      alert(`${succeeded} din ${filesToUpload.length} fișiere au fost încărcate. Pentru restul, încearcă din nou.`);
    }
    setUploadTotal(succeeded);
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

        {event?.is_gallery_public && (
          <div style={{ marginTop: 'var(--space-2xl)', padding: '0 var(--space-md)' }}>
            <h3 style={{ fontSize: '18px', textAlign: 'center', marginBottom: 'var(--space-lg)', fontFamily: 'var(--font-serif)' }}>
              Galeria Evenimentului{publicPhotos.length > 0 ? ` (${publicPhotos.length})` : ''}
            </h3>
            {publicPhotos.length > 0 ? (
              <div style={{ columnCount: 2, columnGap: '12px' }}>
                {publicPhotos.map((photo) => (
                  <div key={photo.id} style={{ breakInside: 'avoid', marginBottom: '12px' }}>
                    <img
                      src={photo.public_url}
                      alt={photo.original_name}
                      style={{ width: '100%', borderRadius: 'var(--radius-md)', display: 'block' }}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px', padding: '24px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-md)' }}>
                Încă nu sunt poze în galerie. Fii primul care încarcă o amintire! 📸
              </p>
            )}
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

      {rejectMsg && <div className={styles.rejectNote}>{rejectMsg}</div>}

      <div className={styles.infoNote}>
        <CloudArrowUp size={18} weight="light" />
        <span>
          <strong>Un moment de răbdare la clipuri.</strong> După ce selectezi fișierele și apeși
          pe bifa de confirmare, așteaptă câteva secunde până se încarcă pe serverele noastre —
          videoclipurile sunt mai mari și pot dura puțin. Te rugăm să nu apeși de mai multe ori;
          încărcarea continuă automat.
        </span>
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

      <p className={styles.fileNote}>Poze până la 20MB · Clipuri până la 1GB</p>
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

      {rejectMsg && <div className={styles.rejectNote}>{rejectMsg}</div>}

      {batchPopup && (
        <div className={styles.modalOverlay} onClick={() => setBatchPopup(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIcon}><CloudArrowUp size={30} weight="light" /></div>
            <h3 className={styles.modalTitle}>Prea multe fișiere odată</h3>
            <p className={styles.modalText}>
              Ai selectat peste 2GB într-un singur upload. Te rugăm încarcă mai puține fișiere odată
              (sub 2GB) — se încarcă mai repede și mai sigur. Poți trimite restul imediat după, într-un al doilea upload.
            </p>
            <button className={styles.modalBtn} onClick={() => setBatchPopup(false)}>Am înțeles</button>
          </div>
        </div>
      )}

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
              const { valid, tooBig } = splitFiles(Array.from(e.target.files || []));
              setRejectMsg(tooBig.length ? tooBigMessage(tooBig) : '');
              if (valid.length > 0) setFiles(prev => [...prev, ...valid]);
            }}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <button className={styles.uploadBtn} onClick={() => uploadFiles(files)} disabled={batchOver}>
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

  // ── LIMITĂ ATINSĂ ─────────────────────────────────────────────────────────
  if (view === 'limitReached') return (
    <PageShell isDemo={isDemo}>
      <FloatingPetals />
      <div className={styles.successWrap}>
        <div className={styles.successOrb} style={{ background: 'linear-gradient(135deg, #710927, #a8384f)' }}>
          <Heart size={38} weight="fill" style={{ color: '#fff' }} />
        </div>
        <h2 className={styles.successTitle}>Mulțumim că ați făcut parte din povestea noastră!</h2>
        <p className={styles.successMsg}>
          Limita de poze a fost atinsă.<br />
          Galeria evenimentului este completă — mulțumim pentru fiecare amintire! 💛
        </p>
        <div className={styles.successActions}>
          <button className={styles.successBtnSecondary} onClick={() => setView('landing')}>
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
