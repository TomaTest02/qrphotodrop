'use client';

import { useState } from 'react';
import styles from './contact.module.css';

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.target);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          email: form.get('email'),
          phone: form.get('phone'),
          eventType: form.get('eventType'),
          message: form.get('message'),
        }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Cererea nu a putut fi trimisă.');
      }
      setSent(true);
    } catch (error) {
      alert(error.message || 'Eroare la trimitere. Te rugăm încearcă din nou.');
    }
    setLoading(false);
  };

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>
            Contactează-ne
          </span>
          <h1 className={styles.title}>
            Suntem aici pentru tine
          </h1>
          <p className={styles.subtitle}>
            Scrie-ne și revenim cu un răspuns personalizat cât mai curând.
          </p>
        </div>

        <div className={styles.grid}>
          <div className={styles.formCard}>
            {sent ? (
              <div className={styles.successState}>
                <p className={styles.successIcon}>✓</p>
                <h3 className={styles.successTitle}>Mesaj trimis!</h3>
                <p className={styles.successText}>Revenim în cel mai scurt timp.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Prenume</label>
                    <input name="firstName" required maxLength={100} className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nume</label>
                    <input name="lastName" required maxLength={100} className={styles.input} />
                  </div>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Email *</label>
                  <input name="email" type="email" required maxLength={254} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Telefon</label>
                  <input name="phone" type="tel" maxLength={40} className={styles.input} />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Tip eveniment</label>
                  <select name="eventType" className={styles.select}>
                    <option>Nuntă</option>
                    <option>Botez</option>
                    <option>Aniversare</option>
                    <option>Corporate</option>
                    <option>Altul</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Mesaj *</label>
                  <textarea name="message" required maxLength={2000} rows={5} className={styles.textarea} placeholder="Cum te putem ajuta?" />
                </div>
                <button type="submit" disabled={loading} className={styles.submitBtn}>
                  {loading ? 'Se trimite...' : 'Trimite mesajul'}
                </button>
              </form>
            )}
          </div>

          <div className={styles.sidebar}>
            <div className={styles.infoCard}>
              <h4 className={styles.infoTitle}>Detalii contact</h4>
              <div className={styles.infoList}>
                <div>
                  <p className={styles.infoItemLabel}>Telefon</p>
                  <p className={styles.infoItemValue}>+40 (720) 726 619</p>
                </div>
                <div>
                  <p className={styles.infoItemLabel}>Email</p>
                  <p className={styles.infoItemValue}>qrphotodrop@gmail.com</p>
                </div>
                <div>
                  <p className={styles.infoItemLabel}>Program</p>
                  <p className={styles.infoItemValue}>Luni – Vineri: 9:00 – 18:00</p>
                  <p className={styles.infoItemSub}>Sâmbătă – Duminică: 10:00 – 16:00</p>
                </div>
              </div>
            </div>

            <div className={styles.perksCard}>
              <h4 className={styles.perksTitle}>De ce să ne alegi</h4>
              <div className={styles.perksList}>
                {['Răspuns rapid la întrebări', 'Consultanță personalizată', 'Suport tehnic dedicat', 'Prețuri transparente'].map((item, i) => (
                  <div key={i} className={styles.perkItem}>
                    <span className={styles.perkIcon}>✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
