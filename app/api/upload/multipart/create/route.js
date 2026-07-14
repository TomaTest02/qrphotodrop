import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMultipartUpload, abortMultipartUpload, R2_PART_SIZE, extForMime } from '@/lib/r2';
import { getSettings, uploadsPaused, maxBytesFor } from '@/lib/settings';
import { v4 as uuidv4 } from 'uuid';
import { isValidEventCode } from '@/lib/securityGuards';

export const runtime = 'nodejs';

const STORAGE_FULL = 'Storage limit exceeded for this event';
const SESSION_TTL_MS = 6 * 60 * 60 * 1000; // 6 ore
const ALLOWED_MIME = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mov',
];

export async function POST(request) {
  try {
    const { eventCode, contentType, sizeBytes } = await request.json();

    if (!isValidEventCode(eventCode) || !contentType) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!ALLOWED_MIME.includes(contentType)) {
      return NextResponse.json({ error: 'Tip de fișier nepermis' }, { status: 415 });
    }
    // Validare strictă a mărimii declarate (endpoint public — nu avem încredere în client)
    const size = Number(sizeBytes);
    if (!Number.isSafeInteger(size) || size <= 0) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: event } = await supabase
      .from('events')
      .select('id, status')
      .eq('event_code', eventCode)
      .single();

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (event.status !== 'active') return NextResponse.json({ error: 'Event is not active', code: 'EVENT_INACTIVE' }, { status: 403 });

    // Setări globale: pauză upload + limită configurabilă de mărime
    // uploads_paused și limitele de mărime nu sunt expuse rolului public.
    const settings = await getSettings();
    if (uploadsPaused(settings)) {
      return NextResponse.json({ error: 'Încărcările sunt momentan în pauză', code: 'UPLOADS_PAUSED' }, { status: 503 });
    }
    // Tipul îl derivăm din MIME (NU din client)
    const isVideo = contentType.startsWith('video/');
    if (size > maxBytesFor(settings, isVideo)) return NextResponse.json({ error: 'Fișierul depășește limita permisă.' }, { status: 413 });

    const partSize = R2_PART_SIZE;
    const totalParts = Math.max(1, Math.ceil(size / partSize));
    if (totalParts > 10000) return NextResponse.json({ error: 'Fișierul depășește limita permisă.' }, { status: 413 });

    const ext = extForMime(contentType);
    const folder = isVideo ? 'videos' : 'photos';
    const r2Key = `events/${event.id}/${folder}/${uuidv4()}.${ext}`;

    // 1. Deschidem sesiunea multipart în R2
    const uploadId = await createMultipartUpload(r2Key, contentType);

    // 2. Rezervare ATOMICĂ a spațiului + inserare sesiune (pending) în DB.
    //    Funcția blochează rândul evenimentului → uploadurile simultane nu pot depăși plafonul.
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const { data: sessionId, error: rpcErr } = await supabase.rpc('reserve_multipart_session', {
      p_event_id: event.id,
      p_r2_key: r2Key,
      p_upload_id: uploadId,
      p_expected_size: size,
      p_part_size: partSize,
      p_total_parts: totalParts,
      p_expires_at: expiresAt,
    });

    if (rpcErr) {
      await abortMultipartUpload(r2Key, uploadId).catch(() => {});
      console.error('reserve_multipart_session error:', rpcErr);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
    if (!sessionId) {
      // Nu mai e loc (incl. rezervările altor uploaduri în curs) → anulăm sesiunea R2
      await abortMultipartUpload(r2Key, uploadId).catch(() => {});
      return NextResponse.json({ error: STORAGE_FULL, code: 'STORAGE_FULL' }, { status: 403 });
    }

    // Clientul primește DOAR sessionId (neutru) — r2Key/uploadId rămân pe server
    return NextResponse.json({ sessionId, partSize, totalParts });
  } catch (err) {
    console.error('Multipart create error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
