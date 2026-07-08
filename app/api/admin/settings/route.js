import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { admin: createAdminClient() };
}

export async function GET() {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { data } = await admin.from('app_settings').select('value').eq('key', 'public_gallery_enabled').maybeSingle();
  return NextResponse.json({ publicGalleryEnabled: data ? data.value === 'true' : true });
}

export async function PUT(request) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { publicGalleryEnabled } = await request.json();
  const value = publicGalleryEnabled ? 'true' : 'false';
  const { error: upErr } = await admin
    .from('app_settings')
    .upsert({ key: 'public_gallery_enabled', value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
  if (upErr) {
    console.error('settings update error:', upErr);
    return NextResponse.json({ error: 'Eroare la salvare' }, { status: 500 });
  }
  return NextResponse.json({ publicGalleryEnabled: value === 'true' });
}
