import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { deleteByPrefix, prefixIsEmpty, abortMultipartUpload } from '@/lib/r2';

export const runtime = 'nodejs';

// Ștergere cont self-service (GDPR — dreptul la ștergere), REZISTENTĂ la erori.
// Ordinea e critică: curățăm R2 COMPLET și CONFIRMAT înainte de a atinge Auth/DB.
// Dacă R2 eșuează, ne oprim și NU răspundem success — cheile rămân în DB pentru retry
// (o reapelare reia curățarea), deci nu pierdem referințele.
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

  const { data: events } = await admin.from('events').select('id').eq('user_id', user.id);
  const eventIds = (events || []).map((e) => e.id);
  const prefixes = eventIds.flatMap((id) => [`events/${id}/`, `archives/${id}/`]);

  // 1. Oprim sesiunile multipart active (altfel rămân bucăți incomplete în R2)
  if (eventIds.length) {
    const { data: sessions } = await admin
      .from('multipart_sessions')
      .select('r2_key, upload_id, status')
      .in('event_id', eventIds);
    for (const s of sessions || []) {
      if (['pending', 'uploading'].includes(s.status) && s.r2_key && s.upload_id) {
        await abortMultipartUpload(s.r2_key, s.upload_id).catch(() => {});
      }
    }
  }

  // 2. Ștergem TOT din R2 (media + arhive + orfani). La orice eroare → oprim, fără success.
  for (const prefix of prefixes) {
    try {
      await deleteByPrefix(prefix);
    } catch (e) {
      console.error('account delete: R2 cleanup failed', prefix, e.message);
      return NextResponse.json({ error: 'Curățarea fișierelor a eșuat. Te rugăm reîncearcă.' }, { status: 500 });
    }
  }

  // 3. Confirmăm că prefixele sunt goale ÎNAINTE de a șterge contul
  for (const prefix of prefixes) {
    const empty = await prefixIsEmpty(prefix).catch(() => false);
    if (!empty) {
      console.error('account delete: prefix not empty after cleanup', prefix);
      return NextResponse.json({ error: 'Curățarea fișierelor nu s-a confirmat. Te rugăm reîncearcă.' }, { status: 500 });
    }
  }

  // 4. Abia acum ștergem contul auth → cascade ON DELETE în Postgres
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error('account delete: auth deleteUser failed', delErr.message);
    return NextResponse.json({ error: 'Ștergerea contului a eșuat. Încearcă din nou.' }, { status: 500 });
  }
  // plasă de siguranță dacă rândul public.users nu a fost prins de cascade
  await admin.from('users').delete().eq('id', user.id);

  console.log(`[account] user ${user.id} și-a șters contul (R2 confirmat curat).`);
  return NextResponse.json({ success: true });
}
