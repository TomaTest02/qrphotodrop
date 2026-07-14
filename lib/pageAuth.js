import 'server-only';

import { redirect } from 'next/navigation';
import { createAdminClient } from './supabase/admin.js';
import { createClient } from './supabase/server.js';

export async function requireActiveAdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin' || profile.status !== 'active') redirect('/');

  return { user, admin };
}

export async function requireActiveUserPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await createAdminClient()
    .from('users')
    .select('role, status')
    .eq('id', user.id)
    .single();
  if (profile?.status !== 'active') redirect('/pending');
  if (profile.role === 'admin') redirect('/admin');

  return { user, profile };
}
