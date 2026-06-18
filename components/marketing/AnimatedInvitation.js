'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import gsap from 'gsap';

export default function AnimatedInvitation({ details, event, isPreview = false }) {
  const [opened, setOpened] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState('');
  const [form, setForm] = useState({ guestName: '', status: 'attending', guestsCount: 1, dietaryRequirements: '' });

  const envelopeRef = useRef(null);
  const flapRef = useRef(null);
  const letterRef = useRef(null);
  const contentRef = useRef(null);

  // Papyrus refs
  const scrollContainerRef = useRef(null);
  const topRollRef = useRef(null);
  const bottomRollRef = useRef(null);
  const papyrusContentRef = useRef(null);

  const isPapyrus = details.designStyle === 'papyrus';

  // Reset when design changes in preview mode
  useEffect(() => {
    if (isPreview) {
      setOpened(false);
    }
  }, [details.designStyle, isPreview]);

  const handleOpen = useCallback(() => {
    if (opened) return;
    setOpened(true);

    if (isPapyrus) {
      // ---- PAPYRUS SCROLL UNROLL ----
      const tl = gsap.timeline();
      tl.to(topRollRef.current, {
        y: -60,
        duration: 0.6,
        ease: 'power2.inOut',
      })
      .to(bottomRollRef.current, {
        y: 60,
        duration: 0.6,
        ease: 'power2.inOut',
      }, '<')
      .to(papyrusContentRef.current, {
        maxHeight: '1200px',
        duration: 1.2,
        ease: 'power2.out',
      }, '-=0.3')
      .to(topRollRef.current, { opacity: 0, duration: 0.4 })
      .to(bottomRollRef.current, { opacity: 0, duration: 0.4 }, '<')
      .to(papyrusContentRef.current, {
        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
        duration: 0.3,
      }, '<');
    } else {
      // ---- ENVELOPE ----
      const tl = gsap.timeline();
      // Step 1: Open the flap (rotate backwards in 3D)
      tl.to(flapRef.current, {
        rotateX: -180,
        duration: 0.7,
        ease: 'power2.inOut',
      })
      // Step 2: Slide letter up out of envelope
      .to(letterRef.current, {
        y: -260,
        duration: 0.8,
        ease: 'power2.out',
      })
      // Step 3: Fade out envelope, expand letter
      .to(envelopeRef.current, {
        opacity: 0,
        scale: 0.8,
        duration: 0.5,
        ease: 'power2.in',
      })
      .to(letterRef.current, {
        y: 0,
        width: '100%',
        maxWidth: isPreview ? '380px' : '560px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        duration: 0.8,
        ease: 'power3.out',
      }, '-=0.3');
    }
  }, [opened, isPapyrus, isPreview]);

  const handleRsvp = async (e) => {
    e.preventDefault();
    if (isPreview) return;
    setRsvpStatus('loading');
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, ...form })
      });
      setRsvpStatus(res.ok ? 'success' : 'error');
    } catch {
      setRsvpStatus('error');
    }
  };

  // Colors based on design
  const colors = {
    burgundy: { bg: '#681b2b', flap: '#7a2233', body: '#551622', seal: '#aa0000', paper: '#fffbf2' },
    gold:     { bg: '#b8941f', flap: '#d4af37', body: '#9a7a12', seal: '#8b6508', paper: '#fffff5' },
    papyrus:  { bg: '#c9a96e', roll: '#b8941f', paper: '#f4e4bc' },
  }[details.designStyle] || { bg: '#681b2b', flap: '#7a2233', body: '#551622', seal: '#aa0000', paper: '#fffbf2' };

  const title = details.title || event?.event_name || 'Evenimentul Nostru';

  // ========= RENDER: RSVP FORM =========
  const renderRSVP = () => (
    <div style={{ marginTop: '40px', borderTop: '2px solid rgba(0,0,0,0.06)', paddingTop: '30px' }}>
      <h3 style={{ fontSize: '18px', color: 'var(--color-violet)', marginBottom: '8px', fontFamily: 'var(--font-serif)' }}>Confirmați Prezența</h3>
      <p style={{ fontSize: '12px', color: '#888', marginBottom: '20px' }}>Până pe {details.rsvpDeadline || '...'}</p>
      
      {rsvpStatus === 'success' ? (
        <div style={{ background: '#dcfce7', color: '#166534', padding: '16px', borderRadius: '8px', fontSize: '14px' }}>
          ✓ Mulțumim! Confirmarea a fost înregistrată.
        </div>
      ) : (
        <form onSubmit={handleRsvp} style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
          <input type="text" placeholder="Numele dumneavoastră" value={form.guestName} onChange={e => setForm({...form, guestName: e.target.value})} required style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }}>
            <option value="attending">✓ Da, vom fi prezenți!</option>
            <option value="declined">✕ Ne pare rău, nu putem ajunge.</option>
          </select>
          {form.status === 'attending' && (
            <>
              <input type="number" min="1" max="10" placeholder="Număr persoane" value={form.guestsCount} onChange={e => setForm({...form, guestsCount: parseInt(e.target.value) || 1})} style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
              <input type="text" placeholder="Restricții alimentare (opțional)" value={form.dietaryRequirements} onChange={e => setForm({...form, dietaryRequirements: e.target.value})} style={{ padding: '10px 14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px' }} />
            </>
          )}
          <button type="submit" disabled={rsvpStatus === 'loading'} style={{ background: 'var(--color-violet)', color: '#fff', padding: '12px', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
            {rsvpStatus === 'loading' ? 'Se trimite...' : 'Trimite Răspunsul'}
          </button>
        </form>
      )}
    </div>
  );

  // ========= RENDER: INVITATION CONTENT =========
  const renderContent = () => (
    <div style={{ textAlign: 'center', fontFamily: 'var(--font-serif)' }}>
      <h1 style={{ fontSize: isPreview ? '22px' : '30px', color: 'var(--color-violet)', marginBottom: '16px', lineHeight: 1.3 }}>{title}</h1>
      <p style={{ fontSize: isPreview ? '13px' : '15px', color: '#555', lineHeight: 1.7, marginBottom: '28px', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)' }}>
        {details.message || 'Ne bucurăm să vă avem alături!'}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontFamily: 'var(--font-sans)' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gold)', marginBottom: '6px' }}>Ceremonia</div>
          <div style={{ fontSize: isPreview ? '18px' : '22px', fontWeight: 'bold', color: '#333' }}>{details.churchTime || '14:00'}</div>
          <div style={{ fontSize: isPreview ? '11px' : '13px', color: '#666', marginTop: '4px' }}>{details.churchLocation || '-'}</div>
        </div>
        <div style={{ width: '1px', background: 'rgba(0,0,0,0.1)' }}></div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', color: 'var(--color-gold)', marginBottom: '6px' }}>Petrecerea</div>
          <div style={{ fontSize: isPreview ? '18px' : '22px', fontWeight: 'bold', color: '#333' }}>{details.partyTime || '19:00'}</div>
          <div style={{ fontSize: isPreview ? '11px' : '13px', color: '#666', marginTop: '4px' }}>{details.partyLocation || '-'}</div>
        </div>
      </div>
      {opened && renderRSVP()}
    </div>
  );

  // ===========================
  // PAPYRUS SCROLL DESIGN
  // ===========================
  if (isPapyrus) {
    return (
      <div style={{ 
        width: '100%', 
        minHeight: isPreview ? '500px' : '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '40px 20px',
      }}>
        <div ref={scrollContainerRef} style={{
          position: 'relative',
          width: isPreview ? '340px' : '420px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: opened ? 'default' : 'pointer',
        }} onClick={handleOpen}>
          
          {/* Top Roll */}
          <div ref={topRollRef} style={{
            width: isPreview ? '360px' : '440px',
            height: '36px',
            background: `linear-gradient(180deg, ${colors.roll || '#d4af37'} 0%, #a67c00 40%, ${colors.roll || '#d4af37'} 60%, #c5a028 100%)`,
            borderRadius: '18px',
            zIndex: 15,
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
            position: 'relative',
            flexShrink: 0,
          }}>
            {/* End caps */}
            <div style={{ position: 'absolute', left: '-8px', top: '4px', width: '28px', height: '28px', borderRadius: '50%', background: 'radial-gradient(circle, #d4af37, #8b6508)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}></div>
            <div style={{ position: 'absolute', right: '-8px', top: '4px', width: '28px', height: '28px', borderRadius: '50%', background: 'radial-gradient(circle, #d4af37, #8b6508)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}></div>
          </div>

          {/* Paper content area (clip-masked) */}
          <div ref={papyrusContentRef} style={{
            width: '100%',
            maxHeight: opened ? '1200px' : '60px',
            overflow: 'hidden',
            background: colors.paper,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
            padding: opened ? '40px 24px' : '10px 24px',
            transition: opened ? 'none' : 'max-height 0s',
            borderLeft: '2px solid rgba(139,101,8,0.15)',
            borderRight: '2px solid rgba(139,101,8,0.15)',
          }}>
            {!opened && (
              <div style={{ textAlign: 'center', color: '#8b6508', fontSize: '13px', letterSpacing: '3px', fontFamily: 'var(--font-serif)', paddingTop: '15px', animation: 'breathe 2s ease-in-out infinite' }}>
                ✦ APASĂ PENTRU A DESFĂȘURA ✦
              </div>
            )}
            {opened && renderContent()}
          </div>

          {/* Bottom Roll */}
          <div ref={bottomRollRef} style={{
            width: isPreview ? '360px' : '440px',
            height: '36px',
            background: `linear-gradient(0deg, ${colors.roll || '#d4af37'} 0%, #a67c00 40%, ${colors.roll || '#d4af37'} 60%, #c5a028 100%)`,
            borderRadius: '18px',
            zIndex: 15,
            boxShadow: '0 -6px 20px rgba(0,0,0,0.3)',
            position: 'relative',
            flexShrink: 0,
          }}>
            <div style={{ position: 'absolute', left: '-8px', top: '4px', width: '28px', height: '28px', borderRadius: '50%', background: 'radial-gradient(circle, #d4af37, #8b6508)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}></div>
            <div style={{ position: 'absolute', right: '-8px', top: '4px', width: '28px', height: '28px', borderRadius: '50%', background: 'radial-gradient(circle, #d4af37, #8b6508)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}></div>
          </div>
        </div>

        <style jsx global>{`
          @keyframes breathe {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ===========================
  // ENVELOPE DESIGN (Burgundy / Gold)
  // ===========================
  return (
    <div style={{
      width: '100%',
      minHeight: isPreview ? '500px' : '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      perspective: '1200px',
      padding: '40px 20px',
    }}>
      <div style={{
        position: 'relative',
        width: isPreview ? '300px' : '360px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        
        {/* ENVELOPE CONTAINER */}
        <div ref={envelopeRef} style={{
          position: 'relative',
          width: '100%',
          height: isPreview ? '200px' : '240px',
          transformStyle: 'preserve-3d',
          cursor: opened ? 'default' : 'pointer',
        }} onClick={handleOpen}>

          {/* Envelope body (back) */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: '70%',
            background: colors.bg,
            borderRadius: '0 0 6px 6px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.25)',
          }}></div>

          {/* Envelope body (front) */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: '70%',
            background: `linear-gradient(135deg, ${colors.body} 0%, ${colors.bg} 100%)`,
            borderRadius: '0 0 6px 6px',
            zIndex: 3,
            clipPath: 'polygon(0 40%, 50% 0, 100% 40%, 100% 100%, 0 100%)',
          }}></div>

          {/* FLAP (The lid that opens) */}
          <div ref={flapRef} style={{
            position: 'absolute',
            top: 0,
            width: '100%',
            height: '55%',
            transformOrigin: 'top center',
            transformStyle: 'preserve-3d',
            zIndex: 5,
            transition: opened ? 'none' : 'transform 0.3s',
          }}>
            {/* Front face of flap */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: `linear-gradient(180deg, ${colors.flap} 0%, ${colors.bg} 100%)`,
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              backfaceVisibility: 'hidden',
              borderRadius: '6px 6px 0 0',
            }}></div>
            {/* Back face of flap (visible when opened) */}
            <div style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: `linear-gradient(0deg, ${colors.body} 0%, ${colors.bg} 100%)`,
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
              backfaceVisibility: 'hidden',
              transform: 'rotateX(180deg)',
              borderRadius: '6px 6px 0 0',
            }}></div>

            {/* Wax Seal */}
            {!opened && (
              <div style={{
                position: 'absolute',
                bottom: '-18px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: isPreview ? '40px' : '50px',
                height: isPreview ? '40px' : '50px',
                background: `radial-gradient(circle at 35% 35%, ${colors.seal} 0%, #6b0000 100%)`,
                borderRadius: '50%',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10,
                fontSize: isPreview ? '18px' : '22px',
                color: '#ffddaa',
                fontFamily: 'var(--font-serif)',
                fontWeight: 'bold',
              }}>
                {title.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* LETTER (slides up) */}
          <div ref={letterRef} style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            right: '10px',
            height: isPreview ? '150px' : '180px',
            background: colors.paper,
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            padding: '20px 16px',
            zIndex: 2,
            overflow: opened ? 'visible' : 'hidden',
          }}>
            {opened && renderContent()}
          </div>

          {/* Call to action */}
          {!opened && (
            <div style={{
              position: 'absolute',
              bottom: '-45px',
              width: '100%',
              textAlign: 'center',
              fontSize: '12px',
              letterSpacing: '3px',
              color: '#888',
              fontFamily: 'var(--font-sans)',
              animation: 'breathe 2s ease-in-out infinite',
            }}>
              ✦ APASĂ PENTRU A DESCHIDE ✦
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
