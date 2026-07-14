import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { generateEventCode } from '@/lib/securityGuards';
import { escapeHtml } from '@/lib/textSecurity';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role, status').eq('id', user.id).single();
    if (profile?.role !== 'admin' || profile.status !== 'active') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId } = await request.json();
    if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    const admin = createAdminClient();

    // Get user
    const { data: targetUser, error: targetError } = await admin.from('users').select('*').eq('id', userId).single();
    if (targetError && targetError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Creăm automat evenimentul din comanda făcută la înregistrare (dacă există și
    // nu are deja un eveniment). Evenimentul se creează ÎNAINTE de activarea contului,
    // ca un insert eșuat să nu lase contul activ fără QR/eveniment.
    const { data: existingEvent, error: existingError } = await admin.from('events').select('id').eq('user_id', userId).maybeSingle();
    if (existingError) return NextResponse.json({ error: 'Database error' }, { status: 500 });
    let createdEventId = null;
    if (!existingEvent && targetUser.requested_package_tier) {
      const STORAGE_LIMITS = { intim: 75, complet: 150, vis: 200 };
      const ALLOWED_TYPES = ['nunta', 'botez', 'aniversare', 'corporate'];
      const tier = STORAGE_LIMITS[targetUser.requested_package_tier] ? targetUser.requested_package_tier : 'intim';
      const evType = ALLOWED_TYPES.includes(targetUser.requested_event_type) ? targetUser.requested_event_type : 'nunta';
      const { data: createdEvent, error: eventError } = await admin.from('events').insert({
        user_id: userId,
        event_code: generateEventCode(),
        event_name: targetUser.requested_event_name || 'Eveniment',
        event_type: evType,
        event_date: targetUser.requested_event_date || new Date().toISOString(),
        status: 'active',
        max_storage_bytes: (STORAGE_LIMITS[tier] || 75) * 1024 * 1024 * 1024,
        package_type: evType,
        package_tier: tier,
      }).select('id').single();
      if (eventError) {
        console.error('Approve event insert error:', eventError);
        return NextResponse.json({ error: 'Evenimentul nu a putut fi creat; contul nu a fost activat.' }, { status: 500 });
      }
      createdEventId = createdEvent.id;
    }

    const { error: activationError } = await admin.from('users').update({ status: 'active' }).eq('id', userId);
    if (activationError) {
      if (createdEventId) {
        const { error: rollbackError } = await admin.from('events').delete().eq('id', createdEventId);
        if (rollbackError) console.error('Approve event rollback error:', createdEventId, rollbackError);
      }
      console.error('Approve activation error:', activationError);
      return NextResponse.json({ error: 'Contul nu a putut fi activat.' }, { status: 500 });
    }

    // Try to send notification email (graceful — won't crash if Resend not configured)
    try {
      if (process.env.RESEND_API_KEY) {
        const { sendAccountApproved, sendAdminNotification } = await import('@/lib/resend');
        await sendAccountApproved(targetUser.email);          // email către cuplu: contul e activ + link login
        await sendAdminNotification(
          `Cont aprobat: ${targetUser.email}`,
          `<p>Contul <strong>${escapeHtml(targetUser.email)}</strong> a fost aprobat cu succes.</p>`
        );
      }
    } catch (emailErr) {
      console.warn('Email notification skipped (Resend not configured):', emailErr.message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Approve error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
