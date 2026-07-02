'use client';

import { useState, useEffect, use } from 'react';

const ADVANCE_MS = 6000;   // schimbă poza la 6s
const REFRESH_MS = 20000;  // caută poze noi la 20s

export default function SlideshowPage({ params }) {
  const { eventCode } = use(params);
  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Încărcare + reîmprospătare periodică
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/slideshow?code=${encodeURIComponent(eventCode)}`);
        if (!res.ok) { if (active) setLoaded(true); return; }
        const data = await res.json();
        if (!active) return;
        setEvent(data.event || null);
        setPhotos(data.photos || []);
        setLoaded(true);
      } catch { if (active) setLoaded(true); }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { active = false; clearInterval(id); };
  }, [eventCode]);

  // Auto-advance
  useEffect(() => {
    if (photos.length < 2) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % photos.length), ADVANCE_MS);
    return () => clearInterval(id);
  }, [photos.length]);

  useEffect(() => {
    if (index >= photos.length) setIndex(0);
  }, [photos.length, index]);

  const current = photos[index];

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0d0b12', overflow: 'hidden', fontFamily: 'var(--font-sans, sans-serif)' }}>
      <style>{`
        @keyframes kenburns { from { transform: scale(1); } to { transform: scale(1.08); } }
        @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }
        .ssImg { animation: fadein 1.1s ease, kenburns ${ADVANCE_MS + 1500}ms ease-out both; }
      `}</style>

      {/* Header eveniment */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 3, padding: '28px 40px', background: 'linear-gradient(180deg, rgba(0,0,0,0.55), transparent)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: '#fff', fontSize: '26px', fontWeight: 700, fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic' }}>{event?.event_name || 'Album live'}</div>
          {photos.length > 0 && <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginTop: '2px' }}>{photos.length} amintiri · se actualizează automat</div>}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', letterSpacing: '1px' }}>QRPhotoDrop</div>
      </div>

      {/* Poza curentă */}
      {current ? (
        <img
          key={current.id}
          className="ssImg"
          src={current.public_url}
          alt="Event slideshow"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: '60px 24px' }}
        />
      ) : (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📸</div>
          <div style={{ fontSize: '24px', fontFamily: 'var(--font-serif, serif)', fontStyle: 'italic', marginBottom: '8px' }}>
            {loaded ? 'Așteptăm primele amintiri...' : 'Se încarcă...'}
          </div>
          {loaded && <div style={{ fontSize: '15px', opacity: 0.65 }}>Pozele invitaților vor apărea aici automat, pe măsură ce sunt încărcate.</div>}
        </div>
      )}

      {/* Progres jos */}
      {photos.length > 1 && (
        <div style={{ position: 'absolute', bottom: '22px', left: '50%', transform: 'translateX(-50%)', zIndex: 3, display: 'flex', gap: '6px' }}>
          {photos.slice(0, 20).map((p, i) => (
            <span key={p.id} style={{ width: i === index % 20 ? '22px' : '6px', height: '6px', borderRadius: '999px', background: i === index % 20 ? '#fff' : 'rgba(255,255,255,0.35)', transition: 'all 0.4s ease' }} />
          ))}
        </div>
      )}
    </div>
  );
}
