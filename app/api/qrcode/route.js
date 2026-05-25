import { NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const text = searchParams.get('text');
  const size = searchParams.get('size') || 300;

  if (!text) {
    return NextResponse.json({ error: 'Missing text parameter' }, { status: 400 });
  }

  try {
    const buffer = await QRCode.toBuffer(text, {
      width: parseInt(size),
      margin: 2,
      color: {
        dark: '#231e33', // Dark violet
        light: '#ffffff' // White background
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
