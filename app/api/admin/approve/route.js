import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

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

    // Update user status to active
    await admin.from('users').update({
      status: 'active',
    }).eq('id', userId);

    // Create event for user (if they don't have one yet)
    const eventCode = uuidv4().slice(0, 8).toUpperCase();
    await admin.from('events').upsert({
      user_id: userId,
      event_code: eventCode,
      event_name: targetUser.event_name || 'Eveniment',
      event_type: targetUser.event_type || 'nunta',
      event_date: targetUser.event_date || new Date().toISOString(),
      status: 'active',
    }, { onConflict: 'user_id' });

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

    return NextResponse.json({ success: true, eventCode });
  } catch (err) {
    console.error('Approve error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
