import { createClient } from '@/lib/supabase/server';
import styles from '../conturi/conturi.module.css';

export default async function PrintariPage() {
  const supabase = await createClient();

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

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Dată Cerere</th>
                <th>Organizator</th>
                <th>Eveniment / Design</th>
                <th>Text Cartonaș</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(!requests || requests.length === 0) ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
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
                      <td>{new Date(req.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                      <td>
                        <strong>{req.first_name} {req.last_name !== 'Printare' ? req.last_name : ''}</strong><br/>
                        <span style={{ fontSize: '12px', color: '#666' }}>{req.email}</span><br/>
                        <span style={{ fontSize: '12px', color: '#666' }}>{req.phone || 'Fără telefon'}</span>
                      </td>
                      <td>
                        <strong>{eventLine.replace('Eveniment: ', '')}</strong><br/>
                        <span style={{ fontSize: '13px', color: 'var(--color-burgundy)' }}>{designLine.replace('Design: ', '')}</span>
                      </td>
                      <td style={{ maxWidth: '300px' }}>
                        <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '6px', fontSize: '13px', fontStyle: 'italic' }}>
                          "{textLine.replace('Text: ', '')}"
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: 600, background: 'var(--color-violet-pale)', color: 'var(--color-violet)', borderRadius: '12px' }}>
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
    </div>
  );
}
