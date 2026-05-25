'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ContulMeuPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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
    }
  }

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
  const cardStyle = { background: 'var(--color-white)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-xl)', border: '1px solid var(--color-cream-darker)', marginBottom: 'var(--space-xl)' };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
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
    </div>
  );
}
