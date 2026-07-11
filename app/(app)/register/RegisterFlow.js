'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from '@phosphor-icons/react';
import PricingCard from '@/components/marketing/PricingCard';
import styles from './register.module.css';

// ── Pachete (sursă unică pentru înregistrare) ───────────────────
const TIER_STORAGE = { intim: 75, complet: 150, vis: 200 };
const TIER_DURATION = { intim: '1 lună', complet: '2 luni', vis: '3 luni' };
const tierFeatures = (tier) => {
  const list = [
    'Album digital pentru eveniment',
    'Cod QR unic pentru acces',
    'Încărcare poze de către invitați',
    'Încărcare urări de către invitați',
    'Încărcare clipuri video de până la 1.5 GB fiecare',
    `Spațiu de stocare: ${TIER_STORAGE[tier]} GB`,
    `Disponibilitate după eveniment: ${TIER_DURATION[tier]}`,
  ];
  // Toate pachetele: printare & plastifiere carduri QR contra cost (preț în funcție de nr. de carduri)
  list.push('Opțional (contra cost): printare și plastifiere carduri QR — preț în funcție de numărul de carduri');
  return list;
};
const PACKAGES = {
  nunta: [
    { key: 'intim', name: 'Basic', price: 27900, subLabel: 'până în 100 invitați', features: tierFeatures('intim') },
    { key: 'complet', name: 'Standard', price: 39900, subLabel: 'până în 250 invitați', popular: true, features: tierFeatures('complet') },
    { key: 'vis', name: 'Premium', price: 64900, subLabel: 'până în 500 invitați', features: tierFeatures('vis') },
  ],
  botez: [
    { key: 'intim', name: 'Basic', price: 27900, subLabel: 'până în 50 invitați', features: tierFeatures('intim') },
    { key: 'complet', name: 'Standard', price: 39900, subLabel: 'până în 150 invitați', popular: true, features: tierFeatures('complet') },
    { key: 'vis', name: 'Premium', price: 64900, subLabel: 'până în 300 invitați', features: tierFeatures('vis') },
  ],
  aniversare: [
    { key: 'intim', name: 'Basic', price: 27900, subLabel: 'până în 50 invitați', features: tierFeatures('intim') },
    { key: 'complet', name: 'Standard', price: 39900, subLabel: 'până în 150 invitați', popular: true, features: tierFeatures('complet') },
    { key: 'vis', name: 'Premium', price: 64900, subLabel: 'până în 300 invitați', features: tierFeatures('vis') },
  ],
  corporate: [
    { key: 'intim', name: 'Basic', price: 27900, subLabel: 'până în 100 invitați', features: tierFeatures('intim') },
    { key: 'complet', name: 'Standard', price: 39900, subLabel: 'până în 300 invitați', popular: true, features: tierFeatures('complet') },
    { key: 'vis', name: 'Premium', price: 64900, subLabel: 'până în 600 invitați', features: tierFeatures('vis') },
  ],
};
const TABS = [
  { key: 'nunta', label: 'Nuntă' },
  { key: 'botez', label: 'Botez' },
  { key: 'aniversare', label: 'Aniversare' },
  { key: 'corporate', label: 'Corporate' },
];

// referrerSlug / plannerName vin din link-ul de recomandare /register/<slug>.
// Când sunt setate, contul nou primește users.referred_by = plannerul respectiv
// (rezolvat de trigger-ul handle_new_user din metadata referrer_slug).
export default function RegisterFlow({ referrerSlug = null, plannerName = null }) {
  const [step, setStep] = useState(1);
  const [eventType, setEventType] = useState('nunta');
  const [plan, setPlan] = useState(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referrerName, setReferrerName] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const choosePlan = (p) => { setPlan(p); setStep(2); };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!plan) { setError('Alege un pachet.'); setStep(1); return; }
    if (!eventDate) { setError('Completează data evenimentului.'); return; }
    if (password !== confirmPassword) { setError('Parolele nu se potrivesc.'); return; }
    if (password.length < 6) { setError('Parola trebuie să aibă minim 6 caractere.'); return; }
    if (!acceptedTerms) { setError('Trebuie să accepți Termenii și Condițiile pentru a continua.'); return; }

    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone,
          event_name: eventName,
          event_type: eventType,
          package_tier: plan.key,
          event_date: eventDate,
          // Recomandare wedding planner (dacă înregistrarea vine printr-un link /register/<slug>)
          ...(referrerSlug ? { referrer_slug: referrerSlug } : {}),
          // Metodă de rezervă: numele scris manual (doar dacă NU a venit prin link)
          ...(!referrerSlug && referrerName.trim() ? { referrer_name: referrerName.trim() } : {}),
        },
      },
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

    // Cont nou = pending (aprobare manuală). Deconectăm și trimitem la /pending.
    await supabase.auth.signOut();
    window.location.href = '/pending';
  };

  // ── Banner recomandare (afișat în ambele pași dacă avem planner) ─
  const referralBanner = plannerName ? (
    <div style={{
      background: 'var(--color-violet-pale)', color: 'var(--color-violet)',
      borderRadius: '999px', padding: '8px 18px', fontSize: '14px', fontWeight: 600,
      display: 'inline-block', margin: '0 auto 16px',
    }}>
      💫 Recomandat de {plannerName}
    </div>
  ) : null;

  // ── PASUL 1: alege pachetul ───────────────────────────────────
  if (step === 1) {
    return (
      <div className={styles.page} style={{ alignItems: 'flex-start', paddingTop: '40px', paddingBottom: '60px' }}>
        <a href="/" className={styles.backButton}><ArrowLeft size={20} /> Înapoi la site</a>
        <div style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
          <div className={styles.header} style={{ textAlign: 'center' }}>
            <a href="/" className={styles.logo}>QRPhotoDrop</a>
            {referralBanner && <div style={{ textAlign: 'center' }}>{referralBanner}</div>}
            <h1 className={styles.title}>Alege pachetul</h1>
            <p className={styles.subtitle}>Selectează tipul evenimentului și pachetul potrivit. Plata o confirmi cu echipa după înregistrare.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', margin: '24px 0' }}>
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => { setEventType(t.key); setPlan(null); }}
                style={{
                  padding: '10px 20px', borderRadius: '999px', border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontFamily: 'var(--font-sans)', fontSize: '14px',
                  background: eventType === t.key ? 'var(--color-violet)' : '#fff',
                  color: eventType === t.key ? '#fff' : 'var(--color-text-muted)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {PACKAGES[eventType].map((p) => (
              <PricingCard
                key={p.key}
                name={p.name}
                price={p.price}
                subLabel={p.subLabel}
                features={p.features}
                isPopular={p.popular}
                buttonText="Alege acest pachet →"
                onSelect={() => choosePlan(p)}
              />
            ))}
          </div>

          <p className={styles.helpText} style={{ textAlign: 'center', marginTop: '24px' }}>
            Ai deja cont? <a href="/login" className={styles.helpLink}>Autentifică-te aici</a>
          </p>
        </div>
      </div>
    );
  }

  // ── PASUL 2: detalii cont + eveniment ─────────────────────────
  return (
    <div className={styles.page}>
      <button onClick={() => setStep(1)} className={styles.backButton} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
        <ArrowLeft size={20} /> Schimbă pachetul
      </button>
      <div className={styles.card}>
        <div className={styles.header}>
          <a href="/" className={styles.logo}>QRPhotoDrop</a>
          {referralBanner}
          <h1 className={styles.title}>Detalii cont</h1>
          <p className={styles.subtitle}>
            Pachet ales: <strong>{TABS.find((t) => t.key === eventType)?.label} {plan?.name}</strong> — {Math.round((plan?.price || 0) / 100)} RON
          </p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleRegister} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Nume complet</label>
            <input className={styles.input} type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ex: Popescu Ion" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Numele evenimentului</label>
            <input className={styles.input} type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required placeholder="Ex: Nunta Ana & Mihai" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Data evenimentului</label>
            <input className={styles.input} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="adresa@email.com" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Telefon</label>
            <input className={styles.input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="07XX XXX XXX" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Parolă</label>
            <input className={styles.input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Confirmă parola</label>
            <input className={styles.input} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
          </div>
          {!referrerSlug && (
            <div className={styles.field}>
              <label className={styles.label}>Ai fost recomandat de un wedding planner? <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>(opțional)</span></label>
              <input className={styles.input} type="text" value={referrerName} onChange={(e) => setReferrerName(e.target.value)} placeholder="Ex: Mariana Events" />
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '14px', lineHeight: 1.55, cursor: 'pointer', margin: '2px 0 4px' }}>
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              style={{ marginTop: '3px', width: '18px', height: '18px', flexShrink: 0, cursor: 'pointer' }}
            />
            <span>
              Am citit și accept{' '}
              <a href="/termeni" target="_blank" rel="noopener noreferrer" className={styles.helpLink}>
                Termenii și Condițiile
              </a>{' '}
              și înțeleg că serviciul este furnizat „ca atare", pe propriul meu risc.
            </span>
          </label>
          <button type="submit" className={styles.submitBtn} disabled={loading || !acceptedTerms}>
            {loading ? 'Se trimite cererea...' : 'Trimite cererea'}
          </button>
        </form>

        <p className={styles.helpText}>
          Ai deja cont? <a href="/login" className={styles.helpLink}>Autentifică-te aici</a>
        </p>
      </div>
    </div>
  );
}
