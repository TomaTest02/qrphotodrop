import { NextResponse } from 'next/server';

// Doar hostname-urile noastre pot fi proxy-ate (anti-SSRF).
function isAllowedHost(hostname) {
  const h = hostname.toLowerCase();
  const allowed = [];
  try {
    const r2 = process.env.CLOUDFLARE_R2_PUBLIC_URL;
    if (r2) allowed.push(new URL(r2).hostname.toLowerCase());
  } catch { /* ignore malformed env */ }
  return (
    h === 'qrphotodrop.com' ||
    h.endsWith('.qrphotodrop.com') ||
    h.endsWith('.r2.dev') ||
    allowed.includes(h)
  );
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Validare strictă: parsăm URL-ul, doar HTTPS și doar hosturile noastre.
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return new NextResponse('Invalid url parameter', { status: 400 });
  }

  if (parsed.protocol !== 'https:' || !isAllowedHost(parsed.hostname)) {
    return new NextResponse('Unauthorized proxy URL', { status: 403 });
  }

  try {
    // redirect: 'error' — un host permis nu poate redirecta către o adresă internă.
    const res = await fetch(parsed.toString(), { redirect: 'error' });
    if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`);
    
    const arrayBuffer = await res.arrayBuffer();
    
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'public, max-age=86400',
      }
    });
  } catch (error) {
    console.error('Proxy fetch error:', error);
    return new NextResponse('Error fetching resource', { status: 500 });
  }
}
