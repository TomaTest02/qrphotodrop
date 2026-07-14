import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { abortMultipartUpload, isNoSuchUploadError } from '@/lib/r2';

export const runtime = 'nodejs';

// Verifică sesiunea în DB, anulează multipart-ul în R2 (eliberează bucățile) și
// marchează sesiunea „aborted" → rezervarea de spațiu se eliberează.
export async function POST(request) {
  try {
    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const supabase = createAdminClient();
    const { data: s } = await supabase
      .from('multipart_sessions')
      .select('id, r2_key, upload_id, status')
      .eq('id', sessionId)
      .single();

    if (!s) return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    // Tranziția DB este claim-ul atomic. Astfel un abort întârziat nu mai poate
    // suprascrie `completed`, iar complete nu mai acceptă sesiunea după claim.
    if (['completed', 'aborted'].includes(s.status)) return NextResponse.json({ success: true });
    if (!['pending', 'uploading', 'failed'].includes(s.status)) {
      return NextResponse.json({ error: 'Session not active' }, { status: 409 });
    }

    const { data: claimed, error: claimError } = await supabase
      .from('multipart_sessions')
      .update({ status: 'aborted' })
      .eq('id', s.id)
      .eq('status', s.status)
      .select('id')
      .maybeSingle();
    if (claimError) {
      console.error('Multipart abort DB claim error:', claimError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    if (!claimed) {
      const { data: fresh, error: freshError } = await supabase
        .from('multipart_sessions').select('status').eq('id', s.id).maybeSingle();
      if (freshError) return NextResponse.json({ error: 'Database error' }, { status: 500 });
      if (fresh && ['completed', 'aborted'].includes(fresh.status)) {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'Session changed state' }, { status: 409 });
    }

    try {
      await abortMultipartUpload(s.r2_key, s.upload_id);
    } catch (error) {
      if (!isNoSuchUploadError(error)) {
        console.error('Multipart abort R2 error:', error);
        // Păstrăm sesiunea reîncercabilă și rezervarea activă până la un abort reușit.
        await supabase.from('multipart_sessions')
          .update({ status: s.status })
          .eq('id', s.id)
          .eq('status', 'aborted');
        return NextResponse.json({ error: 'Storage error' }, { status: 502 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Multipart abort error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
