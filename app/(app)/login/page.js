'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from '@phosphor-icons/react';
import styles from './login.module.css';

// Redirect în funcție de profil (rol / status / must_change_password)
async function routeUser(supabase, userId) {
  const { data: profile } = await supabase
    .from('users')
    .select('must_change_password, role, status')
    .eq('id', userId)
    .single();

  if (profile?.status === 'pending') {
    await supabase.auth.signOut();
    window.location.href = '/pending';
  } else if (profile?.must_change_password) {
    window.location.href = '/first-login';
  } else if (profile?.role === 'admin') {
    window.location.href = '/admin';
  } else {
    window.location.href = '/dashboard/evenimentul-meu';
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true); // verificăm dacă e deja logat

  // Dacă userul e DEJA logat, îl ducem direct în aplicație (nu-l ținem pe /login)
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser()
      .then(({ data: { user } }) => {
        if (user) routeUser(supabase, user.id);
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Email sau parolă incorectă.');
      setLoading(false);
      return;
    }
    await routeUser(supabase, data.user.id);
  };

  if (checking) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.logo}>QRPhotoDrop</span>
            <p className={styles.subtitle}>Se verifică sesiunea...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <a href="/" className={styles.backButton}>
        <ArrowLeft size={20} /> Înapoi la site
      </a>
      <div className={styles.card}>
        <div className={styles.header}>
          <a href="/" className={styles.logo}>QRPhotoDrop</a>
          <h1 className={styles.title}>Contul tău</h1>
          <p className={styles.subtitle}>Autentifică-te pentru a accesa dashboard-ul</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Parolă</label>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Se autentifică...' : 'Autentifică-te'}
          </button>
        </form>

        <p className={styles.helpText}>
          Nu ai cont? <a href="/register" className={styles.helpLink}>Creează unul aici</a>
        </p>
        <p className={styles.helpText} style={{ marginTop: '10px' }}>
          Ai uitat parola? <a href="/forgot-password" className={styles.helpLink}>Resetează parola</a>
        </p>
      </div>
    </div>
  );
}
