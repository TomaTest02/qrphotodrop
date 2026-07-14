import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { cleanUserStorage, scheduleStorageRecheck } from '@/lib/accountDeletion';

export const runtime = 'nodejs';

// Ștergere cont self-service (GDPR — dreptul la ștergere), REZISTENTĂ la erori.
// Ordinea e critică: curățăm R2 COMPLET și CONFIRMAT înainte de a atinge Auth/DB.
// Dacă R2 eșuează, ne oprim și NU răspundem success — cheile rămân în DB pentru retry
// (o reapelare reia curățarea), deci nu pierdem referințele.
export async function POST(request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  if (origin !== requestOrigin || request.headers.get('sec-fetch-site') === 'cross-site') {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Confirmare invalidă' }, { status: 400 });
  }
  if (body?.confirmation !== 'STERGE') {
    return NextResponse.json({ error: 'Confirmarea ștergerii lipsește.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Adminii nu se pot șterge singuri de aici (evită lockout accidental al proprietarului)
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single();
  if (profile?.role === 'admin') {
    return NextResponse.json({ error: 'Conturile de administrator nu pot fi șterse de aici.' }, { status: 403 });
  }

  try {
    const eventIds = await cleanUserStorage(admin, user.id, 'account delete');
    await scheduleStorageRecheck(admin, user.id, eventIds);
  } catch (error) {
    console.error('account delete: cleanup failed', error);
    return NextResponse.json(
      { error: 'Curățarea fișierelor a eșuat. Contul nu a fost șters; te rugăm reîncearcă.' },
      { status: 500 },
    );
  }

  // Abia acum ștergem contul auth → cascade ON DELETE în Postgres.
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
