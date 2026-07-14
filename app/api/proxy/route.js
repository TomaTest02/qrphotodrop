import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { parseR2ProxyTarget } from '@/lib/securityGuards';

export const runtime = 'nodejs';

export async function GET(request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return new NextResponse('Unauthorized', { status: 401 });

  const target = parseR2ProxyTarget(
    new URL(request.url).searchParams.get('url'),
    process.env.CLOUDFLARE_R2_PUBLIC_URL,
  );
  if (!target) return new NextResponse('Unauthorized proxy URL', { status: 403 });

  // Nu este suficient ca URL-ul să fie pe R2: fișierul trebuie să existe în DB și
  // să aparțină evenimentului utilizatorului autentificat.
  const admin = createAdminClient();
  const { data: upload, error: uploadError } = await admin
    .from('uploads')
    .select('event_id, original_name')
    .eq('r2_key', target.r2Key)
    .maybeSingle();
  if (uploadError) return new NextResponse('Database error', { status: 500 });
  if (!upload) return new NextResponse('Not found', { status: 404 });

  const { data: ownedEvent } = await admin
    .from('events')
    .select('id')
    .eq('id', upload.event_id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!ownedEvent) return new NextResponse('Forbidden', { status: 403 });

  try {
    const range = request.headers.get('range');
    const upstream = await fetch(target.url, {
      redirect: 'error',
      headers: range ? { Range: range } : undefined,
    });
    if (!upstream.ok && upstream.status !== 206) {
      return new NextResponse('Storage error', { status: 502 });
    }

    const headers = new Headers({
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    for (const name of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    const safeName = (upload.original_name || 'fisier').replace(/[\r\n"\\]/g, '_').slice(0, 180);
    const asciiName = safeName.replace(/[^\x20-\x7E]/g, '_');
    headers.set('Content-Disposition', `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`);

    // Streaming: nu mai încărcăm un video de 1.5 GB integral în memoria funcției.
    return new NextResponse(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    console.error('Proxy fetch error:', error);
    return new NextResponse('Error fetching resource', { status: 502 });
  }
}
