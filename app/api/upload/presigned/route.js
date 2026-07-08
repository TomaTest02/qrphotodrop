import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPresignedUploadUrl } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const { eventCode, contentType, fileType, sizeBytes = 0 } = await request.json();

    if (!eventCode || !contentType) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Security: whitelist MIME strict — blocăm SVG (poate executa JS) și orice non-media
    const ALLOWED_MIME = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mov',
    ];
    if (!ALLOWED_MIME.includes(contentType)) {
      return NextResponse.json({ error: 'Tip de fișier nepermis' }, { status: 415 });
    }

    // Verify event exists and is active
    const supabase = createAdminClient();
    const { data: event } = await supabase
      .from('events')
      .select('id, status, max_storage_bytes')
      .eq('event_code', eventCode)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status !== 'active') {
      return NextResponse.json({ error: 'Event is not active' }, { status: 403 });
    }

    // Check storage limits
    const { data: uploadStats } = await supabase
      .from('uploads')
      .select('size_bytes')
      .eq('event_id', event.id);

    const totalUsed = uploadStats ? uploadStats.reduce((acc, curr) => acc + (curr.size_bytes || 0), 0) : 0;
    
    if (totalUsed + sizeBytes > event.max_storage_bytes) {
      return NextResponse.json({ error: 'Storage limit exceeded for this event' }, { status: 403 });
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
