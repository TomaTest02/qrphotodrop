import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { generateEventCode } from '@/lib/securityGuards';
import { getAdminRoster, guardAdminTarget } from '@/lib/adminRoles';

const ALLOWED_EVENT_TYPES = ['nunta', 'botez', 'aniversare', 'corporate'];
const ALLOWED_PAYMENT = ['unpaid', 'partial', 'paid'];
const STORAGE_BY_TIER = { intim: 75, complet: 150, vis: 200 };

function validatePayment(payment) {
  if (payment === undefined) return null;
  if (typeof payment !== 'object' || payment === null || Array.isArray(payment)) return 'Date plată invalide';
  if (payment.amount_paid !== undefined) {
    const amount = Number(payment.amount_paid);
    if (!Number.isSafeInteger(amount) || amount < 0) return 'Sumă invalidă';
  }
  if (payment.payment_status !== undefined && !ALLOWED_PAYMENT.includes(payment.payment_status)) {
    return 'Stare plată invalidă';
  }
  return null;
}

function validateEventData(eventData) {
  if (eventData === undefined || eventData === null) return null;
  if (typeof eventData !== 'object' || Array.isArray(eventData)) return 'Date eveniment invalide';
  const { event_name, event_type, event_date, couple_names, location, package_tier, package_type, expires_at } = eventData;
  if (event_name !== undefined && (typeof event_name !== 'string' || !event_name.trim() || event_name.length > 200)) return 'Nume eveniment invalid';
  if (event_type !== undefined && !ALLOWED_EVENT_TYPES.includes(event_type)) return 'Tip eveniment invalid';
  if (package_type !== undefined && !ALLOWED_EVENT_TYPES.includes(package_type)) return 'Tip pachet invalid';
  if (package_tier !== undefined && !STORAGE_BY_TIER[package_tier]) return 'Nivel pachet invalid';
  if (event_date !== undefined && (typeof event_date !== 'string' || Number.isNaN(Date.parse(event_date)))) return 'Dată eveniment invalidă';
  if (expires_at !== undefined && expires_at !== null && expires_at !== ''
      && (typeof expires_at !== 'string' || Number.isNaN(Date.parse(expires_at)))) return 'Dată expirare invalidă';
  if (couple_names !== undefined && (typeof couple_names !== 'string' || couple_names.length > 200)) return 'Nume cuplu invalid';
  if (location !== undefined && (typeof location !== 'string' || location.length > 300)) return 'Locație invalidă';
  return null;
}

export async function GET(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role, status').eq('id', user.id).single();
    if (profile?.role !== 'admin' || profile.status !== 'active') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    const admin = createAdminClient();

    const { data: userData, error: userError } = await admin.from('users').select('*').eq('id', id).single();
    if (userError) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: eventData } = await admin.from('events').select('*').eq('user_id', id).single();

    // Get auth email + last sign in
    const { data: authData } = await admin.auth.admin.getUserById(id);

    // Statistici agregate (poze/clipuri/urări/RSVP/stocare) din view
    const { data: stats } = await admin
      .from('admin_account_overview')
      .select('photo_count, video_count, storage_used, wish_count')
      .eq('id', id)
      .maybeSingle();

    return NextResponse.json({
      user: {
        ...userData,
        email: authData?.user?.email,
        last_sign_in_at: authData?.user?.last_sign_in_at || null,
      },
      event: eventData || null,
      stats: stats || null,
    });
  } catch (err) {
    console.error('Error fetching account details:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role, status').eq('id', user.id).single();
    if (profile?.role !== 'admin' || profile.status !== 'active') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    const admin = createAdminClient();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
    }

    const { phone, newPassword, eventData, status, payment, referredBy } = body;

    if (phone !== undefined && (typeof phone !== 'string' || phone.length > 40)) {
      return NextResponse.json({ error: 'Telefon invalid' }, { status: 400 });
    }
    if (newPassword !== undefined && newPassword !== ''
        && (typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128)) {
      return NextResponse.json({ error: 'Parola trebuie să aibă 8–128 caractere.' }, { status: 400 });
    }
    if (status !== undefined && !['pending', 'active', 'suspended'].includes(status)) {
      return NextResponse.json({ error: 'Status invalid' }, { status: 400 });
    }
    const paymentValidationError = validatePayment(payment);
    if (paymentValidationError) return NextResponse.json({ error: paymentValidationError }, { status: 400 });
    const eventValidationError = validateEventData(eventData);
    if (eventValidationError) return NextResponse.json({ error: eventValidationError }, { status: 400 });
    if (referredBy !== undefined && referredBy
        && (typeof referredBy !== 'string' || !/^[0-9a-f-]{36}$/i.test(referredBy))) {
      return NextResponse.json({ error: 'Planner invalid' }, { status: 400 });
    }

    let resolvedRefId;
    if (referredBy !== undefined) {
      resolvedRefId = null;
      if (referredBy) {
        const { data: planner, error: plannerError } = await admin
          .from('wedding_planners')
          .select('id')
          .eq('id', referredBy)
          .maybeSingle();
        if (plannerError) throw new Error('PLANNER_LOOKUP_FAILED');
        if (!planner) return NextResponse.json({ error: 'Planner inexistent' }, { status: 400 });
        resolvedRefId = planner.id;
      }
    }

    // Protecție admin: nu poți modifica alt administrator decât dacă ești owner/manager;
    // proprietarul e intangibil pentru alții; suspendarea sau resetarea parolei unui
    // admin sunt acțiuni destructive (fără auto-acțiune / fără proprietar / minim 1 admin).
    const destructive = status === 'suspended' || !!newPassword;
    const roster = await getAdminRoster(admin);
    const block = guardAdminTarget({ actorId: user.id, targetId: id, roster, destructive });
    if (block) return NextResponse.json({ error: block.error }, { status: block.status });

    // 1. Update phone in public.users
    if (phone !== undefined) {
      const { error } = await admin.from('users').update({ phone }).eq('id', id);
      if (error) throw new Error('PHONE_UPDATE_FAILED');
    }

    // 1a. Atribuire wedding planner (referredBy = id planner sau '' / null pentru a scoate)
    if (referredBy !== undefined) {
      const { error } = await admin.from('users').update({ referred_by: resolvedRefId }).eq('id', id);
      if (error) throw new Error('PLANNER_UPDATE_FAILED');
    }

    // 1b. Update status (active / suspended / pending)
    if (status !== undefined) {
      // ATOMIC: userul ȘI evenimentul se schimbă în ACEEAȘI tranzacție (RPC).
      // Înainte erau două update-uri separate → dacă al doilea eșua, userul apărea
      // suspendat dar evenimentul rămânea activ, iar invitații puteau încărca.
      // La suspendare se opresc doar evenimentele ACTIVE; la reactivare repornesc
      // DOAR cele oprite din cauza suspendării. Evenimentele `expired` nu se ating.
      const { error: stErr } = await admin.rpc('set_user_status', {
        p_user_id: id,
        p_status: status,
      });
      if (stErr) throw stErr;
    }

    // 2. Update password if provided
    if (newPassword) {
      const { error: passError } = await admin.auth.admin.updateUserById(id, { password: newPassword });
      if (passError) throw passError;
    }

    // 2b. Update payment info on the user's event
    if (payment) {
      const payPayload = {};
      if (payment.amount_paid !== undefined) {
        payPayload.amount_paid = Number(payment.amount_paid);
      }
      if (payment.payment_status !== undefined) {
        payPayload.payment_status = payment.payment_status;
        payPayload.paid_at = payment.payment_status === 'paid' ? new Date().toISOString() : null;
      }
      if (Object.keys(payPayload).length > 0) {
        const { error } = await admin.from('events').update(payPayload).eq('user_id', id);
        if (error) throw new Error('PAYMENT_UPDATE_FAILED');
      }
    }

    // 3. Update event if provided
    if (eventData) {
      const { event_name, event_type, event_date, couple_names, location, package_tier, package_type, expires_at } = eventData;

      const updatePayload = {};
      if (event_name !== undefined) updatePayload.event_name = event_name.trim();
      if (event_type !== undefined) updatePayload.event_type = event_type;
      if (event_date !== undefined) updatePayload.event_date = event_date;
      if (couple_names !== undefined) updatePayload.couple_names = couple_names;
      if (location !== undefined) updatePayload.location = location;
      if (package_tier !== undefined) {
        updatePayload.package_tier = package_tier;
        // Recalculăm stocarea conform nivelului ales (Basic/Standard/Premium = 75/150/200 GB)
        updatePayload.max_storage_bytes = STORAGE_BY_TIER[package_tier] * 1024 * 1024 * 1024;
      }
      if (package_type !== undefined) updatePayload.package_type = package_type;
      if (expires_at !== undefined) updatePayload.expires_at = expires_at || null;

      if (Object.keys(updatePayload).length > 0) {
        const { data: existingEvent, error: existingError } = await admin.from('events').select('id').eq('user_id', id).maybeSingle();
        if (existingError) throw new Error('EVENT_LOOKUP_FAILED');
        if (existingEvent) {
          const { error } = await admin.from('events').update(updatePayload).eq('user_id', id);
          if (error) throw new Error('EVENT_UPDATE_FAILED');
        } else {
          // Creăm evenimentul cu toate câmpurile obligatorii (event_code, event_type, status, stocare)
          const tier = updatePayload.package_tier || 'complet';
          const evType = ALLOWED_EVENT_TYPES.includes(updatePayload.event_type) ? updatePayload.event_type : 'nunta';
          const { error } = await admin.from('events').insert({
            user_id: id,
            event_code: generateEventCode(),
            event_name: updatePayload.event_name || 'Eveniment',
            event_type: evType,
            event_date: updatePayload.event_date || new Date().toISOString(),
            couple_names: updatePayload.couple_names || null,
            location: updatePayload.location || null,
            status: 'active',
            max_storage_bytes: STORAGE_BY_TIER[tier] * 1024 * 1024 * 1024,
            package_type: updatePayload.package_type || evType,
            package_tier: tier,
            expires_at: updatePayload.expires_at || null,
          });
          if (error) throw new Error('EVENT_INSERT_FAILED');
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating account:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
