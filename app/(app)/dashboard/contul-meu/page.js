'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ContulMeuPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [event, setEvent] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const supabase = createClient();
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      setUser(u);
      const { data } = await supabase.from('users').select('*').eq('id', u.id).single();
      setProfile(data);
      
      const { data: userEvent } = await supabase.from('events').select('*').eq('user_id', u.id).single();
      if (userEvent) {
        setEvent(userEvent);
      }
    }
  }

  useEffect(() => {
    if (!event?.event_date) return;
    
    // Expira la 3 luni dupa eveniment
    const expiryDate = new Date(event.event_date);
    expiryDate.setMonth(expiryDate.getMonth() + 3);

    const timer = setInterval(() => {
      const now = new Date();
      const diff = expiryDate - now;

      if (diff <= 0) {
        setTimeLeft('Expirat');
        clearInterval(timer);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const mins = Math.floor((diff / 1000 / 60) % 60);
        setTimeLeft(`${days} zile, ${hours} ore, ${mins} min`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [event]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setMessage('Parola trebuie să aibă minim 8 caractere.');
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage('Eroare la actualizare.');
    } else {
      setMessage('Parola a fost actualizată cu succes!');
      setNewPassword('');
    }
    setLoading(false);
  };

  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--color-text-muted)', marginBottom: '6px' };
  const inputStyle = { width: '100%', padding: '14px 16px', border: '1px solid var(--color-cream-darker)', borderRadius: 'var(--radius-md)', fontSize: '15px', fontFamily: 'var(--font-sans)', outline: 'none' };
  const cardStyle = { background: 'var(--color-white)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', border: '1px solid var(--color-cream-darker)', marginBottom: 'var(--space-xl)', position: 'relative' };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '100px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '32px', fontWeight: 700, letterSpacing: '-1px', marginBottom: 'var(--space-xl)' }}>
        Contul meu
      </h1>

      {/* Info card */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>Informații cont</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div>
            <label style={labelStyle}>Email</label>
            <p style={{ fontSize: '15px', color: 'var(--color-text)' }}>{user?.email || '—'}</p>
          </div>
          <div>
            <label style={labelStyle}>Rol</label>
            <p style={{ fontSize: '15px', color: 'var(--color-text)', textTransform: 'capitalize' }}>{profile?.role || '—'}</p>
          </div>
          <div>
            <label style={labelStyle}>Telefon</label>
            <p style={{ fontSize: '15px', color: 'var(--color-text)' }}>{profile?.phone || '—'}</p>
          </div>
          <div>
            <label style={labelStyle}>Cont creat</label>
            <p style={{ fontSize: '15px', color: 'var(--color-text)' }}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('ro-RO') : '—'}
            </p>
          </div>

          {/* Event details if available */}
          {event && (
            <>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-cream-darker)', margin: 'var(--space-sm) 0' }} />
              <div>
                <label style={labelStyle}>Data evenimentului</label>
                <p style={{ fontSize: '15px', color: 'var(--color-text)' }}>
                  {event.event_date ? new Date(event.event_date).toLocaleDateString('ro-RO') : '—'}
                </p>
              </div>
              <div>
                <label style={labelStyle}>Abonament ales</label>
                <p style={{ fontSize: '15px', color: 'var(--color-text)', textTransform: 'uppercase' }}>
                  {event.package_type && event.package_tier ? `${event.package_type} ${event.package_tier}` : '—'}
                </p>
              </div>
              <div>
                <label style={labelStyle}>Expirare stocare</label>
                <p style={{ fontSize: '15px', color: 'var(--color-text)', fontWeight: 600 }}>
                  {event.event_date ? (() => {
                    const expiry = new Date(event.event_date);
                    expiry.setMonth(expiry.getMonth() + 3); // Exact 3 luni
                    return expiry.toLocaleDateString('ro-RO');
                  })() : '—'}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Password change */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 'var(--space-lg)' }}>Schimbă parola</h3>

        {message && (
          <div style={{
            padding: 'var(--space-md)',
            background: message.includes('succes') ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${message.includes('succes') ? '#bbf7d0' : '#fecaca'}`,
            borderRadius: 'var(--radius-md)',
            color: message.includes('succes') ? 'var(--color-success)' : 'var(--color-error)',
            fontSize: '14px',
            marginBottom: 'var(--space-lg)',
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handlePasswordUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div>
            <label style={labelStyle}>Parolă nouă</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
              placeholder="Minim 8 caractere"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px 24px',
              background: 'var(--color-violet)',
              color: 'white',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Se actualizează...' : 'Actualizează parola'}
          </button>
        </form>
      </div>

      {/* Expiry Countdown Widget */}
      {timeLeft && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: '#bc965c', // Culoarea aurie/camel din imagine
          color: '#3e405b',      // Culoarea textului (albastru închis)
          padding: '24px',
          borderRadius: '16px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          zIndex: 100,
          maxWidth: '320px',
          fontFamily: 'var(--font-sans)'
        }}>
          <p style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px', fontWeight: 600, color: 'rgba(62,64,91,0.8)' }}>
            Timp rămas stocare
          </p>
          <p style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-serif)', marginBottom: '12px', color: '#3e405b', letterSpacing: '-0.5px' }}>
            {timeLeft}
          </p>
          <p style={{ fontSize: '14px', opacity: 0.85, lineHeight: 1.5, color: '#3e405b' }}>
            La finalul acestei perioade, galeria și toate fișierele vor fi șterse definitiv.
          </p>
        </div>
      )}
    </div>
  );
}
