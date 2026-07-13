'use client';

import { useState, use, useEffect, useRef, useCallback } from 'react';
import {
  Camera, Image, VideoCamera, Lock, ArrowLeft, UploadSimple,
  Check, Heart, ChatCircle, Envelope, MapPin, Calendar,
  Plus, X, Play, CloudArrowUp, Sparkle
} from '@phosphor-icons/react';
import DemoNavBar from '@/components/marketing/DemoNavBar';
import styles from './upload.module.css';
import { classifyUploadError, errorFromResponse, UPLOAD_ERR, LEGACY_STORAGE_FULL } from '@/lib/uploadErrors';

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

// ─── Upload multipart (fișiere mari) ─────────────────────────────────────────
const MULTIPART_THRESHOLD = 32 * 1024 * 1024; // peste 32MB → multipart
const MULTIPART_CONCURRENCY = 3;              // bucăți în paralel
const SIGN_BATCH = 8;                         // câte URL-uri cerem odată

// PUT o bucată. FĂRĂ Content-Type (URL-ul presemnat UploadPart nu-l semnează).
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

// Plafonul plin are tratament separat (ecran dedicat), nu e „eroare".
const estePlin = (err) => err.code === UPLOAD_ERR.STORAGE_FULL || err.message === LEGACY_STORAGE_FULL;

// Upload multipart complet. Întoarce 'ok' | 'storageFull'; aruncă la alte erori.
// IMPORTANT: erorile aruncate poartă `status` + `code`, ca să poată fi clasificate
// corect de apelant (înainte se pierdea motivul și userul vedea „verifică conexiunea").
async function uploadMultipart(eventCode, file, fileType, onProgress) {
  const createRes = await fetch('/api/upload/multipart/create', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventCode, contentType: file.type, fileType, sizeBytes: file.size }),
  });
  if (!createRes.ok) {
    const err = await errorFromResponse(createRes);
    if (estePlin(err)) return 'storageFull';
    throw err;
  }
  const { sessionId, partSize, totalParts } = await createRes.json();

  const urlCache = {};
  const signParts = async (nums) => {
    const need = nums.filter((n) => !urlCache[n]);
    if (!need.length) return;
    const res = await fetch('/api/upload/multipart/sign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, partNumbers: need }),
    });
    if (!res.ok) throw await errorFromResponse(res);
    Object.assign(urlCache, (await res.json()).urls);
  };
  const signOne = async (n) => {
    const res = await fetch('/api/upload/multipart/sign', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, partNumbers: [n] }),
    });
    if (!res.ok) throw await errorFromResponse(res);
    const url = (await res.json()).urls[n];
    urlCache[n] = url;
    return url;
  };

  try {
    const frac = new Array(totalParts).fill(0);
    const report = () => onProgress(frac.reduce((a, b) => a + b, 0) / totalParts);
    let next = 1; // numerele bucăților: 1..totalParts

    const worker = async () => {
      while (next <= totalParts) {
        const partNumber = next++;
        const idx = partNumber - 1;
        const start = idx * partSize;
        const blob = file.slice(start, Math.min(start + partSize, file.size));
        // pre-semnăm un lot începând de la bucata curentă (economisim invocări)
        if (!urlCache[partNumber]) {
          const window = [];
          for (let p = partNumber; p < Math.min(partNumber + SIGN_BATCH, totalParts + 1); p++) window.push(p);
          await signParts(window);
        }
        let url = urlCache[partNumber];
        let done = false;
        for (let attempt = 0; attempt <= 3 && !done; attempt++) {
          try {
            if (attempt > 0) url = await signOne(partNumber); // URL proaspăt la retry → nu expiră
            await putPart(url, blob, (f) => { frac[idx] = f; report(); });
            done = true;
          } catch (err) {
            if (attempt === 3) throw err;
            frac[idx] = 0; report();
            await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
          }
        }
        frac[idx] = 1; report();
      }
    };

    await Promise.all(Array.from({ length: Math.min(MULTIPART_CONCURRENCY, totalParts) }, worker));

    const completeRes = await fetch('/api/upload/multipart/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, originalName: file.name }),
    });
    if (!completeRes.ok) {
      const err = await errorFromResponse(completeRes);
      if (estePlin(err)) return 'storageFull';
      throw err;
    }
    return 'ok';
  } catch (err) {
    // Anulăm sesiunea → eliberăm bucățile din R2 + rezervarea de spațiu (best-effort)
    fetch('/api/upload/multipart/abort', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    }).catch(() => {});
    throw err;
  }
}

// ─── Limite de mărime — valori IMPLICITE (suprascrise de setările globale) ─────
const DEFAULT_LIMITS = {
  maxPhotoBytes: 20 * 1024 * 1024,      // 20 MB / poză
  maxVideoBytes: 1536 * 1024 * 1024,    // 1.5 GB / clip
  maxPhotos: 20,                        // max poze / o încărcare
  maxVideos: 2,                         // max clipuri / o încărcare
};

const mb = (bytes) => Math.round(bytes / (1024 * 1024));
// Etichetă prietenoasă: 1536MB → „1.5GB", 800MB → „800MB"
const sizeLabel = (bytes) => {
  const m = mb(bytes);
  return m >= 1024 ? `${+(m / 1024).toFixed(m % 1024 ? 1 : 0)}GB` : `${m}MB`;
};

const isVid = (f) => f.type.startsWith('video/');
const isImg = (f) => f.type.startsWith('image/');

// Aplică limitele de MĂRIME și de NUMĂR (configurabile din admin).
// FOLOSIT DE TOATE căile de selecție (galerie, „Adaugă", drag & drop).
// `existing` = fișierele deja selectate (pentru „Adaugă"); [] la selecție nouă.
function applyLimits(existing, incoming, lim = DEFAULT_LIMITS) {
  let photos = existing.filter(isImg).length;
  let videos = existing.filter(isVid).length;
  const accepted = [];
  const tooBig = [];
  let overPhotos = false;
  let overVideos = false;
  for (const f of incoming) {
    const video = isVid(f), image = isImg(f);
    if (!video && !image) continue; // ignorăm ce nu e media
    if (f.size > (video ? lim.maxVideoBytes : lim.maxPhotoBytes)) { tooBig.push(f); continue; }
    if (video) {
      if (videos >= lim.maxVideos) { overVideos = true; continue; }
      videos++;
    } else {
      if (photos >= lim.maxPhotos) { overPhotos = true; continue; }
      photos++;
    }
    accepted.push(f);
  }
  return { accepted, tooBig, overPhotos, overVideos };
}

// Mesaj clar de ce nu s-au adăugat toate fișierele.
function limitMessage({ tooBig, overPhotos, overVideos }, lim = DEFAULT_LIMITS) {
  const parts = [];
  if (overPhotos || overVideos) {
    parts.push(`Poți încărca maxim ${lim.maxPhotos} de poze și ${lim.maxVideos} clipuri odată. Restul nu au fost adăugate — le poți trimite într-o a doua încărcare.`);
  }
  if (tooBig.length) {
    parts.push(`Prea mare, nu se poate încărca: ${tooBig.map((f) => f.name).join(', ')}. Limite: poze max ${sizeLabel(lim.maxPhotoBytes)}, clipuri max ${sizeLabel(lim.maxVideoBytes)}.`);
  }
  return parts.join(' ');
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
  const [publicPhotos, setPublicPhotos] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const isDemo = eventCode?.toUpperCase() === 'DEMO';

  // Evenimentul nu mai primește conținut (cont suspendat, eveniment oprit sau expirat).
  // Serverul refuză oricum și upload-urile, și urările — deci îi spunem invitatului CLAR
  // din start, în loc să-l lăsăm să aleagă poze și să aștepte un upload care va eșua.
  const eventInactiv = !isDemo && !!event && event.status !== 'active';

  // Limite efective: din setările globale (payload eveniment) sau valorile implicite.
  const lim = event?.limits ? {
    maxPhotoBytes: (event.limits.maxPhotoMb ?? 20) * 1024 * 1024,
    maxVideoBytes: (event.limits.maxVideoMb ?? 1536) * 1024 * 1024,
    maxPhotos: event.limits.maxPhotos ?? 20,
    maxVideos: event.limits.maxVideos ?? 2,
  } : DEFAULT_LIMITS;

  const loadEvent = useCallback((fresh = false) => {
    // Nu interogăm serverul când tab-ul e ascuns — economisim invocări (Vercel free).
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    // `fresh`: /api/events e cache-uit la CDN (s-maxage=30), deci imediat după o
    // suspendare ne-ar putea întoarce statusul VECHI. Un parametru unic + no-store
    // ocolesc cache-ul și ne dau starea reală.
    const url = fresh
      ? `/api/events?code=${eventCode}&fresh=${Date.now()}`
      : `/api/events?code=${eventCode}`;
    fetch(url, fresh ? { cache: 'no-store' } : undefined)
      .then(r => r.json())
      .then(data => {
        if (data.event) setEvent(data.event);
        if (data.photos) setPublicPhotos(data.photos);
      })
      .catch(() => {});
  }, [eventCode]);

  // Evenimentul tocmai a fost refuzat de server ca inactiv.
  // Actualizăm starea LOCALĂ imediat (nu ne bazăm pe /api/events, care poate fi
  // încă în cache) și revalidăm în fundal, fără cache.
  const marcheazaEvenimentInactiv = useCallback(() => {
    setEvent((current) => (current ? { ...current, status: 'inactive' } : current));
    loadEvent(true);
  }, [loadEvent]);

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
    const { accepted, ...rej } = applyLimits([], Array.from(e.target.files || []), lim);
    setRejectMsg(limitMessage(rej, lim));
    if (accepted.length > 0) {
      setFiles(accepted);
      setView('preview');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const { accepted, ...rej } = applyLimits([], Array.from(e.dataTransfer.files || []), lim);
    setRejectMsg(limitMessage(rej, lim));
    if (accepted.length > 0) {
      setFiles(accepted);
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

    let succeeded = 0;
    let storageFull = false;

    // Prima eroare CLASIFICATĂ — după codul stabil trimis de server, NU după textul
    // mesajului (fragil: se schimbă cu limba/formularea). Vezi lib/uploadErrors.js.
    let primaEroare = null;
    const retineEroarea = (err) => {
      if (primaEroare) return;
      primaEroare = classifyUploadError({
        status: err?.status,
        code: err?.code,
        message: err?.message,
        // fără status ⇒ fetch-ul însuși a aruncat ⇒ chiar e problemă de rețea
        networkFailure: !err?.status,
      });
    };
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setUploadCurrent(i + 1);
      setUploadProgress(Math.round((i / filesToUpload.length) * 100));
      const fileType = file.type.startsWith('video/') ? 'video' : 'photo';
      const onFrac = (frac) => setUploadProgress(Math.round(((i + frac) / filesToUpload.length) * 100));

      // Fișiere mari → upload MULTIPART (bucăți paralele, retry, fără expirare).
      // NU cad pe single-PUT dacă eșuează — n-are rost să reîncărcăm 1.5GB dintr-o
      // bucată (fragil). La eșec: rămâne necontat, iar userul reîncearcă.
      if (file.size > MULTIPART_THRESHOLD) {
        try {
          const res = await uploadMultipart(eventCode, file, fileType, onFrac);
          if (res === 'storageFull') { storageFull = true; break; }
          succeeded++;
        } catch (err) {
          // ÎNAINTE: eroarea era doar logată → motivul real (ex. eveniment suspendat)
          // se pierdea, iar userul primea „verifică conexiunea". Acum o reținem.
          console.error('Multipart failed:', err);
          retineEroarea(err);
        }
        setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
        continue;
      }

      try {
        // 1. Cerem un URL presemnat — funcția Vercel doar SEMNEAZĂ, fișierul NU trece prin ea
        const signRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventCode, contentType: file.type, fileType, sizeBytes: file.size }),
        });
        if (!signRes.ok) {
          const err = await errorFromResponse(signRes);
          if (estePlin(err)) { storageFull = true; break; }
          throw err;
        }
        const { uploadUrl, r2Key } = await signRes.json();

        // 2. Încărcăm fișierul DIRECT în R2 (browser → R2), fără limita de 4.5MB a Vercel.
        //    Progres real per fișier → bară care se mișcă (nu pare blocat la clipuri mari).
        await putWithProgress(uploadUrl, file, (frac) => {
          setUploadProgress(Math.round(((i + frac) / filesToUpload.length) * 100));
        });

        // 3. Confirmăm — inserăm rândul cu metadate în baza de date.
        //    Dacă evenimentul e suspendat FIX în timpul transferului, aici primim
        //    EVENT_INACTIVE — motiv care înainte se pierdea („Confirm failed").
        const confirmRes = await fetch('/api/upload/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ r2Key, eventCode, fileType, sizeBytes: file.size, originalName: file.name }),
        });
        if (!confirmRes.ok) {
          const err = await errorFromResponse(confirmRes);
          if (estePlin(err)) { storageFull = true; break; }
          throw err;
        }
        succeeded++;
      } catch (err) {
        console.error('Upload presigned error:', err);
        retineEroarea(err);

        // Fallback pe funcție doar dacă are rost. Dacă evenimentul e inactiv sau
        // uploadurile sunt în pauză, reîncercarea ar eșua identic — nu insistăm.
        const inutil = primaEroare
          && (primaEroare.kind === UPLOAD_ERR.EVENT_INACTIVE || primaEroare.kind === UPLOAD_ERR.UPLOADS_PAUSED);
        if (!inutil && file.size <= 4 * 1024 * 1024) {
          try {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('eventCode', eventCode);
            fd.append('fileType', fileType);
            fd.append('originalName', file.name);
            const directRes = await fetch('/api/upload/direct', { method: 'POST', body: fd });
            if (directRes.ok) { succeeded++; }
            else {
              const err2 = await errorFromResponse(directRes);
              if (estePlin(err2)) { storageFull = true; break; }
              retineEroarea(err2);
            }
          } catch (e2) { console.error('Upload fallback error:', e2); retineEroarea(e2); }
        }
      }
      setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
    }

    if (storageFull) {
      setView('limitReached');
      return;
    }

    // Feedback onest: nu declarăm succes dacă au eșuat fișiere, și spunem MOTIVUL REAL
    // (decis după codul de la server, nu după regex pe text).
    if (succeeded === 0) {
      const eroare = primaEroare || classifyUploadError({ networkFailure: true });

      if (eroare.kind === UPLOAD_ERR.EVENT_INACTIVE) {
        // Actualizăm statusul LOCAL imediat — nu ne bazăm pe /api/events (cache CDN),
        // care ar putea încă întoarce „active" și ar reafișa butonul de upload.
        marcheazaEvenimentInactiv();
        alert(eroare.message);
        setView('landing');
      } else {
        alert(`Nu am putut încărca fișierele. ${eroare.message}`);
        setView('mediaChoice');
      }
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
      const res = await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...wishForm, eventCode }),
      });
      // Eroarea poartă status + code → clasificabilă la fel ca la upload
      if (!res.ok) throw await errorFromResponse(res);
      setView('wishSuccess');
    } catch (err) {
      const eroare = classifyUploadError({
        status: err?.status,
        code: err?.code,
        message: err?.message,
        networkFailure: !err?.status,
      });
      if (eroare.kind === UPLOAD_ERR.EVENT_INACTIVE) {
        marcheazaEvenimentInactiv(); // status local imediat, apoi revalidare fără cache
        alert('Acest eveniment nu mai primește urări.');
        setView('landing');
      } else {
        alert(`Eroare la trimitere. ${eroare.message}`);
      }
    }
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
          {/* Evenimentul e închis → nici upload, nici urare. Spunem de ce, din start. */}
          {eventInactiv ? (
            <div className={styles.actionCardPrimary} style={{ cursor: 'default', opacity: 0.9 }}>
              <div className={styles.actionCardIcon}><Lock size={26} weight="light" /></div>
              <div className={styles.actionCardBody}>
                <strong>Acest eveniment nu mai primește conținut</strong>
                <span>Încărcarea pozelor și trimiterea urărilor au fost oprite. Contactează organizatorul pentru detalii.</span>
              </div>
            </div>
          ) : (
            <>
              {event?.uploadsPaused && !isDemo ? (
                <div className={styles.actionCardPrimary} style={{ cursor: 'default', opacity: 0.9 }}>
                  <div className={styles.actionCardIcon}><Camera size={26} weight="light" /></div>
                  <div className={styles.actionCardBody}>
                    <strong>Încărcările sunt momentan în pauză</strong>
                    <span>Revenim în scurt timp — încearcă puțin mai târziu. 💛</span>
                  </div>
                </div>
              ) : (
                <button className={styles.actionCardPrimary} onClick={() => setView('mediaChoice')}>
                  <div className={styles.actionCardIcon}><Camera size={26} weight="light" /></div>
                  <div className={styles.actionCardBody}>
                    <strong>Trimite poze & videoclipuri</strong>
                    <span>Din galerie sau direct cu camera</span>
                  </div>
                  <span className={styles.actionCardArrow}>→</span>
                </button>
              )}

              <button className={styles.actionCardSecondary} onClick={() => setView('wish')}>
                <div className={styles.actionCardIcon}><Envelope size={26} weight="light" /></div>
                <div className={styles.actionCardBody}>
                  <strong>Scrie o urare</strong>
                  <span>Un mesaj din inimă pentru miri</span>
                </div>
                <span className={styles.actionCardArrow}>→</span>
              </button>
            </>
          )}
        </div>

        <p className={styles.landingFooter}>
          {event?.is_gallery_public ? (
            <Sparkle size={12} weight="light" /> 
          ) : (
            <Lock size={12} weight="light" /> 
          )}
          {event?.is_gallery_public ? 'Album public activ' : 'Galeria invitaților este dezactivată'}
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
          <strong>Maxim {lim.maxPhotos} de poze și {lim.maxVideos} clipuri video per încărcare.</strong> Ai mai multe? Le poți
          trimite într-o a doua încărcare. La clipuri, după ce apeși confirmare, așteaptă câteva
          secunde până se urcă — nu apăsa de mai multe ori, încărcarea continuă automat.
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

      <p className={styles.fileNote}>Maxim {lim.maxPhotos} de poze și {lim.maxVideos} clipuri odată · poze până la {sizeLabel(lim.maxPhotoBytes)} · clipuri până la {sizeLabel(lim.maxVideoBytes)}</p>
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '8px', lineHeight: 1.5, padding: '0 12px' }}>
        Încarcă doar conținut pe care ai dreptul să îl distribui și informează persoanele din imagini. Detalii despre prelucrare în{' '}
        <a href="/confidentialitate" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Politicii de Confidențialitate</a>.
      </p>
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
              const { accepted, ...rej } = applyLimits(files, Array.from(e.target.files || []), lim);
              setRejectMsg(limitMessage(rej, lim));
              if (accepted.length > 0) setFiles(prev => [...prev, ...accepted]);
            }}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <button className={styles.uploadBtn} onClick={() => uploadFiles(files)}>
        <CloudArrowUp size={18} weight="light" />
        Încarcă {files.length} {files.length === 1 ? 'fișier' : 'fișiere'}
      </button>

      <p className={styles.privacyNote}><Lock size={12} weight="light" /> Fișierele sunt trimise printr-o conexiune securizată și gestionate de organizatorul evenimentului</p>
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

        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.5, margin: '0 0 8px', padding: '0 12px' }}>
          Datele din urare sunt transmise organizatorului evenimentului. Detalii în{' '}
          <a href="/confidentialitate" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>Politicii de Confidențialitate</a>.
        </p>

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
