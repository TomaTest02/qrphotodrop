import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getPresignedDownloadUrl } from '@/lib/r2';
import { isValidR2MediaKey } from '@/lib/securityGuards';

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
    const safeName = (upload.original_name || 'fisier').replace(/[\r\n"\\]/g, '_').slice(0, 180);
    const asciiName = safeName.replace(/[^\x20-\x7E]/g, '_');
    const encodedName = encodeURIComponent(safeName).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
    const disposition = forceDownload
      ? `attachment; filename="${asciiName}"; filename*=UTF-8''${encodedName}`
      : undefined;
    const signedUrl = await getPresignedDownloadUrl(upload.r2_key, disposition);

    // Răspunsul Vercel are corp zero; browserul descarcă direct din R2.
    return new NextResponse(null, {
      status: 307,
      headers: {
        Location: signedUrl,
        'Cache-Control': 'private, no-store',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error) {
    console.error('Presigned download error:', error);
    return new NextResponse('Error preparing download', { status: 502 });
  }
}
