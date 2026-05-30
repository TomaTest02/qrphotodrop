import { NextResponse } from 'next/server';
import { sendContactForm } from '@/lib/resend';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, phone, name, eventName, design, cardText } = body;

    if (!email || !design || !cardText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const message = `
=========================================
CERERE NOUĂ DE PRINTARE CARTONAȘE
=========================================

Detalii Organizator:
Nume: ${name || 'Nespecificat'}
Email: ${email}
Telefon: ${phone || 'Nespecificat'}
Eveniment: ${eventName || 'Nespecificat'}

Detalii Printare:
Design Ales: ${design}
Text Personalizat: "${cardText}"

=========================================
    `;

    // Initialize supabase client (we need to bypass RLS using service role since this is an API route)
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Salvează în baza de date pentru Admin Dashboard
    await supabase.from('contact_messages').insert({
      first_name: name || 'Cerere',
      last_name: 'Printare',
      email: email,
      phone: phone || '',
      event_type: 'Comandă Printare',
      message: `Eveniment: ${eventName || 'Nespecificat'}\nDesign: ${design}\nText: ${cardText}`
    });

    if (process.env.RESEND_API_KEY) {
      await sendContactForm({
        firstName: 'Cerere',
        lastName: 'Printare',
        email: email,
        phone: phone || '',
        eventType: 'Comandă Printare',
        message: message
      });
    } else {
      console.log('--- RESEND NOT CONFIGURED. MOCKING EMAIL ---');
      console.log(message);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Print request error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
