import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getAdminRoster, guardAdminTarget } from '@/lib/adminRoles';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://qrphotodrop.com';

// Resetare parolă declanșată de admin — printr-un RECOVERY LINK Supabase (cu expirare),
// NU prin parolă temporară. Astfel: nu schimbăm parola înainte de a ști că emailul pleacă
// (fără risc de lockout), și nu generăm/logăm/returnăm niciodată o parolă în clar.
export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { userId } = await request.json();
    if (!userId) return NextResponse.json({ error: 'userId lipsă' }, { status: 400 });
    const admin = createAdminClient();

    // Protecție admin: nu reseta parola altui admin decât dacă ești owner/manager;
    // proprietarul nu poate primi reset de la altcineva (acțiune destructivă).
    const roster = await getAdminRoster(admin);
    const block = guardAdminTarget({ actorId: user.id, targetId: userId, roster, destructive: true });
    if (block) return NextResponse.json({ error: block.error }, { status: block.status });

    // Emailul țintă
    const { data: targetUser } = await admin.from('users').select('email').eq('id', userId).single();
    if (!targetUser?.email) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Fără email configurat nu putem livra linkul — și NU logăm credențiale
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'Trimiterea emailului nu este configurată (Resend).' }, { status: 500 });
    }

    // Generăm un recovery link (nu schimbă parola până când userul nu îl folosește)
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: targetUser.email,
      options: { redirectTo: `${APP_URL}/reset-password` },
    });
    if (linkErr || !linkData?.properties?.action_link) {
      console.error('OTP generateLink error:', linkErr?.message);
      return NextResponse.json({ error: 'Nu am putut genera linkul de resetare.' }, { status: 500 });
    }

    // Trimitem linkul pe email. Dacă eșuează → 500 (parola rămâne neschimbată, fără lockout)
    try {
      const { sendPasswordReset } = await import('@/lib/resend');
      await sendPasswordReset(targetUser.email, linkData.properties.action_link);
    } catch (emailErr) {
      console.error('OTP email send failed:', emailErr.message);
      return NextResponse.json({ error: 'Emailul de resetare nu a putut fi trimis.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailSent: true });
  } catch (err) {
    console.error('OTP error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
