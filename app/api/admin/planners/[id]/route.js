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

// GET → plannerul + tabelul conturilor aduse de el
export async function GET(request, { params }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const { data: planner, error: pErr } = await admin
    .from('wedding_planners').select('*').eq('id', id).single();
  if (pErr || !planner) return NextResponse.json({ error: 'Planner inexistent' }, { status: 404 });

  const { data: accounts } = await admin
    .from('admin_account_overview')
    .select('id, email, phone, status, event_name, event_type, event_date, event_code, package_tier, package_type, amount_paid, payment_status, paid_at, created_at')
    .eq('referred_by', id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ planner, accounts: accounts || [] });
}

// PUT → editează plannerul (slug rămâne fix ca să nu strice link-urile deja distribuite)
export async function PUT(request, { params }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;
  const body = await request.json();

  const payload = {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: 'Numele nu poate fi gol.' }, { status: 400 });
    payload.name = name;
  }
  if (body.email !== undefined) payload.email = body.email?.trim() || null;
  if (body.phone !== undefined) payload.phone = body.phone?.trim() || null;
  if (body.notes !== undefined) payload.notes = body.notes?.trim() || null;
  if (body.active !== undefined) payload.active = !!body.active;
  if (body.commissionPct !== undefined && body.commissionPct !== '') {
    const pct = Number(body.commissionPct);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ error: 'Comision invalid (0–100%).' }, { status: 400 });
    }
    payload.commission_rate = pct / 100;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Nimic de actualizat.' }, { status: 400 });
  }

  const { data: updated, error: upErr } = await admin
    .from('wedding_planners').update(payload).eq('id', id).select().single();
  if (upErr) {
    console.error('planner update error:', upErr);
    return NextResponse.json({ error: 'Eroare la actualizare.' }, { status: 500 });
  }
  return NextResponse.json({ planner: updated });
}

// DELETE → șterge plannerul (users.referred_by devine NULL prin FK ON DELETE SET NULL)
export async function DELETE(request, { params }) {
  const { admin, error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const { error: delErr } = await admin.from('wedding_planners').delete().eq('id', id);
  if (delErr) {
    console.error('planner delete error:', delErr);
    return NextResponse.json({ error: 'Eroare la ștergere.' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
