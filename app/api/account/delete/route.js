import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { deleteByPrefix } from '@/lib/r2';

export const runtime = 'nodejs';

// Ștergere cont self-service (GDPR — dreptul la ștergere).
// Șterge întâi fișierele din R2, apoi contul auth (care cascadează în DB:
// users → events → uploads/wishes/archives). Ordinea contează: dacă am șterge
// întâi DB-ul, am pierde id-urile evenimentelor necesare pentru curățarea R2.
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Adminii nu se pot șterge singuri de aici (evită lockout accidental al proprietarului)
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single();
  if (profile?.role === 'admin') {
    return NextResponse.json({ error: 'Conturile de administrator nu pot fi șterse de aici.' }, { status: 403 });
  }

  // 1. Fișierele din R2 pentru toate evenimentele userului
  const { data: events } = await admin.from('events').select('id').eq('user_id', user.id);
  const r2Errors = [];
  for (const ev of events || []) {
    try {
      await deleteByPrefix(`events/${ev.id}/`);
    } catch (e) {
      console.error('account delete: R2 cleanup failed for event', ev.id, e.message);
      r2Errors.push(ev.id);
    }
  }

  // 2. Contul auth → cascade ON DELETE în Postgres (users/events/uploads/wishes/archives)
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error('account delete: auth deleteUser failed', delErr.message);
    return NextResponse.json({ error: 'Ștergerea contului a eșuat. Încearcă din nou.' }, { status: 500 });
  }
  // plasă de siguranță dacă rândul public.users nu a fost prins de cascade
  await admin.from('users').delete().eq('id', user.id);

  console.log(`[account] user ${user.id} și-a șters contul (R2 errors: ${r2Errors.length})`);
  return NextResponse.json({ success: true });
}
