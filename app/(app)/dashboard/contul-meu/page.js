'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clock } from '@phosphor-icons/react';
import styles from './contul-meu.module.css';

const TIER_LABEL = { intim: 'Basic', complet: 'Standard', vis: 'Premium' };
const TIER_MONTHS = { intim: 1, complet: 2, vis: 3 };
const TYPE_LABEL = { nunta: 'Nuntă', botez: 'Botez', aniversare: 'Aniversare', corporate: 'Corporate' };

export default function ContulMeuPage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [event, setEvent] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => { loadProfile(); }, []);

  async function loadProfile() {
    const supabase = createClient();
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      setUser(u);
      const { data } = await supabase.from('users').select('*').eq('id', u.id).single();
      setProfile(data);
      const { data: userEvent } = await supabase.from('events').select('*').eq('user_id', u.id).single();
      if (userEvent) setEvent(userEvent);
    }
  }

  const expiryDate = event?.event_date
    ? (() => {
        const d = new Date(event.expires_at || event.event_date);
        if (!event.expires_at) d.setMonth(d.getMonth() + (TIER_MONTHS[event.package_tier] || 3));
        return d;
      })()
    : null;

  useEffect(() => {
    if (!expiryDate) return undefined;
    const tick = () => {
      const diff = expiryDate.getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Expirat'); return; }
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff / 3600000) % 24);
      const mins = Math.floor((diff / 60000) % 60);
      setTimeLeft(`${days} zile, ${hours} ore, ${mins} min`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [event]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) { setMessage('Parola trebuie să aibă minim 8 caractere.'); return; }
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setMessage(error ? 'Eroare la actualizare.' : 'Parola a fost actualizată cu succes!');
    if (!error) setNewPassword('');
    setLoading(false);
  };

  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Contul meu</h1>

      <div className={styles.grid}>
        {/* Informații cont */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Informații cont</h2>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Email</span>
              <span className={styles.fieldValue}>{user?.email || '—'}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Telefon</span>
              <span className={styles.fieldValue}>{profile?.phone || '—'}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Rol</span>
              <span className={styles.fieldValue} style={{ textTransform: 'capitalize' }}>{profile?.role || '—'}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Cont creat</span>
              <span className={styles.fieldValue}>{fmtDate(user?.created_at)}</span>
            </div>

            {event && (
              <>
                <div className={styles.sectionLabel}>Evenimentul tău</div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Data evenimentului</span>
                  <span className={styles.fieldValue}>{fmtDate(event.event_date)}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Abonament</span>
                  <span className={styles.fieldValue}>
                    {TYPE_LABEL[event.package_type] || event.package_type || event.event_type} · <strong>{TIER_LABEL[event.package_tier] || event.package_tier || '—'}</strong>
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Expirare stocare</span>
                  <span className={styles.fieldValue}><strong>{fmtDate(expiryDate)}</strong></span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Cod eveniment</span>
                  <span className={styles.fieldValue}><strong>{event.event_code}</strong></span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Countdown */}
        {timeLeft && (
          <div className={styles.countdown}>
            <div className={styles.countdownHead}><Clock size={16} weight="bold" /> Timp rămas stocare</div>
            <div className={styles.countdownValue}>{timeLeft}</div>
            <p className={styles.countdownNote}>
              La finalul acestei perioade, galeria și toate fișierele vor fi șterse definitiv.
            </p>
            {expiryDate && (
              <div className={styles.countdownExpiry}>Se șterge pe <strong>{fmtDate(expiryDate)}</strong></div>
            )}
          </div>
        )}
      </div>

      {/* Schimbă parola */}
      <div className={`${styles.card} ${styles.pwCard}`}>
        <h2 className={styles.cardTitle}>Schimbă parola</h2>
        {message && (
          <div className={`${styles.alert} ${message.includes('succes') ? styles.alertOk : styles.alertErr}`}>{message}</div>
        )}
        <form onSubmit={handlePasswordUpdate} className={styles.pwForm}>
          <div>
            <label className={styles.label}>Parolă nouă</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
              placeholder="Minim 8 caractere"
              required
            />
          </div>
          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Se actualizează...' : 'Actualizează parola'}
          </button>
        </form>
      </div>
    </div>
  );
}
