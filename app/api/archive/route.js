import { NextResponse } from 'next/server';
export async function POST() {
  // Vechea arhivare server-side: buffera TOT evenimentul în memoria funcției și
  // rula fire-and-forget (Vercel oprește lucrul după răspuns → arhivă niciodată
  // terminată). ZIP-ul se generează acum în browser, în dashboard — nimeni nu mai
  // apelează ruta.
  return NextResponse.json({
    error: 'Arhivarea pe server nu mai este disponibilă. Folosește descărcarea din dashboard.',
    code: 'ARCHIVE_METHOD_RETIRED',
  }, { status: 410 });
}
