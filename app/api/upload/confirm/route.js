import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicUrl, deleteObject, r2Client } from '@/lib/r2';
import { getSettings, maxBytesFor } from '@/lib/settings';
import { HeadObjectCommand } from '@aws-sdk/client-s3';

const ALLOWED_FILE_TYPES = ['photo', 'video'];

export async function POST(request) {
  try {
    const { r2Key, eventCode, fileType, sizeBytes, originalName } = await request.json();

    if (!r2Key || !eventCode) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Validare format r2Key — trebuie să înceapă cu 'events/' pentru a preveni injectarea de chei arbitrare
    if (!r2Key.startsWith('events/') || r2Key.includes('..')) {
      return NextResponse.json({ error: 'Invalid r2Key format' }, { status: 400 });
    }

    // Validare fileType (whitelist)
    if (fileType && !ALLOWED_FILE_TYPES.includes(fileType)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validare de bază a mărimii DECLARATE (verificarea REALĂ se face mai jos, din R2)
    if (sizeBytes !== undefined && (typeof sizeBytes !== 'number' || sizeBytes < 0)) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
    }

    // Sanitizare event code
    if (!/^[a-zA-Z0-9]{6,12}$/.test(eventCode)) {
      return NextResponse.json({ error: 'Invalid event code' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Obținem event ID și verificăm că evenimentul este ACTIV
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

    // Verificăm că r2Key aparține acestui eveniment (securitate suplimentară)
    if (!r2Key.startsWith(`events/${event.id}/`)) {
      return NextResponse.json({ error: 'r2Key does not belong to this event' }, { status: 403 });
    }

    // ── Securitate: mărimea REALĂ din R2, nu ce a declarat clientul ──
    // URL-ul presemnat nu limitează cât se urcă, așa că verificăm după upload și,
    // dacă depășește, ștergem obiectul (evită umplerea storage-ului / bypass plafon).
    let actualSize = 0;
    try {
      const head = await r2Client.send(new HeadObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: r2Key,
      }));
      actualSize = Number(head.ContentLength || 0);
    } catch {
      return NextResponse.json({ error: 'Object not found in storage' }, { status: 400 });
    }

    // Limită per fișier pe mărimea REALĂ, folosind limitele globale ACTUALE (nu valori fixe).
    // Kill-switch: `confirm` finalizează un fișier deja urcat în R2 — NU îl blocăm aici
    // (altfel ar rămâne orfan); kill-switch-ul oprește doar PORNIREA (presigned/create/direct).
    const settings = await getSettings(supabase);
    const isVideo = fileType === 'video';
    if (actualSize > maxBytesFor(settings, isVideo)) {
      await deleteObject(r2Key).catch(() => {});
      return NextResponse.json({ error: 'Fișierul depășește limita permisă' }, { status: 413 });
    }

    // Plafon de stocare per eveniment, pe mărimea reală
    const { data: usageRows } = await supabase.from('uploads').select('size_bytes').eq('event_id', event.id);
    const used = (usageRows || []).reduce((s, u) => s + (u.size_bytes || 0), 0);
    if (used + actualSize > event.max_storage_bytes) {
      await deleteObject(r2Key).catch(() => {});
      return NextResponse.json({ error: 'Storage limit exceeded for this event' }, { status: 403 });
    }

    const publicUrl = getPublicUrl(r2Key);

    // Sanitizare originalName
    const safeOriginalName = (originalName || r2Key.split('/').pop())
      .replace(/[^a-zA-Z0-9._\-\s]/g, '')
      .substring(0, 255);

    // Insert upload record (cu mărimea REALĂ, nu cea declarată de client)
    const { data, error } = await supabase.from('uploads').insert({
      event_id: event.id,
      r2_key: r2Key,
      public_url: publicUrl,
      file_type: fileType || 'photo',
      size_bytes: actualSize,
      original_name: safeOriginalName,
    }).select().single();

    if (error) {
      console.error('Upload confirm error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ upload: data });
  } catch (err) {
    console.error('Confirm error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
