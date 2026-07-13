import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPublicUrl, deleteObject, r2Client } from '@/lib/r2';
import { getSettings, maxBytesFor } from '@/lib/settings';
import { finalizeUploadRecord, uploadFinalizeError } from '@/lib/uploads';
import { HeadObjectCommand } from '@aws-sdk/client-s3';

export async function POST(request) {
  try {
    const { r2Key, eventCode, sizeBytes, originalName } = await request.json();

    if (!r2Key || !eventCode) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Validare format r2Key — trebuie să înceapă cu 'events/' pentru a preveni injectarea de chei arbitrare
    if (!r2Key.startsWith('events/') || r2Key.includes('..')) {
      return NextResponse.json({ error: 'Invalid r2Key format' }, { status: 400 });
    }

    // Validare de bază a mărimii DECLARATE (verificarea REALĂ se face mai jos, din R2)
    if (sizeBytes !== undefined && (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0)) {
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
      .select('id, status')
      .eq('event_code', eventCode)
      .single();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verificăm că r2Key aparține acestui eveniment (securitate suplimentară)
    if (!r2Key.startsWith(`events/${event.id}/`)) {
      return NextResponse.json({ error: 'r2Key does not belong to this event' }, { status: 403 });
    }

    if (event.status !== 'active') {
      // URL-ul poate fi emis înainte de expirare, iar uploadul terminat după cleanup.
      // Ștergem cheia validată ca aparținând evenimentului pentru a nu lăsa un orfan.
      await deleteObject(r2Key).catch((error) => {
        console.error('confirm: cleanup for inactive event failed', r2Key, error);
      });
      return NextResponse.json({ error: 'Event is not active', code: 'EVENT_INACTIVE' }, { status: 410 });
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
    if (!Number.isSafeInteger(actualSize) || actualSize <= 0) {
      await deleteObject(r2Key).catch(() => {});
      return NextResponse.json({ error: 'Invalid object size' }, { status: 400 });
    }

    // Limită per fișier pe mărimea REALĂ, folosind limitele globale ACTUALE (nu valori fixe).
    // Kill-switch: `confirm` finalizează un fișier deja urcat în R2 — NU îl blocăm aici
    // (altfel ar rămâne orfan); kill-switch-ul oprește doar PORNIREA (presigned/create/direct).
    const settings = await getSettings(supabase);
    // Tipul e derivat din calea r2Key (folderul a fost setat server-side la presigned),
    // NU din `fileType` trimis de client.
    const isVideo = r2Key.includes('/videos/');
    if (actualSize > maxBytesFor(settings, isVideo)) {
      await deleteObject(r2Key).catch(() => {});
      return NextResponse.json({ error: 'Fișierul depășește limita permisă' }, { status: 413 });
    }

    const publicUrl = getPublicUrl(r2Key);

    // Sanitizare originalName
    const safeOriginalName = (originalName || r2Key.split('/').pop())
      .replace(/[^a-zA-Z0-9._\-\s]/g, '')
      .substring(0, 255);

    // RPC-ul blochează evenimentul și verifică atomic status + used + rezervări.
    const { upload, error } = await finalizeUploadRecord(supabase, {
      eventId: event.id,
      r2Key,
      publicUrl,
      fileType: isVideo ? 'video' : 'photo',
      sizeBytes: actualSize,
      originalName: safeOriginalName,
    });

    if (error) {
      console.error('Upload confirm finalize error:', error);
      await deleteObject(r2Key).catch((deleteError) => {
        console.error('confirm: R2 cleanup after finalize failed', r2Key, deleteError);
      });
      const responseError = uploadFinalizeError(error);
      return NextResponse.json({ error: responseError.message, code: responseError.code }, { status: responseError.status });
    }

    return NextResponse.json({ upload });
  } catch (err) {
    console.error('Confirm error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
