import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');
  const size = searchParams.get('size') || 300;

  if (!text) {
    return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
  }

  // Previne DoS prin texte foarte lungi
  if (text.length > 500) {
    return NextResponse.json({ error: 'Text too long' }, { status: 400 });
  }

  // Limitam dimensiunea intre 100 si 800px (previne generarea de imagini gigantice)
  const clampedSize = Math.min(Math.max(parseInt(size) || 300, 100), 800);

  try {
    const buffer = await QRCode.toBuffer(text, {
      width: clampedSize,
      margin: 2,
      color: {
        dark: '#2d2c4a',
        light: '#ffffff'
      }
    });

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('QR Code generation error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}
