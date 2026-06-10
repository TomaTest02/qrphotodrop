import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicUrl } from '@/lib/r2';

const ALLOWED_FILE_TYPES = ['photo', 'video'];

export async function POST(request) {
  try {
    const { r2Key, eventCode, fileType, sizeBytes, originalName } = await request.json();

    if (!r2Key || !eventCode) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Validare format r2Key — trebuie să înceapă cu 'events/' pentru a preveni injectarea de chei arbitrare
    if (!r2Key.startsWith('events/') || r2Key.includes('..')) {
      return NextResponse.json({ error: 'Invalid r2Key format' }, { status: 400 });
    }

    // Validare fileType (whitelist)
    if (fileType && !ALLOWED_FILE_TYPES.includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validare sizeBytes (nu acceptăm valori negative sau excesiv de mari)
    if (sizeBytes !== undefined && (sizeBytes < 0 || sizeBytes > 2 * 1024 * 1024 * 1024)) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
    }

    // Sanitizare event code
    if (!/^[a-zA-Z0-9]{6,12}$/.test(eventCode)) {
      return NextResponse.json({ error: 'Invalid event code' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Obținem event ID și verificăm că evenimentul este ACTIV
    const { data: event } = await supabase
      .from('events')
      .select('id, status')
      .eq('event_code', eventCode)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status !== 'active') {
      return NextResponse.json({ error: 'Event is not active' }, { status: 403 });
    }

    // Verificăm că r2Key aparține acestui eveniment (securitate suplimentară)
    if (!r2Key.startsWith(`events/${event.id}/`)) {
      return NextResponse.json({ error: 'r2Key does not belong to this event' }, { status: 403 });
    }

    const publicUrl = getPublicUrl(r2Key);

    // Sanitizare originalName
    const safeOriginalName = (originalName || r2Key.split('/').pop())
      .replace(/[^a-zA-Z0-9._\-\s]/g, '')
      .substring(0, 255);

    // Insert upload record
    const { data, error } = await supabase.from('uploads').insert({
      event_id: event.id,
      r2_key: r2Key,
      public_url: publicUrl,
      file_type: fileType || 'photo',
      size_bytes: sizeBytes || 0,
      original_name: safeOriginalName,
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
