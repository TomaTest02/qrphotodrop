'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from '@phosphor-icons/react';
import styles from '../login/login.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) {
      setError('A apărut o eroare. Verifică adresa de email și încearcă din nou.');
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className={styles.page}>
      <a href="/login" className={styles.backButton}><ArrowLeft size={20} /> Înapoi la autentificare</a>
      <div className={styles.card}>
        <div className={styles.header}>
          <a href="/" className={styles.logo}>QRPhotoDrop</a>
          <h1 className={styles.title}>Ai uitat parola?</h1>
          <p className={styles.subtitle}>Îți trimitem un link de resetare pe email.</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <p style={{ fontSize: '15px', color: 'var(--color-text)', lineHeight: 1.6 }}>
              ✅ Dacă există un cont cu adresa <strong>{email}</strong>, ai primit un email cu un link de resetare a parolei.
              <br /><br />
              Verifică și folderul Spam.
            </p>
            <a href="/login" className={styles.submitBtn} style={{ textDecoration: 'none', display: 'inline-block', marginTop: '20px' }}>
              Mergi la autentificare
            </a>
          </div>
        ) : (
          <>
            {error && <div className={styles.error}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="adresa@email.com" autoComplete="email" />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? 'Se trimite...' : 'Trimite linkul de resetare'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
