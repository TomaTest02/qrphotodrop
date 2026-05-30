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

    const supabase = createAdminClient();

    // Verificam evenimentul
    const { data: event } = await supabase
      .from('events')
      .select('id, status, max_storage_bytes')
      .eq('event_code', eventCode)
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

    // Salvam in baza de date
    await supabase.from('uploads').insert({
      event_id: event.id,
      file_type: fileType || (contentType.startsWith('video/') ? 'video' : 'photo'),
      original_name: originalName || file.name || r2Key.split('/').pop(),
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
