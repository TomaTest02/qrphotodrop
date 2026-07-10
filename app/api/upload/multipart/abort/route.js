import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { abortMultipartUpload } from '@/lib/r2';

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
    // Dacă e deja finalizată, nu o anulăm
    if (s.status === 'completed') return NextResponse.json({ success: true });

    await abortMultipartUpload(s.r2_key, s.upload_id).catch(() => {});
    await supabase.from('multipart_sessions').update({ status: 'aborted' }).eq('id', s.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Multipart abort error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
