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
    const { data: targetUser } = await admin.from('users').select('email').eq('id', userId).single();
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Generate new temp password
    const tempPassword = uuidv4().slice(0, 12);

    // Update password in Supabase Auth — verificăm eroarea (altfel eșua pe tăcute)
    const { error: pwErr } = await admin.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });
    if (pwErr) {
      console.error('OTP updateUserById error:', pwErr);
      return NextResponse.json({ error: 'Nu am putut schimba parola: ' + pwErr.message }, { status: 500 });
    }

    // Set must_change_password
    await admin.from('users').update({ must_change_password: true }).eq('id', userId);

    // Trimitem parola temporară pe email (dacă Resend e configurat)
    let emailSent = false;
    try {
      if (process.env.RESEND_API_KEY) {
        const { sendOTP } = await import('@/lib/resend');
        await sendOTP(targetUser.email, tempPassword);
        emailSent = true;
      } else {
        console.warn(`OTP pt ${targetUser.email}: ${tempPassword} (Resend neconfigurat, email netrimis)`);
      }
    } catch (emailErr) {
      console.warn('OTP email skipped:', emailErr.message);
    }

    return NextResponse.json({ success: true, emailSent });
  } catch (err) {
    console.error('OTP error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
