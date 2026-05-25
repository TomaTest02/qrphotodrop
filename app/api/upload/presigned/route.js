import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPresignedUploadUrl } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const { eventCode, contentType, fileType } = await request.json();

    if (!eventCode || !contentType) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Verify event exists and is active
    const supabase = createAdminClient();
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

    // Generate unique key
    const ext = contentType.split('/')[1] || 'bin';
    const folder = fileType === 'video' ? 'videos' : 'photos';
    const r2Key = `events/${event.id}/${folder}/${uuidv4()}.${ext}`;

    // Get presigned URL
    const uploadUrl = await getPresignedUploadUrl(r2Key, contentType);

    return NextResponse.json({ uploadUrl, r2Key });
  } catch (err) {
    console.error('Presigned URL error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
