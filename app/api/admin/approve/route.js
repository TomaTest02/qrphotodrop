import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId } = await request.json();
    const admin = createAdminClient();

    // Get user
    const { data: targetUser } = await admin.from('users').select('*').eq('id', userId).single();
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Activăm contul
    await admin.from('users').update({
      status: 'active',
    }).eq('id', userId);

    // Creăm automat evenimentul din comanda făcută la înregistrare (dacă există și
    // nu are deja un eveniment). Pachetul + data fixate la signup → QR + retenție.
    const { data: existingEvent } = await admin.from('events').select('id').eq('user_id', userId).maybeSingle();
    if (!existingEvent && targetUser.requested_package_tier) {
      const { randomBytes } = await import('node:crypto');
      const STORAGE_LIMITS = { intim: 75, complet: 150, vis: 200 };
      const ALLOWED_TYPES = ['nunta', 'botez', 'aniversare', 'corporate'];
      const tier = targetUser.requested_package_tier;
      const evType = ALLOWED_TYPES.includes(targetUser.requested_event_type) ? targetUser.requested_event_type : 'nunta';
      await admin.from('events').insert({
        user_id: userId,
        event_code: randomBytes(4).toString('hex').toUpperCase(),
        event_name: targetUser.requested_event_name || 'Eveniment',
        event_type: evType,
        event_date: targetUser.requested_event_date || new Date().toISOString(),
        status: 'active',
        max_storage_bytes: (STORAGE_LIMITS[tier] || 75) * 1024 * 1024 * 1024,
        package_type: evType,
        package_tier: tier,
      });
    }

    // Try to send notification email (graceful — won't crash if Resend not configured)
    try {
      if (process.env.RESEND_API_KEY) {
        const { sendAdminNotification } = await import('@/lib/resend');
        await sendAdminNotification(
          `Cont aprobat: ${targetUser.email}`,
          `<p>Contul <strong>${targetUser.email}</strong> a fost aprobat cu succes.</p>`
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
