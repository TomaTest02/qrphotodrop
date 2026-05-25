import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sendOTP } from '@/lib/resend';
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

    // Generate temp password
    const tempPassword = uuidv4().slice(0, 12);

    // Create Supabase Auth user (if not already created)
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: targetUser.email,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError && authError.message !== 'User already registered') {
      console.error('Auth create error:', authError);
      return NextResponse.json({ error: 'Auth error' }, { status: 500 });
    }

    const authUserId = authUser?.user?.id || userId;

    // Update user status
    await admin.from('users').update({
      id: authUserId,
      status: 'active',
      must_change_password: true,
    }).eq('id', userId);

    // Create event for user
    const eventCode = uuidv4().slice(0, 8).toUpperCase();
    await admin.from('events').upsert({
      user_id: authUserId,
      event_code: eventCode,
      event_name: targetUser.event_name || 'Eveniment',
      event_type: targetUser.event_type || 'nunta',
      event_date: targetUser.event_date || new Date().toISOString(),
      status: 'active',
    }, { onConflict: 'user_id' });

    // Send OTP email
    await sendOTP(targetUser.email, tempPassword);

    return NextResponse.json({ success: true, eventCode });
  } catch (err) {
    console.error('Approve error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
