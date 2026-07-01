import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Returnează toate pozele unui eveniment (după cod) pentru proiecția live / slideshow.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (!code || !/^[a-zA-Z0-9]{6,12}$/.test(code)) {
    return NextResponse.json({ error: 'Cod invalid' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from('events')
    .select('id, event_name, event_date')
    .eq('event_code', code)
    .single();

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, public_url')
    .eq('event_id', event.id)
    .eq('file_type', 'photo')
    .order('created_at', { ascending: false });

  return NextResponse.json({
    event: { event_name: event.event_name, event_date: event.event_date },
    photos: (uploads || []).filter((u) => u.public_url),
  });
}
