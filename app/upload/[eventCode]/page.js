'use client';

import { useState, use, useEffect } from 'react';
import styles from './upload.module.css';

export default function GuestUploadPage({ params }) {
  const { eventCode } = use(params);
  const [view, setView] = useState('choice'); // choice, media, uploading, uploadSuccess, wish, wishSuccess
  const [event, setEvent] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadCurrent, setUploadCurrent] = useState(0);
  const [wishForm, setWishForm] = useState({ firstName: '', lastName: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch event info
    fetch(`/api/events?code=${eventCode}`)
      .then(r => r.json())
      .then(data => {
        if (data.event) setEvent(data.event);
      })
      .catch(() => {});
  }, [eventCode]);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files);
    // Validate files
    const valid = selected.filter(f => {
      if (f.type.startsWith('image/') && f.size > 20 * 1024 * 1024) return false;
      if (f.type.startsWith('video/') && f.size > 200 * 1024 * 1024) return false;
      return true;
    });
    setFiles(valid);
    if (valid.length > 0) uploadFiles(valid);
  };

  const uploadFiles = async (filesToUpload) => {
    setView('uploading');
    setUploadTotal(filesToUpload.length);
    setUploadCurrent(0);

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      setUploadCurrent(i + 1);
      setUploadProgress(Math.round(((i) / filesToUpload.length) * 100));

      try {
        const fileType = file.type.startsWith('video/') ? 'video' : 'photo';

        // 1. Get presigned URL
        const presignRes = await fetch('/api/upload/presigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventCode, contentType: file.type, fileType }),
        });
        const { uploadUrl, r2Key } = await presignRes.json();

        // 2. Upload directly to R2
        await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        // 3. Confirm upload
        await fetch('/api/upload/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            r2Key,
            eventCode,
            fileType,
            sizeBytes: file.size,
            originalName: file.name,
          }),
        });
      } catch (err) {
        console.error('Upload error:', err);
      }

      setUploadProgress(Math.round(((i + 1) / filesToUpload.length) * 100));
    }

    setView('uploadSuccess');
  };

  const handleWishSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...wishForm, eventCode }),
      });
      setView('wishSuccess');
    } catch {
      alert('Eroare la trimitere. Încearcă din nou.');
    }
    setLoading(false);
  };

  const eventName = event?.event_name || 'Eveniment';
  const eventDate = event?.event_date
    ? new Date(event.event_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  // ─── ECRAN 1: CHOICE ───
  if (view === 'choice') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.logo}>QRPhotoDrop</div>
          <h1 className={styles.title}>
            Bun venit la {eventName}! 🎉
          </h1>
          {eventDate && <p className={styles.date}>{eventDate}</p>}
          <div className={styles.buttons}>
            <button className={styles.bigBtn} onClick={() => setView('media')}>
              <span className={styles.bigBtnIcon}>📸</span>
              <span className={styles.bigBtnText}>Încarcă o poză / video</span>
            </button>
            <button className={`${styles.bigBtn} ${styles.bigBtnOutline}`} onClick={() => setView('wish')}>
              <span className={styles.bigBtnIcon}>💌</span>
              <span className={styles.bigBtnText}>Trimite o urare</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── ECRAN 2: MEDIA SELECT ───
  if (view === 'media') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h2 className={styles.subtitle}>Încarcă Amintiri</h2>
          <div className={styles.buttons}>
            <label className={styles.bigBtn}>
              <span className={styles.bigBtnIcon}>🖼️</span>
              <span className={styles.bigBtnText}>Încarcă din galerie</span>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
            <label className={styles.bigBtn}>
              <span className={styles.bigBtnIcon}>📷</span>
              <span className={styles.bigBtnText}>Fă o fotografie</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <button className={styles.backBtn} onClick={() => setView('choice')}>
            ← Înapoi
          </button>
        </div>
      </div>
    );
  }

  // ─── ECRAN 3: UPLOADING ───
  if (view === 'uploading') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.progressIcon}>☁️</div>
          <h2 className={styles.subtitle}>Se încarcă...</h2>
          <p className={styles.progressText}>
            {uploadCurrent} din {uploadTotal} fișiere
          </p>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className={styles.progressPercent}>{uploadProgress}%</p>
        </div>
      </div>
    );
  }

  // ─── ECRAN 4: UPLOAD SUCCESS ───
  if (view === 'uploadSuccess') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successIcon}>✓</div>
          <h2 className={styles.subtitle}>Mulțumim!</h2>
          <p className={styles.successText}>
            Putem să ne vedem povestea din ochii tăi!
          </p>
          <button
            className={styles.closeBtn}
            onClick={() => { setView('choice'); setFiles([]); setUploadProgress(0); }}
          >
            Închide
          </button>
        </div>
      </div>
    );
  }

  // ─── ECRAN 5: WISH FORM ───
  if (view === 'wish') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <h2 className={styles.subtitle}>Scrie o urare 💌</h2>
          <form onSubmit={handleWishSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.field}>
                <label className={styles.label}>Prenume *</label>
                <input
                  className={styles.input}
                  required
                  value={wishForm.firstName}
                  onChange={(e) => setWishForm(p => ({ ...p, firstName: e.target.value }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Nume *</label>
                <input
                  className={styles.input}
                  required
                  value={wishForm.lastName}
                  onChange={(e) => setWishForm(p => ({ ...p, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email (opțional)</label>
              <input
                className={styles.input}
                type="email"
                placeholder="exemplu@gmail.com"
                value={wishForm.email}
                onChange={(e) => setWishForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Mesaj *</label>
              <textarea
                className={styles.textarea}
                required
                rows={4}
                value={wishForm.message}
                onChange={(e) => setWishForm(p => ({ ...p, message: e.target.value }))}
              />
            </div>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? 'Se trimite...' : 'Trimite urarea 💌'}
            </button>
          </form>
          <button className={styles.backBtn} onClick={() => setView('choice')}>
            ← Înapoi
          </button>
        </div>
      </div>
    );
  }

  // ─── ECRAN 6: WISH SUCCESS ───
  if (view === 'wishSuccess') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.successIcon}>💌</div>
          <h2 className={styles.subtitle}>Mulțumim pentru urare!</h2>
          <button
            className={styles.closeBtn}
            onClick={() => { setView('choice'); setWishForm({ firstName: '', lastName: '', email: '', message: '' }); }}
          >
            Închide
          </button>
        </div>
      </div>
    );
  }
}
