import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { deleteByPrefix } from '@/lib/r2';

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
  const admin = createAdminClient();

  // Întâi curățăm fișierele din R2 pentru toate evenimentele userului (altfel rămân orfane)
  const { data: events } = await admin.from('events').select('id').eq('user_id', userId);
  for (const ev of events || []) {
    try {
      await deleteByPrefix(`events/${ev.id}/`);
    } catch (e) {
      console.error('admin delete: R2 cleanup failed for event', ev.id, e.message);
    }
  }

  // Delete from auth (cascade ON DELETE curăță users/events/uploads/wishes/archives)
  await admin.auth.admin.deleteUser(userId);

  // Plasă de siguranță pentru rândul din users
  await admin.from('users').delete().eq('id', userId);

  return NextResponse.json({ success: true });
}
