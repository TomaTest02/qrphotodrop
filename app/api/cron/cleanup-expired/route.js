import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteByPrefix, abortMultipartUpload } from '@/lib/r2';
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

export async function GET(request) {
  // Protejat: doar Vercel Cron (trimite Authorization: Bearer <CRON_SECRET>)
  const auth = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

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
  const r2Errors = [];

  for (const ev of expired) {
    const newlyExpired = ev.status !== 'expired';

    // Reziduuri în DB (pentru evenimentele deja expirate sărim dacă nu e nimic de curățat)
    const [{ data: up }, { data: ar }, { data: wi }, { data: sess }] = await Promise.all([
      admin.from('uploads').select('id').eq('event_id', ev.id).limit(1),
      admin.from('archives').select('id').eq('event_id', ev.id).limit(1),
      admin.from('wishes').select('id').eq('event_id', ev.id).limit(1),
      admin.from('multipart_sessions').select('id, r2_key, upload_id, status').eq('event_id', ev.id),
    ]);
    const hasResidual = up?.length || ar?.length || wi?.length || (sess?.length);
    if (!newlyExpired && !hasResidual) continue; // deja curat

    // Oprim sesiunile multipart active (altfel rămân bucăți incomplete în R2)
    for (const s of sess || []) {
      if (['pending', 'uploading'].includes(s.status) && s.r2_key && s.upload_id) {
        await abortMultipartUpload(s.r2_key, s.upload_id).catch(() => {});
      }
    }

    // R2: ștergem TOT sub prefixe (media + arhive + orfani + multipart incomplet)
    for (const prefix of [`events/${ev.id}/`, `archives/${ev.id}/`]) {
      try {
        deletedFiles += await deleteByPrefix(prefix);
      } catch (e) {
        console.error('Cleanup: deleteByPrefix failed', prefix, e.message);
        r2Errors.push(prefix);
      }
    }

    // DB: ștergem tot conținutul personal (media + urări + arhive + sesiuni).
    // Păstrăm doar contul organizatorului și rândul evenimentului, marcat `expired`.
    await admin.from('uploads').delete().eq('event_id', ev.id);
    await admin.from('archives').delete().eq('event_id', ev.id);
    await admin.from('wishes').delete().eq('event_id', ev.id);
    await admin.from('multipart_sessions').delete().eq('event_id', ev.id);
    if (newlyExpired) await admin.from('events').update({ status: 'expired' }).eq('id', ev.id);
    processedEvents++;
  }

  console.log(`Cleanup: ${processedEvents} evenimente curățate, ${deletedFiles} fișiere șterse.`);
  return NextResponse.json({
    ok: true,
    processedEvents,
    deletedFiles,
    r2Errors: r2Errors.length || undefined,
  });
}
