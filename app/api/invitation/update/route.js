import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
    }

    const { eventId, details } = await request.json();

    if (!eventId || !details) {
      return NextResponse.json({ error: 'Date invalide' }, { status: 400 });
    }

    // Update the event with the new invitation_details JSONB
    const { error } = await supabase
      .from('events')
      .update({ invitation_details: details })
      .eq('id', eventId)
      .eq('user_id', user.id); // Ensure the user owns this event

    if (error) {
      console.error('Eroare la salvarea invitației:', error);
      return NextResponse.json({ error: 'Eroare la baza de date' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Eroare de server' }, { status: 500 });
  }
}
