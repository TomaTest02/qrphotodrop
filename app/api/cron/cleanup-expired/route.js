import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  abortMultipartUpload,
  deleteByPrefix,
  deleteObject,
  isNoSuchUploadError,
  prefixIsEmpty,
} from '@/lib/r2';
import { processDueStorageRechecks } from '@/lib/accountDeletion';
import { getSettings, num } from '@/lib/settings';

export const runtime = 'nodejs';

function isExpired(ev, tierMonths) {
  let expiry;
  if (ev.expires_at) {
    expiry = new Date(ev.expires_at);
  } else if (ev.event_date) {
    expiry = new Date(ev.event_date);
    expiry.setMonth(expiry.getMonth() + (tierMonths[ev.package_tier] ?? 3));
  } else {
    return false;
  }
  return expiry.getTime() < Date.now();
}

async function cleanupExpiredMultipartSessions(admin) {
  const { data: sessions, error } = await admin
    .from('multipart_sessions')
    .select('id, r2_key, upload_id, status')
    .in('status', ['pending', 'uploading', 'failed'])
    .lte('expires_at', new Date().toISOString())
    .order('expires_at', { ascending: true })
    .limit(100);
  if (error) throw new Error(`expired multipart query failed: ${error.message}`);

  let aborted = 0;
  let failed = 0;
  for (const session of sessions || []) {
    try {
      await abortMultipartUpload(session.r2_key, session.upload_id);
    } catch (error) {
      if (!isNoSuchUploadError(error)) {
        failed++;
        console.error('Cleanup: expired multipart abort failed', session.id, error);
        continue;
      }
    }
    // O sesiune `failed` poate avea deja obiectul asamblat (de exemplu Head/DB a
    // eșuat după CompleteMultipartUpload). Abort nu îl mai vede, deci îl ștergem.
    if (session.status === 'failed') {
      try {
        await deleteObject(session.r2_key);
      } catch (error) {
        failed++;
        console.error('Cleanup: failed multipart object delete failed', session.id, error);
        continue;
      }
    }

    const { data: updated, error: updateError } = await admin
      .from('multipart_sessions')
      .update({ status: 'aborted' })
      .eq('id', session.id)
      .eq('status', session.status)
      .select('id')
      .maybeSingle();
    if (updateError) {
      failed++;
      console.error('Cleanup: expired multipart status failed', session.id, updateError);
    } else if (updated) {
      aborted++;
    }
  }
  return { aborted, failed };
}

export async function GET(request) {
  // Protejat: doar Vercel Cron (trimite Authorization: Bearer <CRON_SECRET>)
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Global, nu doar pentru evenimente expirate: orice upload abandonat eliberează
  // bucățile R2 și rezervarea DB după TTL (maximum 100 pe rulare, restul la următoarea).
  let expiredMultipart = { aborted: 0, failed: 0 };
  try {
    expiredMultipart = await cleanupExpiredMultipartSessions(admin);
  } catch (error) {
    console.error('Cleanup: global multipart cleanup failed', error);
    expiredMultipart.failed = 1;
  }

  // Retenție per nivel (luni după data evenimentului) — configurabilă din admin
  const settings = await getSettings(admin);
  const tierMonths = {
    intim: num(settings, 'retention_months_intim'),
    complet: num(settings, 'retention_months_complet'),
    vis: num(settings, 'retention_months_vis'),
  };

  // TOATE evenimentele — inclusiv cele deja `expired`, ca să re-curățăm date reziduale
  // apărute după prima expirare (belt-and-suspenders; sursele sunt oricum închise acum).
  const { data: events, error } = await admin
    .from('events')
    .select('id, event_date, package_tier, expires_at, status');

  if (error) {
    console.error('Cleanup: eroare la citirea evenimentelor:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const expired = (events || []).filter((ev) => isExpired(ev, tierMonths));
  let deletedFiles = 0;
  let processedEvents = 0;
  const failedEvents = [];

  for (const ev of expired) {
    // Marcarea `expired` se face ÎNAINTE de R2. Update-ul serializează cu RPC-urile
    // de finalizare, astfel încât după acest punct nu mai poate apărea conținut nou.
    if (ev.status !== 'expired') {
      const { error: expireError } = await admin
        .from('events')
        .update({ status: 'expired' })
        .eq('id', ev.id);
      if (expireError) {
        console.error('Cleanup: event status update failed', ev.id, expireError);
        failedEvents.push(ev.id);
        continue;
      }
    }

    const { data: sessions, error: sessionsError } = await admin
      .from('multipart_sessions')
      .select('r2_key, upload_id')
      .eq('event_id', ev.id)
      .in('status', ['pending', 'uploading']);
    if (sessionsError) {
      console.error('Cleanup: multipart query failed', ev.id, sessionsError);
      failedEvents.push(ev.id);
      continue;
    }

    let cleanupFailed = false;
    for (const session of sessions || []) {
      try {
        await abortMultipartUpload(session.r2_key, session.upload_id);
      } catch (error) {
        if (!isNoSuchUploadError(error)) {
          console.error('Cleanup: multipart abort failed', ev.id, error);
          cleanupFailed = true;
          break;
        }
      }
    }
    if (cleanupFailed) {
      failedEvents.push(ev.id);
      continue;
    }

    // Scanăm prefixele și pentru evenimente deja expirate. Astfel prindem un obiect
    // single-PUT urcat cu un URL emis înainte de expirare, dar confirmat mai târziu.
    const prefixes = [`events/${ev.id}/`, `archives/${ev.id}/`];
    for (const prefix of prefixes) {
      try {
        deletedFiles += await deleteByPrefix(prefix);
        if (!(await prefixIsEmpty(prefix))) throw new Error('prefix not empty after delete');
      } catch (error) {
        console.error('Cleanup: R2 cleanup failed', prefix, error);
        cleanupFailed = true;
        break;
      }
    }
    if (cleanupFailed) {
      failedEvents.push(ev.id);
      continue;
    }

    // DB se curăță într-o singură tranzacție și numai după confirmarea R2.
    const { data: purged, error: purgeError } = await admin
      .rpc('purge_expired_event_data', { p_event_id: ev.id });
    if (purgeError || !purged) {
      console.error('Cleanup: DB purge failed', ev.id, purgeError);
      failedEvents.push(ev.id);
      continue;
    }

    processedEvents++;
  }

  let storageRechecks = { completed: 0, failed: 0 };
  try {
    storageRechecks = await processDueStorageRechecks(admin);
  } catch (error) {
    console.error('Cleanup: storage deletion jobs failed', error);
    storageRechecks.failed = 1;
  }

  const ok = failedEvents.length === 0 && storageRechecks.failed === 0 && expiredMultipart.failed === 0;
  console.log(`Cleanup: ${processedEvents} evenimente curățate, ${deletedFiles} fișiere șterse, ${failedEvents.length + storageRechecks.failed} eșecuri.`);
  return NextResponse.json({
    ok,
    processedEvents,
    deletedFiles,
    failedEvents: failedEvents.length,
    storageRechecks,
    expiredMultipart,
  }, { status: ok ? 200 : 500 });
}
