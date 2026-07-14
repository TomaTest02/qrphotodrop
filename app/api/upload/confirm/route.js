import { NextResponse } from 'next/server';
export async function POST() {
  // Făcea parte din fluxul single-PUT retras (presigned + confirm). Multipart
  // finalizează prin /api/upload/multipart/complete — nimeni nu mai apelează ruta.
  return NextResponse.json({
    error: 'Această metodă de upload nu mai este disponibilă.',
    code: 'UPLOAD_METHOD_RETIRED',
  }, { status: 410 });
}
