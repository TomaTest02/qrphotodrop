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
    const { data: targetUser } = await admin.from('users').select('email').eq('id', userId).single();
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Generate new temp password
    const tempPassword = uuidv4().slice(0, 12);

    // Update password in Supabase Auth
    await admin.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    // Set must_change_password
    await admin.from('users').update({ must_change_password: true }).eq('id', userId);

    // Send OTP email
    await sendOTP(targetUser.email, tempPassword);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('OTP error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
