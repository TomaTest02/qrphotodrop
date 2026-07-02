import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  // Basic security check to ensure we only proxy from our R2 bucket
  const r2Url = process.env.CLOUDFLARE_R2_PUBLIC_URL || '';
  if (!targetUrl.includes('.r2.dev') && !targetUrl.startsWith(r2Url) && !targetUrl.includes('qrphotodrop.com')) {
     return new NextResponse('Unauthorized proxy URL', { status: 403 });
  }

  try {
    const res = await fetch(targetUrl);
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
