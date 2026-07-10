import { NextResponse } from 'next/server';
import { getPresignedPartUrl } from '@/lib/r2';

export const runtime = 'nodejs';

// Semnează URL-uri pentru bucăți LA CERERE (în loturi). Clientul cere URL-urile pe
// măsură ce avansează și re-cere unul proaspăt la retry → nimic nu expiră în timpul uploadului.
export async function POST(request) {
  try {
    const { r2Key, uploadId, partNumbers } = await request.json();

    if (!r2Key || !uploadId || !Array.isArray(partNumbers) || !partNumbers.length) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    if (!r2Key.startsWith('events/') || r2Key.includes('..')) {
      return NextResponse.json({ error: 'Invalid r2Key format' }, { status: 400 });
    }
    // Limităm dimensiunea lotului și validăm numerele bucăților
    const nums = partNumbers
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 10000)
      .slice(0, 20);
    if (!nums.length) return NextResponse.json({ error: 'Invalid part numbers' }, { status: 400 });

    const urls = {};
    await Promise.all(nums.map(async (n) => { urls[n] = await getPresignedPartUrl(r2Key, uploadId, n); }));

    return NextResponse.json({ urls });
  } catch (err) {
    console.error('Multipart sign error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
