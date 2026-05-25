import { NextResponse } from 'next/server';
import { sendContactForm } from '@/lib/resend';

export async function POST(request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, phone, eventType, message } = body;

    if (!firstName || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await sendContactForm({ firstName, lastName, email, phone, eventType, message });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
