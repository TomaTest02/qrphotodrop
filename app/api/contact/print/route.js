import { NextResponse } from 'next/server';
import { sendContactForm } from '@/lib/resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { cleanMultiline, cleanSingleLine } from '@/lib/textSecurity';

const ALLOWED_DESIGNS = ['Boho Pampas', 'Floral Roz', 'Negru & Auriu', 'Auriu Elegant', 'Verde Botanic'];

export async function POST(request) {
  try {
    // Verificare autentificare — doar utilizatorii logați pot trimite cereri de printare
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Trebuie să fii autentificat pentru a trimite o cerere de printare.' }, { status: 401 });
    }

    const body = await request.json();
    const design = cleanSingleLine(body?.design, 50);
    const cardText = cleanMultiline(body?.cardText, 500);

    if (!design || !cardText) {
      return NextResponse.json({ error: 'Câmpuri obligatorii lipsă.' }, { status: 400 });
    }

    // Validare design (whitelist — previne injecție de conținut)
    if (!ALLOWED_DESIGNS.includes(design)) {
      return NextResponse.json({ error: 'Design invalid.' }, { status: 400 });
    }

    // Identitatea nu vine din body: o derivăm exclusiv din sesiune + DB.
    const admin = createAdminClient();
    const [{ data: profile }, { data: event }] = await Promise.all([
      admin.from('users').select('email, phone, status').eq('id', user.id).single(),
      admin.from('events').select('event_name').eq('user_id', user.id).single(),
    ]);
    if (profile?.status !== 'active' || !event) {
      return NextResponse.json({ error: 'Contul sau evenimentul nu este activ.' }, { status: 403 });
    }
    const email = user.email || profile.email;
    const phone = profile.phone || '';
    const name = event.event_name || 'Organizator';
    const eventName = event.event_name || '';

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

    // Salvează în baza de date pentru Admin Dashboard (folosim ES import, nu require)
    const { error: insertError } = await admin.from('contact_messages').insert({
      first_name: name || 'Cerere',
      last_name: 'Printare',
      email: email,
      phone: phone || '',
      event_type: 'Comandă Printare',
      message: `Eveniment: ${eventName || 'Nespecificat'}\nDesign: ${design}\nText: ${cardText}`,
    });
    if (insertError) {
      console.error('Print request insert error:', insertError);
      return NextResponse.json({ error: 'Cererea nu a putut fi salvată.' }, { status: 500 });
    }

    if (process.env.RESEND_API_KEY) {
      await sendContactForm({
        firstName: 'Cerere',
        lastName: 'Printare',
        email: email,
        phone: phone || '',
        eventType: 'Comandă Printare',
        message: message,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Print request error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
