import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { r2Client, getPublicUrl, deleteObject, extForMime } from '@/lib/r2';
import { getSettings, uploadsPaused, maxBytesFor } from '@/lib/settings';
import { finalizeUploadRecord, uploadFinalizeError } from '@/lib/uploads';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const eventCode = formData.get('eventCode');
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

    // Tipul fișierului derivat EXCLUSIV din MIME (whitelisted mai sus)
    const isVideo = file.type.startsWith('video/');

    // Plafon STRICT pentru încărcarea directă: fișierul se citește integral în RAM,
    // deci limităm dur (independent de setarea globală, care e pentru calea multipart).
    const DIRECT_MAX_BYTES = 40 * 1024 * 1024; // 40 MB
    if (file.size > DIRECT_MAX_BYTES) {
      return NextResponse.json({ error: 'Fișier prea mare pentru încărcare directă.' }, { status: 413 });
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
      .select('id, status')
      .eq('event_code', sanitizedEventCode)
      .single();

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (event.status !== 'active') return NextResponse.json({ error: 'Event not active' }, { status: 403 });

    // Setări globale: pauză upload + limită configurabilă de mărime
    const settings = await getSettings(supabase);
    if (uploadsPaused(settings)) {
      return NextResponse.json({ error: 'Încărcările sunt momentan în pauză' }, { status: 503 });
    }
    if (file.size > maxBytesFor(settings, isVideo)) {
      return NextResponse.json({ error: 'Fișierul depășește limita permisă' }, { status: 413 });
    }

    const fileSize = file.size;

    // Upload direct catre R2 de pe server (fara CORS issues)
    // Folder + extensie derivate din MIME (nu din client)
    const contentType = file.type;
    const ext = extForMime(contentType);
    const folder = isVideo ? 'videos' : 'photos';
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

    // Finalizarea este atomică față de expirare/ștergere și include plafonul real.
    const { upload, error: finalizeError } = await finalizeUploadRecord(supabase, {
      eventId: event.id,
      fileType: isVideo ? 'video' : 'photo',
      originalName: safeOriginalName,
      r2Key,
      publicUrl,
      sizeBytes: fileSize,
    });
    if (finalizeError) {
      console.error('direct: finalize error, curățăm R2', finalizeError);
      try {
        await deleteObject(r2Key);
      } catch (delErr) {
        console.error('direct: curățarea R2 după finalize eșuat a eșuat', r2Key, delErr.message);
      }
      const responseError = uploadFinalizeError(finalizeError);
      return NextResponse.json({ error: responseError.message }, { status: responseError.status });
    }

    return NextResponse.json({ success: true, upload, publicUrl, r2Key });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Server error: ' + err.message }, { status: 500 });
  }
}
