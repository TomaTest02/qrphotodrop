import { NextResponse } from 'next/server';
import { sendContactForm } from '@/lib/resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { cleanMultiline, cleanSingleLine, isValidEmail } from '@/lib/textSecurity';

const EVENT_TYPES = new Set(['Nuntă', 'Botez', 'Aniversare', 'Corporate', 'Altul']);

export async function POST(request) {
  try {
    const body = await request.json();
    const firstName = cleanSingleLine(body?.firstName, 100);
    const lastName = cleanSingleLine(body?.lastName ?? '', 100);
    const email = cleanSingleLine(body?.email, 254);
    const phone = cleanSingleLine(body?.phone ?? '', 40);
    const eventType = cleanSingleLine(body?.eventType ?? '', 50);
    const message = cleanMultiline(body?.message, 2000);

    if (!firstName || !email || !message || lastName === null || phone === null || !EVENT_TYPES.has(eventType)) {
      return NextResponse.json({ error: 'Date invalide sau câmpuri prea lungi.' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Email invalid.' }, { status: 400 });
    }

    // Salvăm MEREU în DB (adminul citește cererile de aici); emailul e best-effort după.
    const admin = createAdminClient();
    const { error: dbErr } = await admin.from('contact_messages').insert({
      first_name: firstName,
      last_name: lastName,
      email,
      phone,
      event_type: eventType,
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
