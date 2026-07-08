import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMultipartUpload, getPresignedPartUrl, R2_PART_SIZE } from '@/lib/r2';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_FULL = 'Storage limit exceeded for this event';

// Aceeași whitelist strictă ca la /api/upload/presigned (blocăm SVG etc.)
const ALLOWED_MIME = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mov',
];

export async function POST(request) {
  try {
    const { eventCode, contentType, fileType, sizeBytes = 0 } = await request.json();

    if (!eventCode || !contentType || !sizeBytes) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!ALLOWED_MIME.includes(contentType)) {
      return NextResponse.json({ error: 'Tip de fișier nepermis' }, { status: 415 });
    }

    const supabase = createAdminClient();
    const { data: event } = await supabase
      .from('events')
      .select('id, status, max_storage_bytes')
      .eq('event_code', eventCode)
      .single();

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (event.status !== 'active') return NextResponse.json({ error: 'Event is not active' }, { status: 403 });

    // Plafon per fișier (declarat de client — mărimea reală se verifică la complete)
    const isVideo = fileType === 'video';
    const perFileMax = isVideo ? 1024 * 1024 * 1024 : 20 * 1024 * 1024; // video 1GB / poză 20MB
    if (sizeBytes > perFileMax) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    // Pre-verificare plafon de stocare (declarat)
    const { data: usage } = await supabase.from('uploads').select('size_bytes').eq('event_id', event.id);
    const used = (usage || []).reduce((s, u) => s + (u.size_bytes || 0), 0);
    if (used + sizeBytes > event.max_storage_bytes) {
      return NextResponse.json({ error: STORAGE_FULL }, { status: 403 });
    }

    const ext = contentType.split('/')[1] || 'bin';
    const folder = isVideo ? 'videos' : 'photos';
    const r2Key = `events/${event.id}/${folder}/${uuidv4()}.${ext}`;

    const partSize = R2_PART_SIZE;
    const totalParts = Math.max(1, Math.ceil(sizeBytes / partSize));
    if (totalParts > 10000) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const uploadId = await createMultipartUpload(r2Key, contentType);

    // Semnăm toate URL-urile bucăților dintr-o dată (semnarea e locală, fără rețea)
    const partUrls = [];
    for (let n = 1; n <= totalParts; n++) {
      partUrls.push(await getPresignedPartUrl(r2Key, uploadId, n));
    }

    return NextResponse.json({ uploadId, r2Key, partUrls, partSize });
  } catch (err) {
    console.error('Multipart create error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
