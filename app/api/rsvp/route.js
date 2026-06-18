import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// We use the service role key to insert RSVPs because the public users are not authenticated
export async function POST(request) {
  try {
    const { eventId, guestName, status, guestsCount, dietaryRequirements } = await request.json();

    if (!eventId || !guestName || !status) {
      return NextResponse.json({ error: 'Toate câmpurile obligatorii trebuie completate.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabaseAdmin
      .from('rsvps')
      .insert([
        {
          event_id: eventId,
          guest_name: guestName,
          status: status, // 'attending' or 'declined'
          guests_count: guestsCount || 1,
          dietary_requirements: dietaryRequirements || ''
        }
      ]);

    if (error) {
      console.error('Eroare la inserarea RSVP:', error);
      return NextResponse.json({ error: 'Eroare la baza de date' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Eroare de server' }, { status: 500 });
  }
}
