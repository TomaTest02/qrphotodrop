'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './first-login.module.css';

export default function FirstLoginPage() {
  const [step, setStep] = useState(1);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Parola trebuie să aibă minim 8 caractere.');
      return;
    }
    if (!/\d/.test(newPassword)) {
      setError('Parola trebuie să conțină cel puțin o cifră.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Parolele nu coincid.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError('Eroare la schimbarea parolei. Încearcă din nou.');
      setLoading(false);
      return;
    }

    // Update must_change_password
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('users').update({ must_change_password: false }).eq('id', user.id);
    }

    setLoading(false);
    window.location.href = '/dashboard/evenimentul-meu';
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <p className={styles.brand}>QRPhotoDrop</p>
          <h1 className={styles.title}>Bine ai venit!</h1>
          <p className={styles.subtitle}>
            Te rugăm să schimbi parola temporară.
          </p>
        </div>

        {/* Step indicator */}
        <div className={styles.stepIndicator}>
          <div className={`${styles.stepLine} ${styles.stepLineActive}`} />
          <div className={`${styles.stepLine} ${step >= 2 ? styles.stepLineActive : ''}`} />
        </div>

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className={styles.form}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Parolă nouă
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
              placeholder="Min. 8 caractere, cel puțin o cifră"
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Confirmă parola
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={styles.submitBtn}
          >
            {loading ? 'Se procesează...' : 'Salvează parola nouă'}
          </button>
        </form>
      </div>
    </div>
  );
}
