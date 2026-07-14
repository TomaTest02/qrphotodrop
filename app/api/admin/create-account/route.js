import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { generateEventCode } from '@/lib/securityGuards';

const STORAGE_LIMITS = { intim: 75, complet: 150, vis: 200 };
const ALLOWED_TYPES = ['nunta', 'botez', 'aniversare', 'corporate'];
const ALLOWED_TIERS = ['intim', 'complet', 'vis'];

export async function POST(request) {
  try {
    // Verificare admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { email, password, phone, eventName, eventType, packageTier, eventDate, referredBy } = body;

    if (!email || !password || password.length < 6) {
      return NextResponse.json({ error: 'Email și parolă (min 6 caractere) obligatorii.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(eventType)) return NextResponse.json({ error: 'Tip eveniment invalid' }, { status: 400 });
    if (!ALLOWED_TIERS.includes(packageTier)) return NextResponse.json({ error: 'Nivel pachet invalid' }, { status: 400 });
    if (!eventName || !eventDate || isNaN(Date.parse(eventDate))) {
      return NextResponse.json({ error: 'Nume și dată eveniment valide obligatorii.' }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Creăm userul în Auth (confirmat, fără email de verificare)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { phone: phone || null },
    });
    if (createErr) {
      const msg = createErr.message?.includes('already') ? 'Există deja un cont cu acest email.' : createErr.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const newUserId = created.user.id;

    // 2. Marcăm contul activ (triggerul l-a creat ca pending) + telefon
    //    + atribuire opțională către un wedding planner (dacă e valid și activ)
    const userUpdate = { status: 'active', phone: phone || null };
    if (referredBy) {
      const { data: planner } = await admin.from('wedding_planners').select('id').eq('id', referredBy).maybeSingle();
      if (planner) userUpdate.referred_by = planner.id;
    }
    await admin.from('users').update(userUpdate).eq('id', newUserId);

    // 3. Creăm evenimentul cu pachet + dată + cod QR + stocare
    await admin.from('events').insert({
      user_id: newUserId,
      event_code: generateEventCode(),
      event_name: eventName.trim(),
      event_type: eventType,
      event_date: eventDate,
      status: 'active',
      max_storage_bytes: (STORAGE_LIMITS[packageTier] || 75) * 1024 * 1024 * 1024,
      package_type: eventType,
      package_tier: packageTier,
    });

    return NextResponse.json({ success: true, userId: newUserId });
  } catch (err) {
    console.error('create-account error:', err);
    return NextResponse.json({ error: 'Eroare la creare cont' }, { status: 500 });
  }
}
