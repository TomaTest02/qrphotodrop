import { NextResponse } from 'next/server';
export async function POST() {
  // Evită parsarea în memorie a multipart/form-data într-o funcție Vercel publică.
  return NextResponse.json({
    error: 'Această metodă de upload nu mai este disponibilă.',
    code: 'UPLOAD_METHOD_RETIRED',
  }, { status: 410 });
}
