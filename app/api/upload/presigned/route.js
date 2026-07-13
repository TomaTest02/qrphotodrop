import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPresignedUploadUrl, extForMime } from '@/lib/r2';
import { getSettings, uploadsPaused, maxBytesFor } from '@/lib/settings';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const { eventCode, contentType, sizeBytes } = await request.json();

    if (!eventCode || !contentType) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9]{6,12}$/.test(eventCode)) {
      return NextResponse.json({ error: 'Invalid event code' }, { status: 400 });
    }
    const declaredSize = Number(sizeBytes);
    if (!Number.isSafeInteger(declaredSize) || declaredSize <= 0) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
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
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, status, max_storage_bytes')
      .eq('event_code', eventCode)
      .single();

    if (eventError && eventError.code !== 'PGRST116') {
      console.error('presigned: event query failed', eventError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status !== 'active') {
      return NextResponse.json({ error: 'Event is not active', code: 'EVENT_INACTIVE' }, { status: 403 });
    }

    // Setări globale: pauză upload + limită configurabilă de mărime
    const settings = await getSettings(supabase);
    if (uploadsPaused(settings)) {
      return NextResponse.json({ error: 'Încărcările sunt momentan în pauză', code: 'UPLOADS_PAUSED' }, { status: 503 });
    }
    // Tipul e derivat EXCLUSIV din MIME (whitelisted mai sus), nu din client
    const isVideo = contentType.startsWith('video/');
    if (declaredSize > maxBytesFor(settings, isVideo)) {
      return NextResponse.json({ error: 'Fișierul depășește limita permisă' }, { status: 413 });
    }

    // Check storage limits
    const { data: uploadStats, error: usageError } = await supabase
      .from('uploads')
      .select('size_bytes')
      .eq('event_id', event.id);

    if (usageError) {
      console.error('presigned: usage query failed', usageError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const totalUsed = uploadStats ? uploadStats.reduce((acc, curr) => acc + (curr.size_bytes || 0), 0) : 0;
    
    if (totalUsed + declaredSize > event.max_storage_bytes) {
      return NextResponse.json({ error: 'Storage limit exceeded for this event', code: 'STORAGE_FULL' }, { status: 403 });
    }

    // Generate unique key — folder + extensie derivate din MIME (nu din client)
    const ext = extForMime(contentType);
    const folder = isVideo ? 'videos' : 'photos';
    const r2Key = `events/${event.id}/${folder}/${uuidv4()}.${ext}`;

    // Get presigned URL
    const uploadUrl = await getPresignedUploadUrl(r2Key, contentType);

    return NextResponse.json({ uploadUrl, r2Key });
  } catch (err) {
    console.error('Presigned URL error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
