import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

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

  // Delete from auth
  await admin.auth.admin.deleteUser(userId);

  // Delete from users table
  await admin.from('users').delete().eq('id', userId);

  return NextResponse.json({ success: true });
}
