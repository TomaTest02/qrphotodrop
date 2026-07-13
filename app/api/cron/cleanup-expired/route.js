import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteObject } from '@/lib/r2';
import { getSettings, num } from '@/lib/settings';

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

  // Evenimente care nu sunt deja marcate ca expirate
  const { data: events, error } = await admin
    .from('events')
    .select('id, event_date, package_tier, expires_at, status')
    .neq('status', 'expired');

  if (error) {
    console.error('Cleanup: eroare la citirea evenimentelor:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const expired = (events || []).filter((ev) => isExpired(ev, tierMonths));
  let deletedFiles = 0;
  let processedEvents = 0;
  const r2Errors = [];

  for (const ev of expired) {
    // Adunăm cheile R2 (poze/clipuri + arhive)
    const { data: uploads } = await admin.from('uploads').select('r2_key').eq('event_id', ev.id);
    const { data: archives } = await admin.from('archives').select('r2_key').eq('event_id', ev.id);
    const keys = [
      ...(uploads || []).map((u) => u.r2_key),
      ...(archives || []).map((a) => a.r2_key).filter(Boolean),
    ];

    // Ștergem fișierele din R2
    for (const key of keys) {
      try {
        await deleteObject(key);
        deletedFiles++;
      } catch (e) {
        console.error('Cleanup: R2 delete failed', key, e.message);
        r2Errors.push(key);
      }
    }

    // Ștergem tot conținutul personal (media + urări) + marcăm evenimentul expirat.
    // Păstrăm doar contul organizatorului și rândul evenimentului (fără date de invitați).
    await admin.from('uploads').delete().eq('event_id', ev.id);
    await admin.from('archives').delete().eq('event_id', ev.id);
    await admin.from('wishes').delete().eq('event_id', ev.id);
    await admin.from('events').update({ status: 'expired' }).eq('id', ev.id);
    processedEvents++;
  }

  console.log(`Cleanup: ${processedEvents} evenimente expirate, ${deletedFiles} fișiere șterse.`);
  return NextResponse.json({
    ok: true,
    processedEvents,
    deletedFiles,
    r2Errors: r2Errors.length || undefined,
  });
}
