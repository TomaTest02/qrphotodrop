import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { deleteByPrefix, prefixIsEmpty, abortMultipartUpload } from '@/lib/r2';
import { getAdminRoster, guardAdminTarget } from '@/lib/adminRoles';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify admin
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const admin = createAdminClient();

  // View-ul agregă tot: profil + eveniment + stocare folosită + nr poze/clipuri/urări/RSVP
  const { data: accounts, error } = await admin
    .from('admin_account_overview')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('admin_account_overview error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Atașăm ultima autentificare din Supabase Auth (nu există în tabelul public.users)
  let lastSignInMap = {};
  try {
    const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const au of authData?.users || []) {
      lastSignInMap[au.id] = au.last_sign_in_at || null;
    }
  } catch (e) {
    console.warn('listUsers failed (last_sign_in indisponibil):', e.message);
  }

  const enriched = (accounts || []).map((a) => ({
    ...a,
    last_sign_in_at: lastSignInMap[a.id] || null,
  }));

  return NextResponse.json({ accounts: enriched });
}

export async function DELETE(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await request.json();
  if (!userId) return NextResponse.json({ error: 'userId lipsă' }, { status: 400 });
  const admin = createAdminClient();

  // Protecție admin: proprietarul intangibil, fără auto-ștergere, minim 1 admin.
  // (Dacă ținta e un cont obișnuit, garda permite — munca normală de admin.)
  const roster = await getAdminRoster(admin);
  const block = guardAdminTarget({ actorId: user.id, targetId: userId, roster, destructive: true });
  if (block) return NextResponse.json({ error: block.error }, { status: block.status });

  // Curățare R2 REZISTENTĂ la erori (la fel ca ștergerea self-service):
  // abort multipart → ambele prefixe → confirmăm gol → abia apoi Auth/DB.
  const { data: events } = await admin.from('events').select('id').eq('user_id', userId);
  const eventIds = (events || []).map((e) => e.id);
  const prefixes = eventIds.flatMap((id) => [`events/${id}/`, `archives/${id}/`]);

  if (eventIds.length) {
    const { data: sessions } = await admin
      .from('multipart_sessions').select('r2_key, upload_id, status').in('event_id', eventIds);
    for (const s of sessions || []) {
      if (['pending', 'uploading'].includes(s.status) && s.r2_key && s.upload_id) {
        await abortMultipartUpload(s.r2_key, s.upload_id).catch(() => {});
      }
    }
  }

  for (const prefix of prefixes) {
    try {
      await deleteByPrefix(prefix);
    } catch (e) {
      console.error('admin delete: R2 cleanup failed', prefix, e.message);
      return NextResponse.json({ error: 'Curățarea fișierelor a eșuat. Reîncearcă.' }, { status: 500 });
    }
  }
  for (const prefix of prefixes) {
    const empty = await prefixIsEmpty(prefix).catch(() => false);
    if (!empty) return NextResponse.json({ error: 'Curățarea fișierelor nu s-a confirmat.' }, { status: 500 });
  }

  // Abia acum ștergem din Auth (cascade ON DELETE curăță users/events/uploads/wishes/archives)
  const { error: authErr } = await admin.auth.admin.deleteUser(userId);
  if (authErr) {
    console.error('admin delete: deleteUser failed', authErr.message);
    return NextResponse.json({ error: 'Ștergerea contului a eșuat.' }, { status: 500 });
  }

  // Plasă de siguranță pentru rândul din users
  await admin.from('users').delete().eq('id', userId);

  return NextResponse.json({ success: true });
}
