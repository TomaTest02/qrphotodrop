'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './dashboard.module.css';
import pricingStyles from '@/components/marketing/PricingSection.module.css';
import cardStyles from '@/components/marketing/PricingCard.module.css';
import PricingCard from '@/components/marketing/PricingCard';

export default function EvenimentulMeuPage() {
  const [event, setEvent] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [wishes, setWishes] = useState([]);
  const [activeTab, setActiveTab] = useState('poze');
  const [loading, setLoading] = useState(true);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const togglePublicGallery = async () => {
    const supabase = createClient();
    const newVal = !event.is_gallery_public;
    const { error } = await supabase
      .from('events')
      .update({ is_gallery_public: newVal })
      .eq('id', event.id);
      
    if (!error) {
      setEvent({ ...event, is_gallery_public: newVal });
    } else {
      alert('Eroare la actualizarea setării.');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (items) => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Ștergi ${selectedIds.size} fișier(e)? Această acțiune nu poate fi anulată.`)) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/upload/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadIds: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setUploads(prev => prev.filter(u => !selectedIds.has(u.id)));
        setSelectedIds(new Set());
      } else {
        const err = await res.json();
        alert('Eroare: ' + err.error);
      }
    } catch { alert('Eroare la ștergere.'); }
    setDeleteLoading(false);
  };

  const downloadSelected = async (items) => {
    const toDownload = selectedIds.size > 0
      ? items.filter(i => selectedIds.has(i.id))
      : items;
    for (const item of toDownload) {
      const url = item.public_url || `${process.env.NEXT_PUBLIC_R2_URL}/${item.r2_key}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = item.original_name || item.id;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      await new Promise(r => setTimeout(r, 300));
    }
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
      <EventSetupForm onCreated={loadData} />
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
            
            <div style={{ marginTop: 'var(--space-md)', padding: 'var(--space-md)', background: 'var(--color-cream-darker)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input 
                type="checkbox" 
                id="galleryToggle" 
                checked={!!event.is_gallery_public} 
                onChange={togglePublicGallery}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-violet)' }}
              />
              <label htmlFor="galleryToggle" style={{ fontSize: '14px', cursor: 'pointer', fontWeight: 500, color: 'var(--color-text)' }}>
                Permite invitaților să vadă Galeria Foto publică
              </label>
            </div>
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
        <div>
          {photos.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
              <button
                onClick={() => selectAll(photos)}
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: 'var(--color-cream)', border: '1px solid var(--color-cream-darker)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >
                {selectedIds.size === photos.length ? '✗ Deselectează tot' : '✓ Selectează tot'}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{selectedIds.size} selectate</span>
                  <button
                    onClick={() => downloadSelected(photos)}
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: 'var(--color-violet-ultra)', color: 'var(--color-violet)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    ⬇ Descarcă selectate
                  </button>
                  <button
                    onClick={deleteSelected}
                    disabled={deleteLoading}
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    {deleteLoading ? '⏳ Se șterge...' : '🗑 Șterge selectate'}
                  </button>
                </>
              )}
              {selectedIds.size === 0 && (
                <button
                  onClick={() => downloadSelected(photos)}
                  style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: 'var(--color-violet-ultra)', color: 'var(--color-violet)', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                >
                  ⬇ Descarcă tot
                </button>
              )}
            </div>
          )}
          <div className={styles.photoGrid}>
            {photos.length === 0 ? (
              <p className={styles.emptyTab}>Nicio fotografie încă. Distribuie linkul invitaților!</p>
            ) : (
              photos.map((photo) => (
                <div
                  key={photo.id}
                  className={styles.photoItem}
                  style={{ position: 'relative', outline: selectedIds.has(photo.id) ? '3px solid var(--color-violet)' : 'none', outlineOffset: '2px' }}
                  onClick={() => toggleSelect(photo.id)}
                >
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px', zIndex: 2,
                    width: '22px', height: '22px', borderRadius: '6px',
                    background: selectedIds.has(photo.id) ? 'var(--color-violet)' : 'rgba(255,255,255,0.9)',
                    border: selectedIds.has(photo.id) ? '2px solid var(--color-violet)' : '2px solid rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease', cursor: 'pointer',
                  }}>
                    {selectedIds.has(photo.id) && <span style={{ color: 'white', fontSize: '13px', fontWeight: 700 }}>✓</span>}
                  </div>
                  <img
                    src={photo.public_url || `${process.env.NEXT_PUBLIC_R2_URL}/${photo.r2_key}`}
                    alt={photo.original_name}
                    className={styles.photoImg}
                    loading="lazy"
                    style={{ cursor: 'pointer' }}
                  />
                  <p className={styles.photoName}>{photo.original_name}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'clipuri' && (
        <div>
          {videos.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: 'var(--space-md)', flexWrap: 'wrap' }}>
              <button
                onClick={() => selectAll(videos)}
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: 'var(--color-cream)', border: '1px solid var(--color-cream-darker)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              >
                {selectedIds.size === videos.length ? '✗ Deselectează tot' : '✓ Selectează tot'}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{selectedIds.size} selectate</span>
                  <button
                    onClick={deleteSelected}
                    disabled={deleteLoading}
                    style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
                  >
                    {deleteLoading ? '⏳ Se șterge...' : '🗑 Șterge selectate'}
                  </button>
                </>
              )}
            </div>
          )}
          <div className={styles.photoGrid}>
            {videos.length === 0 ? (
              <p className={styles.emptyTab}>Niciun clip încă.</p>
            ) : (
              videos.map((video) => (
                <div
                  key={video.id}
                  className={styles.photoItem}
                  style={{ position: 'relative', outline: selectedIds.has(video.id) ? '3px solid var(--color-violet)' : 'none', outlineOffset: '2px' }}
                  onClick={() => toggleSelect(video.id)}
                >
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px', zIndex: 2,
                    width: '22px', height: '22px', borderRadius: '6px',
                    background: selectedIds.has(video.id) ? 'var(--color-violet)' : 'rgba(255,255,255,0.9)',
                    border: selectedIds.has(video.id) ? '2px solid var(--color-violet)' : '2px solid rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s ease', cursor: 'pointer',
                  }}>
                    {selectedIds.has(video.id) && <span style={{ color: 'white', fontSize: '13px', fontWeight: 700 }}>✓</span>}
                  </div>
                  <video
                    src={video.public_url || `${process.env.NEXT_PUBLIC_R2_URL}/${video.r2_key}`}
                    className={styles.photoImg}
                    controls
                    preload="metadata"
                    style={{ cursor: 'pointer' }}
                  />
                  <p className={styles.photoName}>{video.original_name}</p>
                </div>
              ))
            )}
          </div>
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

function EventSetupForm({ onCreated }) {
  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState('nunta');
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [coupleNames, setCoupleNames] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const PACKAGES = {
    nunta: [
      { key: 'intim', name: 'NUNTĂ INTIMĂ', price: 27900, guests: 100, storageGB: 5, subLabel: 'ideal pentru evenimente până în 100 invitați', features: ['Album Digital & QR unic', 'Catalog & Design Printabil pentru QR', '3 luni stocare de la data evenimentului', 'Încărcări nelimitate', 'Cartonașe fizice'] },
      { key: 'complet', name: 'NUNTĂ COMPLETĂ', price: 36900, guests: 250, storageGB: 15, subLabel: 'ideal pentru evenimente până în 250 invitați', popular: true, features: ['Album Digital & QR unic', 'Catalog & Design Printabil pentru QR', '3 luni stocare de la data evenimentului', 'Încărcări nelimitate', 'Cartonașe fizice opțional'] },
      { key: 'vis', name: 'NUNTĂ DE VIS', price: 55900, guests: 500, storageGB: 30, subLabel: 'ideal pentru evenimente până în 500 invitați', features: ['Album Digital & QR unic', 'Catalog & Design Printabil pentru QR', '3 luni stocare de la data evenimentului', 'Încărcări nelimitate', 'Cartonașe fizice opțional'] },
    ],
    botez: [
      { key: 'intim', name: 'BOTEZ INTIM', price: 24900, guests: 50, storageGB: 3, subLabel: 'ideal pentru evenimente până în 50 invitați', features: ['Album Digital & QR unic', 'Catalog & Design Printabil pentru QR', '3 luni stocare de la data evenimentului', 'Încărcări nelimitate', 'Cartonașe fizice'] },
      { key: 'complet', name: 'BOTEZ COMPLET', price: 32900, guests: 150, storageGB: 10, subLabel: 'ideal pentru evenimente până în 150 invitați', popular: true, features: ['Album Digital & QR unic', 'Catalog & Design Printabil pentru QR', '3 luni stocare de la data evenimentului', 'Încărcări nelimitate', 'Cartonașe fizice opțional'] },
      { key: 'vis', name: 'BOTEZ DE VIS', price: 48900, guests: 300, storageGB: 20, subLabel: 'ideal pentru evenimente până în 300 invitați', features: ['Album Digital & QR unic', 'Catalog & Design Printabil pentru QR', '3 luni stocare de la data evenimentului', 'Încărcări nelimitate', 'Cartonașe fizice opțional'] },
    ],
    aniversare: [
      { key: 'intim', name: 'ANIVERSARE INTIMĂ', price: 24900, guests: 50, storageGB: 3, subLabel: 'ideal pentru evenimente până în 50 invitați', features: ['Album Digital & QR unic', 'Catalog & Design Printabil pentru QR', '3 luni stocare de la data evenimentului', 'Încărcări nelimitate', 'Cartonașe fizice'] },
      { key: 'complet', name: 'ANIVERSARE COMPLETĂ', price: 32900, guests: 150, storageGB: 10, subLabel: 'ideal pentru evenimente până în 150 invitați', popular: true, features: ['Album Digital & QR unic', 'Catalog & Design Printabil pentru QR', '3 luni stocare de la data evenimentului', 'Încărcări nelimitate', 'Cartonașe fizice opțional'] },
      { key: 'vis', name: 'ANIVERSARE DE VIS', price: 48900, guests: 300, storageGB: 20, subLabel: 'ideal pentru evenimente până în 300 invitați', features: ['Album Digital & QR unic', 'Catalog & Design Printabil pentru QR', '3 luni stocare de la data evenimentului', 'Încărcări nelimitate', 'Cartonașe fizice opțional'] },
    ],
    corporate: [
      { key: 'intim', name: 'CORPORATE BASIC', price: 32900, guests: 100, storageGB: 10, subLabel: 'ideal pentru evenimente până în 100 invitați', features: ['Album Digital & QR unic', 'Catalog & Design Printabil pentru QR', '3 luni stocare de la data evenimentului', 'Încărcări nelimitate', 'Cartonașe fizice'] },
      { key: 'complet', name: 'CORPORATE STANDARD', price: 45900, guests: 300, storageGB: 25, subLabel: 'ideal pentru evenimente până în 300 invitați', popular: true, features: ['Album Digital & QR unic', 'Catalog & Design Printabil pentru QR', '3 luni stocare de la data evenimentului', 'Încărcări nelimitate', 'Cartonașe fizice opțional'] },
      { key: 'vis', name: 'CORPORATE PREMIUM', price: 69900, guests: 600, storageGB: 50, subLabel: 'ideal pentru evenimente până în 600 invitați', features: ['Album Digital & QR unic', 'Catalog & Design Printabil pentru QR', '3 luni stocare de la data evenimentului', 'Încărcări nelimitate', 'Cartonașe fizice opțional'] },
    ],
  };

  const TABS = [
    { key: 'nunta', label: 'Nuntă' },
    { key: 'botez', label: 'Botez' },
    { key: 'aniversare', label: 'Aniversare' },
    { key: 'corporate', label: 'Corporate' },
  ];

  const plans = PACKAGES[eventType];

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('Nu ești autentificat.'); setSaving(false); return; }

      const res = await fetch('/api/events/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventName,
          eventType,
          eventDate,
          coupleNames: coupleNames || null,
          location: location || null,
          maxGuests: selectedPlan?.guests || 100,
          maxStorageBytes: (selectedPlan?.storageGB || 25) * 1024 * 1024 * 1024,
          packageType: eventType,
          packageTier: selectedPlan?.key || 'complet',
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        console.error('Event creation error:', result.error);
        setError(`Eroare: ${result.error}`);
        setSaving(false);
        return;
      }

      onCreated();
    } catch (err) {
      console.error(err);
      setError('Eroare neașteptată. Încearcă din nou.');
      setSaving(false);
    }
  };

  const fieldStyle = {
    padding: '14px 16px', border: '1px solid var(--color-cream-darker)',
    borderRadius: 'var(--radius-md)', fontSize: '15px', fontFamily: 'var(--font-sans)',
    outline: 'none', width: '100%', background: '#ffffff'
  };

  const labelStyle = {
    display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '6px'
  };

  if (step === 1) {
    return (
      <div style={{ padding: 'var(--space-2xl) 0', width: '100%', maxWidth: '1100px', margin: '0 auto' }}>
        <div className={pricingStyles.header}>
          <span className={pricingStyles.eyebrow}>Configurare Cont</span>
          <h2 className={pricingStyles.title}>Alege pachetul potrivit</h2>
          <p className={pricingStyles.subtitle}>
            Selectează tipul evenimentului și planul de care ai nevoie pentru a-ți activa colecția.
          </p>
        </div>

        <div className={pricingStyles.tabs}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${pricingStyles.tab} ${eventType === tab.key ? pricingStyles.tabActive : ''}`}
              onClick={() => { setEventType(tab.key); setSelectedPlan(null); }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={pricingStyles.grid}>
          {plans.map((plan) => (
            <div key={plan.key} style={{ height: '100%' }}>
              <PricingCard
                name={plan.name}
                price={plan.price}
                subLabel={plan.subLabel}
                features={plan.features}
                isPopular={plan.popular}
                buttonText="Alege acest pachet →"
                onSelect={() => { setSelectedPlan(plan); setStep(2); }}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', padding: 'var(--space-2xl) 0' }}>
      <button
        onClick={() => setStep(1)}
        style={{
          background: 'none', border: 'none', color: 'var(--color-violet)',
          fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          marginBottom: '24px', fontFamily: 'var(--font-sans)', display: 'inline-flex', gap: '8px'
        }}
      >
        ← Schimbă pachetul
      </button>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', color: 'var(--color-text)', marginBottom: '8px' }}>
          Detalii eveniment
        </h2>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '15px' }}>
          Pachet ales: <strong>{selectedPlan?.name}</strong> la {Math.round(selectedPlan?.price / 100)} RON
        </p>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid rgba(181,140,79,0.3)', borderRadius: 'var(--radius-lg)', padding: '32px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: 'var(--color-error)', fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Numele evenimentului *</label>
            <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required placeholder="Ex: Nunta Ana & Mihai" style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Data evenimentului *</label>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Numele mirilor / Organizator</label>
            <input type="text" value={coupleNames} onChange={(e) => setCoupleNames(e.target.value)} placeholder="Ex: Ana & Mihai" style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>Locația</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Restaurant Noblesse, București" style={fieldStyle} />
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{
              background: 'var(--color-burgundy)', color: 'white', border: 'none',
              padding: '16px', fontSize: '15px', fontWeight: 600, borderRadius: 'var(--radius-md)',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, marginTop: '8px',
              transition: 'all 0.2s ease', fontFamily: 'var(--font-sans)'
            }}
          >
            {saving ? 'Se creează...' : '🚀 Finalizează și Activează QR-ul'}
          </button>
        </form>
      </div>
    </div>
  );
}

