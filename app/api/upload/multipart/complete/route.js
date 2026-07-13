import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getPublicUrl, deleteObject, r2Client,
  listAllParts, completeMultipartUpload, abortMultipartUpload,
} from '@/lib/r2';
import { HeadObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { sessionId, originalName } = await request.json();
    if (!sessionId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: s } = await supabase
      .from('multipart_sessions')
      .select('id, event_id, r2_key, upload_id, expected_size_bytes, part_size_bytes, total_parts, status, expires_at')
      .eq('id', sessionId)
      .single();

    if (!s) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    // Idempotent: dacă e deja finalizată, întoarce rândul existent (nu re-finaliza)
    if (s.status === 'completed') {
      const { data: existing } = await supabase.from('uploads').select().eq('r2_key', s.r2_key).single();
      return NextResponse.json({ upload: existing });
    }
    if (!['pending', 'uploading'].includes(s.status)) {
      return NextResponse.json({ error: 'Session not active' }, { status: 409 });
    }

    // Retenție: nu finaliza dacă sesiunea a expirat sau evenimentul nu mai e activ
    // (altfel s-ar introduce media nouă după cleanup, care n-ar mai fi ștearsă).
    const sessionExpired = s.expires_at && new Date(s.expires_at).getTime() < Date.now();
    const { data: ev } = await supabase.from('events').select('status').eq('id', s.event_id).single();
    if (sessionExpired || ev?.status !== 'active') {
      await abortMultipartUpload(s.r2_key, s.upload_id).catch(() => {});
      await supabase.from('multipart_sessions').update({ status: 'failed' }).eq('id', s.id);
      return NextResponse.json({ error: 'Sesiune expirată sau eveniment inactiv.' }, { status: 410 });
    }

    // ── Validăm bucățile ÎNAINTE de a asambla obiectul ──
    const parts = await listAllParts(s.r2_key, s.upload_id); // [{ PartNumber, ETag, Size }]
    const totalSize = parts.reduce((sum, p) => sum + (p.Size || 0), 0);
    const valid =
      parts.length === s.total_parts &&
      parts.every((p, i) => p.PartNumber === i + 1) &&                    // 1..N consecutive
      parts.slice(0, -1).every((p) => p.Size === s.part_size_bytes) &&    // toate egale (fără ultima)
      totalSize === Number(s.expected_size_bytes);                        // mărimea exactă
    if (!valid) {
      await abortMultipartUpload(s.r2_key, s.upload_id).catch(() => {});
      await supabase.from('multipart_sessions').update({ status: 'failed' }).eq('id', s.id);
      return NextResponse.json({ error: 'Upload incomplet — reîncearcă' }, { status: 400 });
    }

    await completeMultipartUpload(
      s.r2_key, s.upload_id,
      parts.map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
    );

    // Verificare finală prin backend: obiectul complet există + mărimea reală
    let actualSize = 0;
    try {
      const head = await r2Client.send(new HeadObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: s.r2_key,
      }));
      actualSize = Number(head.ContentLength || 0);
    } catch {
      await supabase.from('multipart_sessions').update({ status: 'failed' }).eq('id', s.id);
      return NextResponse.json({ error: 'Object not found after complete' }, { status: 400 });
    }
    if (actualSize !== Number(s.expected_size_bytes)) {
      await deleteObject(s.r2_key).catch(() => {});
      await supabase.from('multipart_sessions').update({ status: 'failed' }).eq('id', s.id);
      return NextResponse.json({ error: 'Upload incomplet — reîncearcă' }, { status: 400 });
    }

    const isVideo = s.r2_key.includes('/videos/');
    const publicUrl = getPublicUrl(s.r2_key);
    const safeOriginalName = (originalName || s.r2_key.split('/').pop())
      .replace(/[^a-zA-Z0-9._\-\s]/g, '')
      .substring(0, 255);

    const { data, error } = await supabase.from('uploads').insert({
      event_id: s.event_id,
      r2_key: s.r2_key,
      public_url: publicUrl,
      file_type: isVideo ? 'video' : 'photo',
      size_bytes: actualSize,
      original_name: safeOriginalName,
    }).select().single();

    if (error) {
      // 23505 = unique_violation pe r2_key → rândul există deja (dublă finalizare) → idempotent
      if (error.code === '23505') {
        const { data: existing } = await supabase.from('uploads').select().eq('r2_key', s.r2_key).single();
        await supabase.from('multipart_sessions').update({ status: 'completed' }).eq('id', s.id);
        return NextResponse.json({ upload: existing });
      }
      // Altă eroare DB → nu lăsăm fișier orfan
      await deleteObject(s.r2_key).catch(() => {});
      await supabase.from('multipart_sessions').update({ status: 'failed' }).eq('id', s.id);
      console.error('Multipart complete DB error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Sesiune finalizată → iese din „reserved", intră în „used" (rândul din uploads)
    await supabase.from('multipart_sessions').update({ status: 'completed' }).eq('id', s.id);
    return NextResponse.json({ upload: data });
  } catch (err) {
    console.error('Multipart complete error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
