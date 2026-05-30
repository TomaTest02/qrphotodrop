import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import styles from '../conturi/conturi.module.css';

export const dynamic = 'force-dynamic';

export default async function PrintariPage() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Obținem toate cererile de printare din tabela contact_messages
  const { data: requests, error } = await supabase
    .from('contact_messages')
    .select('*')
    .eq('event_type', 'Comandă Printare')
    .order('created_at', { ascending: false });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Comenzi Printare Cartonașe</h1>
        <p className={styles.subtitle}>Toate cererile de printare generate din platformă</p>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Dată Cerere</th>
              <th className={styles.th}>Organizator</th>
              <th className={styles.th}>Eveniment / Design</th>
              <th className={styles.th}>Text Cartonaș</th>
              <th className={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(!requests || requests.length === 0) ? (
              <tr>
                <td colSpan="5" className={styles.empty}>
                  Nu există nicio cerere de printare înregistrată momentan.
                </td>
              </tr>
            ) : (
              requests.map((req) => {
                const messageLines = req.message.split('\n');
                const eventLine = messageLines.find(l => l.startsWith('Eveniment:')) || 'Eveniment: Nespecificat';
                const designLine = messageLines.find(l => l.startsWith('Design:')) || 'Design: Nespecificat';
                const textLine = messageLines.find(l => l.startsWith('Text:')) || 'Text: Fără text';
                
                return (
                  <tr key={req.id}>
                    <td className={styles.td}>{new Date(req.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className={styles.td}>
                      <strong>{req.first_name} {req.last_name !== 'Printare' ? req.last_name : ''}</strong><br/>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{req.email}</span><br/>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{req.phone || 'Fără telefon'}</span>
                    </td>
                    <td className={styles.td}>
                      <strong>{eventLine.replace('Eveniment: ', '')}</strong><br/>
                      <span style={{ fontSize: '13px', color: 'var(--color-burgundy)' }}>{designLine.replace('Design: ', '')}</span>
                    </td>
                    <td className={styles.td} style={{ maxWidth: '300px' }}>
                      <div style={{ padding: '10px', background: 'var(--color-cream)', borderRadius: '6px', fontSize: '13px', fontStyle: 'italic', border: '1px solid var(--color-cream-darker)' }}>
                        "{textLine.replace('Text: ', '')}"
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={styles.statusPending} style={{ background: 'var(--color-violet-pale)', color: 'var(--color-violet)' }}>
                        Cerere Nouă
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
