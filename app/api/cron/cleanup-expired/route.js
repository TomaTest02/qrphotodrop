import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteObject } from '@/lib/r2';

// Retenție per nivel (luni după data evenimentului)
const TIER_MONTHS = { intim: 1, complet: 2, vis: 3 };

function isExpired(ev) {
  let expiry;
  if (ev.expires_at) {
    expiry = new Date(ev.expires_at);
  } else if (ev.event_date) {
    expiry = new Date(ev.event_date);
    expiry.setMonth(expiry.getMonth() + (TIER_MONTHS[ev.package_tier] || 3));
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

  // Evenimente care nu sunt deja marcate ca expirate
  const { data: events, error } = await admin
    .from('events')
    .select('id, event_date, package_tier, expires_at, status')
    .neq('status', 'expired');

  if (error) {
    console.error('Cleanup: eroare la citirea evenimentelor:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  const expired = (events || []).filter(isExpired);
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

    // Ștergem rândurile media + marcăm evenimentul ca expirat (păstrăm contul + urările)
    await admin.from('uploads').delete().eq('event_id', ev.id);
    await admin.from('archives').delete().eq('event_id', ev.id);
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
