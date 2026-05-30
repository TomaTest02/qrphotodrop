import { NextResponse } from 'next/server';
import { sendContactForm } from '@/lib/resend';

export async function POST(request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, eventType, message } = body;

    if (!firstName || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (process.env.RESEND_API_KEY) {
      await sendContactForm({ firstName, lastName, email, phone, eventType, message });
    } else {
      console.log('--- RESEND NOT CONFIGURED. MOCKING EMAIL ---');
      console.log(`From: ${firstName} ${lastName} (${email}) - ${phone}`);
      console.log(`Type: ${eventType}`);
      console.log(`Message: ${message}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
