'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './dashboard.module.css';

export default function EvenimentulMeuPage() {
  const [event, setEvent] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [activeTab, setActiveTab] = useState('poze');
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get event
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (eventData) {
      setEvent(eventData);

      // Get uploads
      const { data: uploadsData } = await supabase
        .from('uploads')
        .select('*')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false });
      setUploads(uploadsData || []);

      // Get wishes
      const { data: wishesData } = await supabase
        .from('wishes')
        .select('*')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false });
      setWishes(wishesData || []);
    }
    setLoading(false);
  }

  const handleArchive = async () => {
    setArchiveLoading(true);
    try {
      await fetch('/api/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id }),
      });
      alert('Arhiva este în curs de generare. Vei fi notificat pe email.');
    } catch {
      alert('Eroare. Încearcă din nou.');
    }
    setArchiveLoading(false);
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p>Se încarcă...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className={styles.emptyState}>
        <p className={styles.emptyIcon}>📋</p>
        <h2 className={styles.emptyTitle}>Niciun eveniment încă</h2>
        <p className={styles.emptyDesc}>
          Contactează administratorul sau comandă un pachet pentru a primi evenimentul.
        </p>
        <a href="/preturi" className={styles.emptyBtn}>Vezi pachetele</a>
      </div>
    );
  }

  const uploadUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/upload/${event.event_code}`;
  const photos = uploads.filter(u => u.file_type === 'photo');
  const videos = uploads.filter(u => u.file_type === 'video');

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{event.event_name}</h1>
          <p className={styles.meta}>
            {event.event_type} · {new Date(event.event_date).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          className={styles.archiveBtn}
          onClick={handleArchive}
          disabled={archiveLoading}
        >
          {archiveLoading ? '⏳ Se generează...' : '📦 Generează arhiva'}
        </button>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <p className={styles.statValue}>{photos.length}</p>
          <p className={styles.statLabel}>Fotografii</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statValue}>{videos.length}</p>
          <p className={styles.statLabel}>Clipuri</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statValue}>{wishes.length}</p>
          <p className={styles.statLabel}>Urări</p>
        </div>
      </div>

      {/* QR Section */}
      <div className={styles.qrSection}>
        <div className={styles.qrCard}>
          <div style={{ textAlign: 'center' }}>
            <img 
              src={`/api/qrcode?text=${encodeURIComponent(uploadUrl)}&size=200`} 
              alt={`Cod QR pentru ${event.event_name}`}
              style={{ width: '200px', height: '200px', borderRadius: 'var(--radius-md)' }}
            />
          </div>
          <div className={styles.qrInfo}>
            <p className={styles.qrLabel}>Link invitați:</p>
            <div className={styles.qrLinkWrap}>
              <code className={styles.qrLink}>{uploadUrl}</code>
              <button
                className={styles.copyBtn}
                onClick={() => { navigator.clipboard.writeText(uploadUrl); }}
              >
                Copiază
              </button>
            </div>
            <p className={styles.qrCode}>
              Cod eveniment: <strong>{event.event_code}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'poze' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('poze')}
        >
          📸 Fotografii ({photos.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'clipuri' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('clipuri')}
        >
          🎬 Clipuri ({videos.length})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'urari' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('urari')}
        >
          💌 Urări ({wishes.length})
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'poze' && (
        <div className={styles.photoGrid}>
          {photos.length === 0 ? (
            <p className={styles.emptyTab}>Nicio fotografie încă. Distribuie linkul invitaților!</p>
          ) : (
            photos.map((photo) => (
              <div key={photo.id} className={styles.photoItem}>
                <img
                  src={photo.public_url || `${process.env.NEXT_PUBLIC_R2_URL}/${photo.r2_key}`}
                  alt={photo.original_name}
                  className={styles.photoImg}
                  loading="lazy"
                />
                <p className={styles.photoName}>{photo.original_name}</p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'clipuri' && (
        <div className={styles.photoGrid}>
          {videos.length === 0 ? (
            <p className={styles.emptyTab}>Niciun clip încă.</p>
          ) : (
            videos.map((video) => (
              <div key={video.id} className={styles.photoItem}>
                <video
                  src={video.public_url || `${process.env.NEXT_PUBLIC_R2_URL}/${video.r2_key}`}
                  className={styles.photoImg}
                  controls
                  preload="metadata"
                />
                <p className={styles.photoName}>{video.original_name}</p>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'urari' && (
        <div className={styles.wishesList}>
          {wishes.length === 0 ? (
            <p className={styles.emptyTab}>Nicio urare încă.</p>
          ) : (
            wishes.map((wish) => (
              <div key={wish.id} className={styles.wishCard}>
                <div className={styles.wishHeader}>
                  <span className={styles.wishAuthor}>{wish.first_name} {wish.last_name}</span>
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
  );
}
