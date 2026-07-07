import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Transformă un nume în slug URL-safe: „Mariana Events" → „mariana-events"
// Normalizează diacriticele românești (ă, â, î, ș, ț).
function slugify(str) {
  return String(str || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { admin: createAdminClient() };
}

// GET → lista plannerilor cu statistici (conturi aduse, plătite, venit, comision)
export async function GET() {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  const { data: planners, error: pErr } = await admin
    .from('wedding_planners')
    .select('*')
    .order('created_at', { ascending: false });
  if (pErr) {
    console.error('planners list error:', pErr);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Conturile atribuite (doar câmpurile necesare agregării)
  const { data: accounts } = await admin
    .from('admin_account_overview')
    .select('referred_by, amount_paid, payment_status');

  const stats = {};
  for (const a of accounts || []) {
    if (!a.referred_by) continue;
    const s = stats[a.referred_by] || { accountCount: 0, paidCount: 0, revenue: 0 };
    s.accountCount += 1;
    if (a.payment_status === 'paid') {
      s.paidCount += 1;
      s.revenue += Number(a.amount_paid || 0);
    }
    stats[a.referred_by] = s;
  }

  const enriched = (planners || []).map((p) => {
    const s = stats[p.id] || { accountCount: 0, paidCount: 0, revenue: 0 };
    return {
      ...p,
      accountCount: s.accountCount,
      paidCount: s.paidCount,
      revenue: s.revenue,                                        // RON încasați (conturi plătite)
      commission: Math.round(s.revenue * Number(p.commission_rate || 0)), // RON de plată către planner
    };
  });

  return NextResponse.json({ planners: enriched });
}

// POST → creează un planner nou (slug generat din nume, unic)
export async function POST(request) {
  const { admin, error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const name = String(body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Numele este obligatoriu.' }, { status: 400 });

  // Comision: primit ca procent (ex 15) → stocat ca fracție (0.15)
  let rate = 0.15;
  if (body.commissionPct !== undefined && body.commissionPct !== '') {
    const pct = Number(body.commissionPct);
    if (Number.isNaN(pct) || pct < 0 || pct > 100) {
      return NextResponse.json({ error: 'Comision invalid (0–100%).' }, { status: 400 });
    }
    rate = pct / 100;
  }

  // Slug unic: pornim de la nume, adăugăm -2, -3… dacă e ocupat
  const base = slugify(name) || 'planner';
  let slug = base;
  for (let i = 2; i < 50; i++) {
    const { data: existing } = await admin.from('wedding_planners').select('id').eq('slug', slug).maybeSingle();
    if (!existing) break;
    slug = `${base}-${i}`;
  }

  const { data: created, error: insErr } = await admin
    .from('wedding_planners')
    .insert({
      name,
      slug,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      commission_rate: rate,
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();

  if (insErr) {
    console.error('planner create error:', insErr);
    return NextResponse.json({ error: 'Eroare la creare planner.' }, { status: 500 });
  }

  return NextResponse.json({ planner: created });
}
