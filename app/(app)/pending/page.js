'use client';

import { ArrowLeft, Clock } from '@phosphor-icons/react';
import styles from './pending.module.css';

export default function PendingPage() {
  return (
    <div className={styles.page}>
      <a href="/" className={styles.backButton}>
        <ArrowLeft size={20} /> Înapoi la site
      </a>
      <div className={styles.card}>
        <div className={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <Clock size={48} color="var(--color-violet)" />
          </div>
          <h1 className={styles.title}>Cont în așteptare</h1>
          <p className={styles.subtitle} style={{ marginTop: '16px', fontSize: '16px', lineHeight: '1.6' }}>
            Cererea ta de creare a contului a fost înregistrată cu succes.
            <br /><br />
            Pentru a menține siguranța platformei, toate conturile noi necesită aprobare manuală din partea echipei noastre. 
            <br /><br />
            Vei primi un email pe adresa furnizată imediat ce contul tău este activat.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px' }}>
          <a href="/login" className={styles.submitBtn} style={{ textDecoration: 'none', display: 'inline-block', width: '100%' }}>
            Mergi la Autentificare
          </a>
        </div>
      </div>
    </div>
  );
}
