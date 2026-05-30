import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  try {
    const { eventCode, firstName, lastName, email, message } = await request.json();

    if (!eventCode || !firstName || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Validare lungimi (prevenire spam / abuse)
    if (firstName.length > 100) return NextResponse.json({ error: 'Prenume prea lung' }, { status: 400 });
    if (lastName && lastName.length > 100) return NextResponse.json({ error: 'Nume prea lung' }, { status: 400 });
    if (message.length > 2000) return NextResponse.json({ error: 'Mesajul este prea lung (max 2000 caractere)' }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email invalid' }, { status: 400 });
    }

    // Sanitizare event code
    if (!/^[a-zA-Z0-9]{6,12}$/.test(eventCode)) {
      return NextResponse.json({ error: 'Event code invalid' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get event
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('event_code', eventCode)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const { data, error } = await supabase.from('wishes').insert({
      event_id: event.id,
      first_name: firstName,
      last_name: lastName || '',
      email: email || null,
      message,
    }).select().single();

    if (error) {
      console.error('Wish insert error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ wish: data });
  } catch (err) {
    console.error('Wish error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
