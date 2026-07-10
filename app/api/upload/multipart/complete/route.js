import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getPublicUrl, deleteObject, r2Client,
  listAllParts, completeMultipartUpload, abortMultipartUpload,
} from '@/lib/r2';
import { HeadObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';

const ALLOWED_FILE_TYPES = ['photo', 'video'];
const STORAGE_FULL = 'Storage limit exceeded for this event';

export async function POST(request) {
  try {
    const { r2Key, uploadId, eventCode, fileType, originalName } = await request.json();

    if (!r2Key || !uploadId || !eventCode) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    if (!r2Key.startsWith('events/') || r2Key.includes('..')) return NextResponse.json({ error: 'Invalid r2Key format' }, { status: 400 });
    if (fileType && !ALLOWED_FILE_TYPES.includes(fileType)) return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    if (!/^[a-zA-Z0-9]{6,12}$/.test(eventCode)) return NextResponse.json({ error: 'Invalid event code' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: event } = await supabase
      .from('events')
      .select('id, status, max_storage_bytes')
      .eq('event_code', eventCode)
      .single();

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    if (event.status !== 'active') return NextResponse.json({ error: 'Event is not active' }, { status: 403 });
    if (!r2Key.startsWith(`events/${event.id}/`)) return NextResponse.json({ error: 'r2Key does not belong to this event' }, { status: 403 });

    // Finalizăm citind ETag-urile pe server (fără CORS ETag pe client)
    const parts = await listAllParts(r2Key, uploadId);
    if (!parts.length) {
      await abortMultipartUpload(r2Key, uploadId).catch(() => {});
      return NextResponse.json({ error: 'No parts uploaded' }, { status: 400 });
    }
    await completeMultipartUpload(r2Key, uploadId, parts);

    // Verificăm prin backend că fișierul complet există + mărimea REALĂ
    let actualSize = 0;
    try {
      const head = await r2Client.send(new HeadObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: r2Key,
      }));
      actualSize = Number(head.ContentLength || 0);
    } catch {
      return NextResponse.json({ error: 'Object not found after complete' }, { status: 400 });
    }

    const isVideo = fileType === 'video';
    const MAX_SIZE = isVideo ? 2 * 1024 * 1024 * 1024 : 150 * 1024 * 1024;
    if (actualSize > MAX_SIZE) {
      await deleteObject(r2Key).catch(() => {});
      return NextResponse.json({ error: 'Fișierul depășește limita' }, { status: 413 });
    }

    const { data: usageRows } = await supabase.from('uploads').select('size_bytes').eq('event_id', event.id);
    const used = (usageRows || []).reduce((s, u) => s + (u.size_bytes || 0), 0);
    if (used + actualSize > event.max_storage_bytes) {
      await deleteObject(r2Key).catch(() => {});
      return NextResponse.json({ error: STORAGE_FULL }, { status: 403 });
    }

    const publicUrl = getPublicUrl(r2Key);
    const safeOriginalName = (originalName || r2Key.split('/').pop())
      .replace(/[^a-zA-Z0-9._\-\s]/g, '')
      .substring(0, 255);

    // Doar la final inserăm rândul → nu apare în galerie până nu e complet
    const { data, error } = await supabase.from('uploads').insert({
      event_id: event.id,
      r2_key: r2Key,
      public_url: publicUrl,
      file_type: fileType || 'video',
      size_bytes: actualSize,
      original_name: safeOriginalName,
    }).select().single();

    if (error) {
      console.error('Multipart complete DB error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ upload: data });
  } catch (err) {
    console.error('Multipart complete error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
