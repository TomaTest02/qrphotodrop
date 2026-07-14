import { NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { r2Client } from '@/lib/r2';
import { isValidR2MediaKey, isValidSingleByteRange } from '@/lib/securityGuards';

export const runtime = 'nodejs';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new NextResponse('Unauthorized', { status: 401 });

  const searchParams = new URL(request.url).searchParams;
  const uploadId = searchParams.get('id');
  const forceDownload = searchParams.get('download') === '1';
  if (!uploadId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uploadId)) {
    return new NextResponse('Invalid upload ID', { status: 400 });
  }

  // Nu este suficient ca URL-ul să fie pe R2: fișierul trebuie să existe în DB și
  // să aparțină evenimentului utilizatorului autentificat.
  const admin = createAdminClient();
  const { data: upload, error: uploadError } = await admin
    .from('uploads')
    .select('event_id, r2_key, original_name')
    .eq('id', uploadId)
    .maybeSingle();
  if (uploadError) return new NextResponse('Database error', { status: 500 });
  if (!upload) return new NextResponse('Not found', { status: 404 });

  const { data: ownedEvent, error: eventError } = await admin
    .from('events')
    .select('id')
    .eq('id', upload.event_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (eventError) return new NextResponse('Database error', { status: 500 });
  if (!ownedEvent) return new NextResponse('Forbidden', { status: 403 });
  if (!isValidR2MediaKey(upload.r2_key)) return new NextResponse('Invalid storage key', { status: 500 });

  try {
    const range = request.headers.get('range');
    if (range && !isValidSingleByteRange(range)) {
      return new NextResponse('Invalid range', { status: 416 });
    }
    const upstream = await r2Client.send(new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: upload.r2_key,
      ...(range ? { Range: range } : {}),
    }));
    if (!upstream.Body) return new NextResponse('Storage error', { status: 502 });

    const headers = new Headers({
      'Content-Type': upstream.ContentType || 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Accept-Ranges': upstream.AcceptRanges || 'bytes',
    });
    if (upstream.ContentLength !== undefined) headers.set('Content-Length', String(upstream.ContentLength));
    if (upstream.ContentRange) headers.set('Content-Range', upstream.ContentRange);
    if (upstream.ETag) headers.set('ETag', upstream.ETag);
    if (upstream.LastModified) headers.set('Last-Modified', upstream.LastModified.toUTCString());
    const safeName = (upload.original_name || 'fisier').replace(/[\r\n"\\]/g, '_').slice(0, 180);
    const asciiName = safeName.replace(/[^\x20-\x7E]/g, '_');
    const disposition = forceDownload ? 'attachment' : 'inline';
    headers.set('Content-Disposition', `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`);

    const body = typeof upstream.Body.transformToWebStream === 'function'
      ? upstream.Body.transformToWebStream()
      : Readable.toWeb(upstream.Body);
    return new NextResponse(body, { status: upstream.ContentRange ? 206 : 200, headers });
  } catch (error) {
    console.error('Proxy fetch error:', error);
    if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
      return new NextResponse('Not found', { status: 404 });
    }
    if (error?.$metadata?.httpStatusCode === 416) {
      return new NextResponse('Range not satisfiable', { status: 416 });
    }
    return new NextResponse('Error fetching resource', { status: 502 });
  }
}
