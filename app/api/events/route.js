import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSettings, num, uploadsPaused } from '@/lib/settings';
import { isPublicGalleryAvailable, isValidEventCode } from '@/lib/securityGuards';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!isValidEventCode(code)) {
    return NextResponse.json({ error: 'Invalid event code' }, { status: 400 });
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

  // Setări globale (un singur query): galerie publică, pauză upload, limite.
  // Setările operaționale sunt private; ruta le citește server-side cu service_role.
  const settings = await getSettings();
  const galleryEnabled = settings.public_gallery_enabled === 'true';
  const showGallery = isPublicGalleryAvailable(event, galleryEnabled);
  // Reflectăm starea EFECTIVĂ (pagina de upload oprește polling-ul + ascunde galeria dacă e off)
  event.is_gallery_public = showGallery;

  // Pauză upload globală + limite — pagina de upload le folosește pentru UX
  // (impunerea reală se face oricum server-side în rutele /api/upload/*).
  event.uploadsPaused = uploadsPaused(settings);
  event.limits = {
    maxPhotoMb: num(settings, 'max_photo_mb'),
    maxVideoMb: num(settings, 'max_video_mb'),
    maxPhotos: num(settings, 'max_photos_per_upload'),
    maxVideos: num(settings, 'max_videos_per_upload'),
  };

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
    headers: { 'Cache-Control': showGallery ? 'public, s-maxage=30, stale-while-revalidate=60' : 'private, no-store' },
  });
}
