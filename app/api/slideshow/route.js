import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { isPublicGalleryAvailable, isValidEventCode } from '@/lib/securityGuards';

// Returnează pozele unui eveniment pentru proiecția live / slideshow (TV).
//
// Cine vede pozele:
//   • galerie PUBLICĂ (+ flag global on) → oricine cu codul (ca și galeria publică);
//   • galerie PRIVATĂ → DOAR organizatorul autentificat care deține evenimentul
//     (deschide slideshow-ul din dashboard-ul lui). Astfel TV-ul merge chiar dacă
//     galeria nu e publică, dar invitații NU pot vedea pozele deschizând /slideshow/<cod>.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  if (!isValidEventCode(code)) {
    return NextResponse.json({ error: 'Cod invalid' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from('events')
    .select('id, event_name, event_date, status, is_gallery_public, user_id')
    .eq('event_code', code)
    .single();

  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Flag global admin: dacă galeria publică e dezactivată global, calea publică e oprită
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key', 'public_gallery_enabled').maybeSingle();
  const galleryEnabled = setting ? setting.value === 'true' : true;
  const publicOk = isPublicGalleryAvailable(event, galleryEnabled);

  // Dacă NU e public, permitem doar organizatorului autentificat care deține evenimentul.
  let ownerOk = false;
  if (!publicOk) {
    try {
      const authed = await createClient();
      const { data: { user } } = await authed.auth.getUser();
      ownerOk = !!user && user.id === event.user_id;
    } catch { ownerOk = false; }
  }

  // Caching: calea publică e identică pentru toți → cache la CDN. Calea proprietarului
  // depinde de sesiune → NU o cache-uim (altfel CDN-ul ar putea servi pozele private
  // unui request neautentificat).
  const headers = publicOk
    ? { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    : { 'Cache-Control': 'private, no-store' };

  if (!publicOk && !ownerOk) {
    return NextResponse.json({
      event: { event_name: event.event_name, event_date: event.event_date },
      photos: [],
      private: true,
    }, { headers });
  }

  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, public_url')
    .eq('event_id', event.id)
    .eq('file_type', 'photo')
    .order('created_at', { ascending: false });

  return NextResponse.json({
    event: { event_name: event.event_name, event_date: event.event_date },
    photos: (uploads || []).filter((u) => u.public_url),
  }, { headers });
}
