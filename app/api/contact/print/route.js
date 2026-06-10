import { NextResponse } from 'next/server';
import { sendContactForm } from '@/lib/resend';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_DESIGNS = ['Classic Burgundy', 'Cream Elegant', 'Gold Minimalist'];

export async function POST(request) {
  try {
    // Verificare autentificare — doar utilizatorii logați pot trimite cereri de printare
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Trebuie să fii autentificat pentru a trimite o cerere de printare.' }, { status: 401 });
    }

    const body = await request.json();
    const { email, phone, name, eventName, design, cardText } = body;

    // Validare câmpuri obligatorii
    if (!email || !design || !cardText) {
      return NextResponse.json({ error: 'Câmpuri obligatorii lipsă.' }, { status: 400 });
    }

    // Validare design (whitelist — previne injecție de conținut)
    if (!ALLOWED_DESIGNS.includes(design)) {
      return NextResponse.json({ error: 'Design invalid.' }, { status: 400 });
    }

    // Validare lungimi
    if (cardText.length > 500) {
      return NextResponse.json({ error: 'Textul cartonașului este prea lung (max 500 caractere).' }, { status: 400 });
    }
    if (name && name.length > 200) {
      return NextResponse.json({ error: 'Numele este prea lung.' }, { status: 400 });
    }
    if (eventName && eventName.length > 200) {
      return NextResponse.json({ error: 'Numele evenimentului este prea lung.' }, { status: 400 });
    }

    // Validare format email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Format email invalid.' }, { status: 400 });
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

    // Salvează în baza de date pentru Admin Dashboard (folosim ES import, nu require)
    const admin = createAdminClient();
    await admin.from('contact_messages').insert({
      first_name: name || 'Cerere',
      last_name: 'Printare',
      email: email,
      phone: phone || '',
      event_type: 'Comandă Printare',
      message: `Eveniment: ${eventName || 'Nespecificat'}\nDesign: ${design}\nText: ${cardText}`,
    });

    if (process.env.RESEND_API_KEY) {
      await sendContactForm({
        firstName: 'Cerere',
        lastName: 'Printare',
        email: email,
        phone: phone || '',
        eventType: 'Comandă Printare',
        message: message,
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
