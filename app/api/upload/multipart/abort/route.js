import { NextResponse } from 'next/server';
import { abortMultipartUpload } from '@/lib/r2';

// Curățare best-effort când clientul renunță/eșuează. R2 abandonează oricum
// uploadurile neterminate automat după 7 zile, deci nu rămâne gunoi.
export async function POST(request) {
  try {
    const { r2Key, uploadId } = await request.json();
    if (!r2Key || !uploadId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!r2Key.startsWith('events/') || r2Key.includes('..')) {
      return NextResponse.json({ error: 'Invalid r2Key format' }, { status: 400 });
    }
    await abortMultipartUpload(r2Key, uploadId).catch(() => {});
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Multipart abort error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
