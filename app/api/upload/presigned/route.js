import { NextResponse } from 'next/server';
export async function POST() {
  // Dezactivat intenționat: URL-ul single-PUT nu poate impune dimensiunea declarată.
  // Clientul actual folosește multipart pentru orice fișier.
  return NextResponse.json({
    error: 'Această metodă de upload nu mai este disponibilă.',
    code: 'UPLOAD_METHOD_RETIRED',
  }, { status: 410 });
}
