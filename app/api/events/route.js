import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing event code' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: event, error } = await supabase
    .from('events')
    .select('id, event_name, event_date, event_type, event_code, status, is_gallery_public, couple_names, location')
    .eq('event_code', code)
    .single();

  if (error || !event) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Flag global admin: dacă galeria publică e dezactivată global, o forțăm off la toate conturile
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'public_gallery_enabled').maybeSingle();
  const galleryEnabled = setting ? setting.value === 'true' : true;
  const showGallery = !!event.is_gallery_public && galleryEnabled;
  // Reflectăm starea EFECTIVĂ (pagina de upload oprește polling-ul + ascunde galeria dacă e off)
  event.is_gallery_public = showGallery;

  let photos = [];
  if (showGallery) {
    const { data: uploads } = await supabase
      .from('uploads')
      .select('id, public_url, r2_key, original_name')
      .eq('event_id', event.id)
      .eq('file_type', 'photo')
      .order('created_at', { ascending: false });

    photos = uploads || [];
  }

  // Date publice după cod → cache la CDN-ul Vercel: request-urile concurente ale
  // invitaților sunt servite din cache, nu generează invocare + query per invitat.
  return NextResponse.json({ event, photos }, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  });
}
