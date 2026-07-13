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
      .select('id, status')
      .eq('event_code', eventCode)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Nu acceptăm urări noi pe evenimente expirate/inactive (altfel introducem date
    // personale după cleanup, care n-ar mai fi șterse — vezi retenția GDPR).
    if (event.status !== 'active') {
      return NextResponse.json({ error: 'Evenimentul nu mai este activ.' }, { status: 403 });
    }

    // RPC-ul blochează rândul evenimentului; cronul nu poate șterge urările și apoi
    // să apară o urare nouă dintr-o cerere care verificase statusul mai devreme.
    const { data, error } = await supabase
      .rpc('insert_wish_if_event_active', {
        p_event_id: event.id,
        p_first_name: firstName,
        p_last_name: lastName || '',
        p_email: email || null,
        p_message: message,
      })
      .single();

    if (error) {
      console.error('Wish insert error:', error);
      if (error.message?.includes('EVENT_NOT_ACTIVE')) {
        return NextResponse.json({ error: 'Evenimentul nu mai este activ.' }, { status: 410 });
      }
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ wish: data });
  } catch (err) {
    console.error('Wish error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
