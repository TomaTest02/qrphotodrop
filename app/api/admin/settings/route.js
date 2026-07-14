import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getSettings, SETTINGS_DEFAULTS, BOOL_KEYS, NUMERIC_BOUNDS } from '@/lib/settings';

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('users').select('role, status').eq('id', user.id).single();
  if (profile?.role !== 'admin' || profile.status !== 'active') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { admin: createAdminClient() };
}

export async function GET() {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  const settings = await getSettings(admin);

  // Stocarea totală curentă (pentru pragul de alertă) — din view-ul agregat
  let storageUsedGb = 0;
  const { data: rows } = await admin.from('admin_account_overview').select('storage_used');
  if (rows) {
    const bytes = rows.reduce((s, r) => s + Number(r.storage_used || 0), 0);
    storageUsedGb = +(bytes / (1024 ** 3)).toFixed(2);
  }

  return NextResponse.json({ settings, storageUsedGb });
}

export async function PUT(request) {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const updates = body && typeof body === 'object' ? body : {};

  const rows = [];
  const stamp = new Date().toISOString();
  for (const [key, raw] of Object.entries(updates)) {
    if (!(key in SETTINGS_DEFAULTS)) continue; // whitelist strict — ignorăm chei necunoscute
    let value;
    if (BOOL_KEYS.includes(key)) {
      value = raw === true || raw === 'true' ? 'true' : 'false';
    } else if (NUMERIC_BOUNDS[key]) {
      const n = Number(raw);
      const [min, max] = NUMERIC_BOUNDS[key];
      if (!Number.isFinite(n) || n < min || n > max) {
        return NextResponse.json({ error: `Valoare invalidă pentru ${key} (permis ${min}–${max})` }, { status: 400 });
      }
      value = String(Math.round(n));
    } else {
      value = String(raw);
    }
    rows.push({ key, value, updated_at: stamp });
  }

  if (rows.length) {
    const { error: upErr } = await admin.from('app_settings').upsert(rows, { onConflict: 'key' });
    if (upErr) {
      console.error('settings update error:', upErr);
      return NextResponse.json({ error: 'Eroare la salvare' }, { status: 500 });
    }
  }

  const settings = await getSettings(admin);
  return NextResponse.json({ settings });
}
