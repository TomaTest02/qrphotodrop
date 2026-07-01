'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from '../login/login.module.css';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Parola trebuie să aibă minim 8 caractere.'); return; }
    if (password !== confirm) { setError('Parolele nu coincid.'); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError('Linkul de resetare a expirat sau este invalid. Cere unul nou din pagina „Ai uitat parola?".');
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
    await supabase.auth.signOut();
    setTimeout(() => { window.location.href = '/login'; }, 2500);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <a href="/" className={styles.logo}>QRPhotoDrop</a>
          <h1 className={styles.title}>Setează o parolă nouă</h1>
          <p className={styles.subtitle}>Alege o parolă sigură pentru contul tău.</p>
        </div>

        {done ? (
          <p style={{ textAlign: 'center', fontSize: '15px', color: 'var(--color-success, #166534)', lineHeight: 1.6 }}>
            ✅ Parola a fost schimbată! Te redirecționăm către autentificare...
          </p>
        ) : (
          <>
            {error && <div className={styles.error}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Parolă nouă</label>
                <input className={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="Minim 8 caractere" autoComplete="new-password" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Confirmă parola</label>
                <input className={styles.input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Se salvează...' : 'Salvează parola nouă'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
