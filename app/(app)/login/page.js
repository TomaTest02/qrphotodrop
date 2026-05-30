'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from '@phosphor-icons/react';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Email sau parolă incorectă.');
      setLoading(false);
      return;
    }

    // Check user profile status and role
    const { data: profile } = await supabase
      .from('users')
      .select('must_change_password, role, status')
      .eq('id', data.user.id)
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
  };

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
          Ai uitat parola? <a href="/contact" className={styles.helpLink}>Contactează suportul</a>
        </p>
      </div>
    </div>
  );
}
