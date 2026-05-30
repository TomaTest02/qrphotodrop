'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from 'lucide-react';
import styles from './register.module.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Parolele nu se potrivesc.');
      return;
    }

    if (password.length < 6) {
      setError('Parola trebuie să aibă minim 6 caractere.');
      return;
    }

    setLoading(true);

    // Citim daca a ales o subscriptie in prealabil
    const params = new URLSearchParams(window.location.search);
    const plan = params.get('plan');
    const type = params.get('type');

    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone: phone,
          plan: plan || null,
          plan_type: type || null
        }
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('Acest email este deja înregistrat. Te rugăm să te autentifici.');
      } else {
        setError('A apărut o eroare la înregistrare. Încearcă din nou.');
      }
      setLoading(false);
      return;
    }

    // Redirect to dashboard (sau pending daca implementezi validarea admin)
    window.location.href = '/dashboard';
  };

  return (
    <div className={styles.page}>
      <a href="/" className={styles.backButton}>
        <ArrowLeft size={20} /> Înapoi la site
      </a>
      <div className={styles.card}>
        <div className={styles.header}>
          <a href="/" className={styles.logo}>QRPhotoDrop</a>
          <h1 className={styles.title}>Creează cont</h1>
          <p className={styles.subtitle}>Înregistrează-te pentru a primi acces ca organizator</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Nume complet</label>
            <input
              className={styles.input}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ex: Popescu Ion"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="adresa@email.com"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Telefon</label>
            <input
              className={styles.input}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="07XX XXX XXX"
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
              minLength={6}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Confirmă parola</label>
            <input
              className={styles.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? 'Se creează contul...' : 'Trimite cererea'}
          </button>
        </form>

        <p className={styles.helpText}>
          Ai deja cont? <a href="/login" className={styles.helpLink}>Autentifică-te aici</a>
        </p>
      </div>
    </div>
  );
}
