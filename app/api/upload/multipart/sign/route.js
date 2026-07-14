import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPresignedPartUrl } from '@/lib/r2';

export const runtime = 'nodejs';

// Semnează URL-uri pentru bucăți LA CERERE (în loturi). Clientul trimite DOAR sessionId
// (neutru); serverul citește r2_key + upload_id din sesiune → nu are încredere în client.
export async function POST(request) {
  try {
    const { sessionId, partNumbers } = await request.json();

    if (!sessionId || !Array.isArray(partNumbers) || !partNumbers.length) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: s } = await supabase
      .from('multipart_sessions')
      .select('event_id, r2_key, upload_id, total_parts, status, expires_at')
      .eq('id', sessionId)
      .single();

    if (!s) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    if (!['pending', 'uploading'].includes(s.status)) {
      return NextResponse.json({ error: 'Session not active' }, { status: 409 });
    }
    if (new Date(s.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 410 });
    }

    const { data: event } = await supabase
      .from('events')
      .select('status')
      .eq('id', s.event_id)
      .single();
    if (event?.status !== 'active') {
      return NextResponse.json({ error: 'Event is not active', code: 'EVENT_INACTIVE' }, { status: 410 });
    }

    // Validăm numerele bucăților față de totalParts din sesiune
    const nums = partNumbers
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= s.total_parts)
      .slice(0, 20);
    if (!nums.length) return NextResponse.json({ error: 'Invalid part numbers' }, { status: 400 });

    const urls = {};
    await Promise.all(nums.map(async (n) => { urls[n] = await getPresignedPartUrl(s.r2_key, s.upload_id, n); }));

    // Marcăm sesiunea „uploading" la prima semnare — IDEMPOTENT la cei 3 workeri paraleli.
    // Cursa: toți citesc 'pending', primul face pending→uploading, ceilalți nu mai prind
    // rândul cu .eq('status','pending'). ASTA NU E O EROARE — altul a câștigat cursa.
    if (s.status === 'pending') {
      const { data: updated, error: updateError } = await supabase
        .from('multipart_sessions')
        .update({ status: 'uploading' })
        .eq('id', sessionId)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      if (updateError) {
        console.error('Multipart sign: status update error', updateError);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
      }
      if (!updated) {
        // Update-ul n-a prins 'pending' → alt worker a făcut deja tranziția SAU sesiunea
        // a fost anulată. Recitim și decidem (NU facem update necondiționat la 'uploading',
        // ca să nu reactivăm accidental o sesiune deja aborted/failed).
        const { data: fresh } = await supabase
          .from('multipart_sessions')
          .select('status, expires_at')
          .eq('id', sessionId)
          .single();
        const activa = fresh
          && fresh.status === 'uploading'
          && new Date(fresh.expires_at) >= new Date();
        if (!activa) {
          return NextResponse.json({ error: 'Session is no longer active' }, { status: 409 });
        }
        // e 'uploading' → cursă normală câștigată de alt worker; continuăm și întoarcem URL-urile
      }
    }

    return NextResponse.json({ urls });
  } catch (err) {
    console.error('Multipart sign error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
