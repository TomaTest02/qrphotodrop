import { NextResponse } from 'next/server';
import { sendContactForm } from '@/lib/resend';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, eventType, message } = body;

    if (!firstName || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Salvăm MEREU în DB (adminul citește cererile de aici); emailul e best-effort după.
    const admin = createAdminClient();
    const { error: dbErr } = await admin.from('contact_messages').insert({
      first_name: firstName,
      last_name: lastName || '',
      email,
      phone: phone || '',
      event_type: eventType || '',
      message,
    });
    if (dbErr) {
      console.error('Contact insert error:', dbErr);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    if (process.env.RESEND_API_KEY) {
      try {
        await sendContactForm({ firstName, lastName, email, phone, eventType, message });
      } catch (mailErr) {
        console.error('Contact email skipped:', mailErr?.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
