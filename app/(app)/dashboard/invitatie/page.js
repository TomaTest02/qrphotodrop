'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from '../evenimentul-meu/dashboard.module.css';
import AnimatedInvitation from '@/components/marketing/AnimatedInvitation';

export default function InvitatieDashboardPage() {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rsvps, setRsvps] = useState([]);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState({
    title: 'Nunta Noastră',
    message: 'Vă invităm să ne fiți alături în cea mai fericită zi!',
    churchTime: '15:00',
    churchLocation: 'Biserica Sfinții Arhangheli',
    partyTime: '19:00',
    partyLocation: 'Restaurant Grand Ballroom',
    rsvpDeadline: '',
    designStyle: 'burgundy'
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch event
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (eventData) {
      setEvent(eventData);
      if (eventData.invitation_details && Object.keys(eventData.invitation_details).length > 0) {
        setDetails(prev => ({ ...prev, ...eventData.invitation_details }));
      } else {
         // pre-fill with event name if no details
         setDetails(prev => ({ ...prev, title: eventData.event_name }));
      }

      // Fetch RSVPs
      const { data: rsvpsData } = await supabase
        .from('rsvps')
        .select('*')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false });
        
      if (rsvpsData) setRsvps(rsvpsData);
    }
    setLoading(false);
  }

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/invitation/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, details })
      });
      if (res.ok) alert('Invitația a fost salvată cu succes!');
      else alert('Eroare la salvare.');
    } catch (err) {
      alert('Eroare de conexiune.');
    }
    setSaving(false);
  };

  const handleChange = (e) => {
    setDetails({ ...details, [e.target.name]: e.target.value });
  };

  if (loading) return <div className={styles.loading}>Se încarcă...</div>;
  if (!event) return <div className={styles.container}><h1>Nu ai niciun eveniment creat.</h1></div>;

  const publicLink = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/invitatie/${event.event_code}`;

  const attendingCount = rsvps.filter(r => r.status === 'attending').reduce((acc, curr) => acc + curr.guests_count, 0);
  const declinedCount = rsvps.filter(r => r.status === 'declined').reduce((acc, curr) => acc + curr.guests_count, 0);

  const getEnvelopeColor = () => {
    if (details.designStyle === 'burgundy') return '#681b2b';
    if (details.designStyle === 'gold') return '#d4af37';
    return '#8b7355'; // papyrus
  };

  return (
    <div className={styles.container} style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <header className={styles.header}>
        <h1 className={styles.title}>Invitație Online</h1>
        <p className={styles.subtitle}>Creează-ți invitația digitală și urmărește confirmările (RSVP).</p>
      </header>

      <div className={styles.alert} style={{ marginBottom: 'var(--space-xl)', background: 'var(--color-cream)', border: '1px solid var(--color-gold)' }}>
        <strong>Link-ul invitației: </strong>
        <a href={publicLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-violet)', fontWeight: 'bold' }}>{publicLink}</a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        {/* Editor Form */}
        <div style={{ background: '#fff', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '20px', marginBottom: 'var(--space-md)', color: 'var(--color-text)' }}>Personalizare Invitație</h2>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
              Design Plic
              <select name="designStyle" value={details.designStyle} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 'var(--radius-md)' }}>
                <option value="burgundy">Plic Classic Burgundy cu Ceară</option>
                <option value="gold">Plic Cream & Gold</option>
                <option value="papyrus">Papirus Regal (Scroll)</option>
              </select>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
              Titlu
              <input type="text" name="title" value={details.title} onChange={handleChange} placeholder="ex: Nunta Noastră" style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 'var(--radius-md)' }} />
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
              Mesaj Principal
              <textarea name="message" value={details.message} onChange={handleChange} rows="3" style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 'var(--radius-md)' }}></textarea>
            </label>

            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                Ora Biserică
                <input type="text" name="churchTime" value={details.churchTime} onChange={handleChange} placeholder="15:00" style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 'var(--radius-md)' }} />
              </label>
              <label style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                Locație Biserică
                <input type="text" name="churchLocation" value={details.churchLocation} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 'var(--radius-md)' }} />
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                Ora Petrecere
                <input type="text" name="partyTime" value={details.partyTime} onChange={handleChange} placeholder="19:00" style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 'var(--radius-md)' }} />
              </label>
              <label style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                Locație Petrecere
                <input type="text" name="partyLocation" value={details.partyLocation} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 'var(--radius-md)' }} />
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
              Data limită confirmări (RSVP)
              <input type="date" name="rsvpDeadline" value={details.rsvpDeadline} onChange={handleChange} style={{ padding: '12px', border: '1px solid #ddd', borderRadius: 'var(--radius-md)' }} />
            </label>

            <button type="submit" disabled={saving} style={{ marginTop: '10px', background: 'var(--color-violet)', color: '#fff', padding: '14px', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', cursor: 'pointer' }}>
              {saving ? 'Se salvează...' : 'Salvează Invitația'}
            </button>
          </form>
        </div>

        {/* Live Preview */}
        <div style={{ background: '#f5efe6', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ fontSize: '20px', marginBottom: 'var(--space-md)', color: 'var(--color-text)', alignSelf: 'flex-start' }}>Preview în timp real</h2>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '30px', alignSelf: 'flex-start' }}>Așa va arăta invitația ta pe telefonul invitaților (după deschiderea plicului/papirusului). Apasă pe plic mai jos pentru a vedea animația!</p>
          
          <div style={{ width: '100%', maxWidth: '400px', transform: 'scale(0.8)', transformOrigin: 'top center' }}>
            <AnimatedInvitation details={details} isPreview={true} />
          </div>
        </div>
      </div>

      {/* RSVP CRM Table (Full Width) */}
      <div style={{ background: '#fff', padding: 'var(--space-xl)', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize: '20px', marginBottom: 'var(--space-md)', color: 'var(--color-text)' }}>Confirmări Primite (RSVP)</h2>
        
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '15px', background: 'var(--color-cream-light)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Prezenți (Meniuri)</span>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'green' }}>{attendingCount}</div>
          </div>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Nu participă</span>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'red' }}>{declinedCount}</div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '10px 0' }}>Nume</th>
              <th style={{ padding: '10px 0' }}>Status</th>
              <th style={{ padding: '10px 0' }}>Pers.</th>
              <th style={{ padding: '10px 0' }}>Dietă / Preferințe</th>
            </tr>
          </thead>
          <tbody>
            {rsvps.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: '20px 0', color: '#888' }}>Încă nu ai primit nicio confirmare.</td></tr>
            ) : (
              rsvps.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '12px 0', fontWeight: 600 }}>{r.guest_name}</td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', background: r.status === 'attending' ? '#dcfce7' : '#fee2e2', color: r.status === 'attending' ? '#166534' : '#991b1b' }}>
                      {r.status === 'attending' ? 'Prezent' : 'Absent'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 0' }}>{r.guests_count}</td>
                  <td style={{ padding: '12px 0', color: '#666' }}>{r.dietary_requirements || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
