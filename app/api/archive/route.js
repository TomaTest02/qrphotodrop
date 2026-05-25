import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateAndUploadArchive } from '@/lib/archive';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await request.json();

    // Verify ownership
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Generate archive (async — emails when done)
    generateAndUploadArchive(eventId, user.email).catch(err => {
      console.error('Archive generation error:', err);
    });

    return NextResponse.json({
      message: 'Arhiva este în curs de generare. Vei fi notificat pe email.',
    }, { status: 202 });
  } catch (err) {
    console.error('Archive error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
