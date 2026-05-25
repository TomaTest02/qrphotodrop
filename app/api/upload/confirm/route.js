import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicUrl } from '@/lib/r2';

export async function POST(request) {
  try {
    const { r2Key, eventCode, fileType, sizeBytes, originalName } = await request.json();

    if (!r2Key || !eventCode) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get event ID
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('event_code', eventCode)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const publicUrl = getPublicUrl(r2Key);

    // Insert upload record
    const { data, error } = await supabase.from('uploads').insert({
      event_id: event.id,
      r2_key: r2Key,
      public_url: publicUrl,
      file_type: fileType || 'photo',
      size_bytes: sizeBytes || 0,
      original_name: originalName || r2Key.split('/').pop(),
    }).select().single();

    if (error) {
      console.error('Upload confirm error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ upload: data });
  } catch (err) {
    console.error('Confirm error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
