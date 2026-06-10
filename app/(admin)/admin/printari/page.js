import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import styles from '../conturi/conturi.module.css';

export const dynamic = 'force-dynamic';

async function markAsResolved(id) {
  'use server';

  // Verificare autentificare și rol admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error('Forbidden');

  // Actualizare status
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  await adminSupabase
    .from('contact_messages')
    .update({ event_type: 'Comandă Printare (Rezolvată)' })
    .eq('id', id);

  revalidatePath('/admin/printari');
}

export default async function PrintariPage() {
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Obținem toate cererile de printare din tabela contact_messages
  const { data: requests } = await supabase
    .from('contact_messages')
    .select('*')
    .in('event_type', ['Comandă Printare', 'Comandă Printare (Rezolvată)'])
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
              <th className={styles.th}>Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {(!requests || requests.length === 0) ? (
              <tr>
                <td colSpan="6" className={styles.empty}>
                  Nu există nicio cerere de printare înregistrată momentan.
                </td>
              </tr>
            ) : (
              requests.map((req) => {
                const messageLines = req.message.split('\n');
                const eventLine = messageLines.find(l => l.startsWith('Eveniment:')) || 'Eveniment: Nespecificat';
                const designLine = messageLines.find(l => l.startsWith('Design:')) || 'Design: Nespecificat';
                const textLine = messageLines.find(l => l.startsWith('Text:')) || 'Text: Fără text';
                const isResolved = req.event_type.includes('Rezolvată');

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
                        &ldquo;{textLine.replace('Text: ', '')}&rdquo;
                      </div>
                    </td>
                    <td className={styles.td}>
                      <span className={isResolved ? styles.statusActive : styles.statusPending} style={isResolved ? {} : { background: 'var(--color-violet-pale)', color: 'var(--color-violet)' }}>
                        {isResolved ? 'Rezolvată' : 'Nouă'}
                      </span>
                    </td>
                    <td className={styles.td}>
                      {!isResolved && (
                        <div className={styles.actionsGroup}>
                          <form action={markAsResolved.bind(null, req.id)}>
                            <button type="submit" className={`${styles.actionBtn} ${styles.btnSuccess}`}>
                              Marchează
                            </button>
                          </form>
                        </div>
                      )}
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
