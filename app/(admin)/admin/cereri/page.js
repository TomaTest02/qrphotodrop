import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import styles from '../conturi/conturi.module.css';

export const dynamic = 'force-dynamic';

export default async function CereriPage() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Toate mesajele care NU sunt cereri de printare (contact + upgrade)
  const { data: requests } = await supabase
    .from('contact_messages')
    .select('*')
    .not('event_type', 'in', '("Comandă Printare","Comandă Printare (Rezolvată)")')
    .order('created_at', { ascending: false });

  const isUpgrade = (r) => (r.event_type || '').toLowerCase().includes('upgrade') || (r.message || '').includes('CERERE UPGRADE');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Cereri & mesaje ({requests?.length || 0})</h1>
      </div>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '14px', marginTop: '-12px', marginBottom: '20px' }}>
        Mesaje din formularul de contact și cereri de upgrade/extindere de la organizatori.
      </p>

      <div className={styles.tableCard} style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Dată</th>
              <th className={styles.th}>De la</th>
              <th className={styles.th}>Tip</th>
              <th className={styles.th}>Mesaj</th>
              <th className={styles.th}>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {(!requests || requests.length === 0) ? (
              <tr><td colSpan="5" className={styles.empty}>Nicio cerere sau mesaj momentan.</td></tr>
            ) : (
              requests.map((r) => (
                <tr key={r.id}>
                  <td className={styles.td} style={{ whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className={styles.td}>
                    <div style={{ fontWeight: 600 }}>{r.first_name} {r.last_name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{r.email}</div>
                    {r.phone && <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{r.phone}</div>}
                  </td>
                  <td className={styles.td}>
                    <span className={styles.statusPending} style={isUpgrade(r) ? { background: 'var(--color-violet-pale)', color: 'var(--color-violet)' } : {}}>
                      {isUpgrade(r) ? 'Upgrade' : (r.event_type || 'Contact')}
                    </span>
                  </td>
                  <td className={styles.td} style={{ maxWidth: '420px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--color-text)', whiteSpace: 'pre-wrap' }}>{r.message}</div>
                  </td>
                  <td className={styles.td}>
                    <a href={`mailto:${r.email}`} className={styles.actionBtn} style={{ background: '#3e405b', color: 'white', textDecoration: 'none' }}>Răspunde</a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
