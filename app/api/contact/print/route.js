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
