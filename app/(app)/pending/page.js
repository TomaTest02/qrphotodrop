'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Prohibit } from '@phosphor-icons/react';
import styles from './pending.module.css';

export default function PendingPage() {
  // Aceeași pagină servește două stări: cont NOU (în așteptare) și cont SUSPENDAT.
  // Proxy-ul trimite conturile suspendate aici cu ?suspended=1.
  const [suspended, setSuspended] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSuspended(new URLSearchParams(window.location.search).get('suspended') === '1');
    }
  }, []);

  return (
    <div className={styles.page}>
      <a href="/" className={styles.backButton}>
        <ArrowLeft size={20} /> Înapoi la site
      </a>
      <div className={styles.card}>
        <div className={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            {suspended
              ? <Prohibit size={48} color="#dc2626" />
              : <Clock size={48} color="var(--color-violet)" />}
          </div>

          <h1 className={styles.title}>{suspended ? 'Cont suspendat' : 'Cont în așteptare'}</h1>

          {suspended ? (
            <p className={styles.subtitle} style={{ marginTop: '16px', fontSize: '16px', lineHeight: '1.6' }}>
              Accesul la acest cont a fost suspendat.
              <br /><br />
              Dacă vrei să afli motivul sau să ceri reactivarea, scrie-ne la{' '}
              <a href="mailto:qrphotodrop@gmail.com" style={{ color: 'var(--color-violet)' }}>qrphotodrop@gmail.com</a>.
            </p>
          ) : (
            <p className={styles.subtitle} style={{ marginTop: '16px', fontSize: '16px', lineHeight: '1.6' }}>
              Cererea ta de creare a contului a fost înregistrată cu succes.
              <br /><br />
              Pentru a menține siguranța platformei, toate conturile noi necesită aprobare manuală din partea echipei noastre.
              <br /><br />
              Vei primi un email pe adresa furnizată imediat ce contul tău este activat.
            </p>
          )}
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
