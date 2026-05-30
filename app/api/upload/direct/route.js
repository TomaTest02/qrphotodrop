import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { r2Client, getPublicUrl } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const eventCode = formData.get('eventCode');
    const fileType = formData.get('fileType');
    const originalName = formData.get('originalName');

    if (!file || !eventCode) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Validare stricta tip fisier (whitelist MIME)
    const ALLOWED_MIME = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mov'
    ];
    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json({ error: 'Tip de fișier nepermis' }, { status: 400 });
    }

    // Limitam dimensiunea fisierelor in functie de tip:
    // Poze: max 150MB (iPhone 15 Pro Max ProRAW = ~75MB, HEIC normal = 5-15MB)
    // Video: max 2GB (4K 60fps 1min = ~400MB, 5min = ~2GB)
    const isVideo = file.type.startsWith('video/');
    const MAX_PHOTO_SIZE = 150 * 1024 * 1024;   // 150MB
    const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

    const maxAllowed = isVideo ? MAX_VIDEO_SIZE : MAX_PHOTO_SIZE;
    if (file.size > maxAllowed) {
      const limitLabel = isVideo ? '2GB' : '150MB';
      return NextResponse.json({ error: `Fișierul depășește limita de ${limitLabel}` }, { status: 400 });
    }

    // Sanitizare event code (doar alfanumeric)
    const sanitizedEventCode = eventCode.replace(/[^a-zA-Z0-9]/g, '');
    if (sanitizedEventCode !== eventCode || eventCode.length < 6) {
      return NextResponse.json({ error: 'Event code invalid' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificam evenimentul
    const { data: event } = await supabase
      .from('events')
      .select('id, status, max_storage_bytes')
      .eq('event_code', sanitizedEventCode)
      .single();

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (event.status !== 'active') return NextResponse.json({ error: 'Event not active' }, { status: 403 });

    // Verificam storage
    const { data: uploadStats } = await supabase
      .from('uploads')
      .select('size_bytes')
      .eq('event_id', event.id);

    const totalUsed = uploadStats ? uploadStats.reduce((acc, curr) => acc + (curr.size_bytes || 0), 0) : 0;
    const fileSize = file.size;

    if (totalUsed + fileSize > event.max_storage_bytes) {
      return NextResponse.json({ error: 'Storage limit exceeded for this event' }, { status: 403 });
    }

    // Upload direct catre R2 de pe server (fara CORS issues)
    const contentType = file.type;
    const ext = contentType.split('/')[1] || 'bin';
    const folder = fileType === 'video' ? 'videos' : 'photos';
    const r2Key = `events/${event.id}/${folder}/${uuidv4()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: r2Key,
      Body: buffer,
      ContentType: contentType,
    }));

    const publicUrl = getPublicUrl(r2Key);

    // Sanitizam numele original (eliminam caractere periculoase)
    const safeOriginalName = (originalName || file.name || 'upload')
      .replace(/[^a-zA-Z0-9._\-\s]/g, '')
      .substring(0, 255);

    // Salvam in baza de date
    await supabase.from('uploads').insert({
      event_id: event.id,
      file_type: fileType || (file.type.startsWith('video/') ? 'video' : 'photo'),
      original_name: safeOriginalName,
      r2_key: r2Key,
      public_url: publicUrl,
      size_bytes: fileSize,
    });

    return NextResponse.json({ success: true, publicUrl, r2Key });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
