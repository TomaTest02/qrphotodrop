import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    // Verificam ca utilizatorul este autentificat
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
    }

    const body = await request.json();
    const {
      eventName,
      eventType,
      eventDate,
      coupleNames,
      location,
      maxGuests,
      maxStorageBytes,
      packageType,
      packageTier,
    } = body;

    // Whitelist validare event_type
    const ALLOWED_TYPES = ['nunta', 'botez', 'aniversare', 'corporate'];
    if (!ALLOWED_TYPES.includes(eventType)) {
      return NextResponse.json({ error: 'Tip eveniment invalid' }, { status: 400 });
    }

    // Validare campuri obligatorii
    if (!eventName || !eventType || !eventDate) {
      return NextResponse.json({ error: 'Câmpuri obligatorii lipsă' }, { status: 400 });
    }

    // Sanitizare lungime stringuri (prevenire abuse)
    if (eventName.length > 200) return NextResponse.json({ error: 'Nume prea lung' }, { status: 400 });
    if (coupleNames && coupleNames.length > 200) return NextResponse.json({ error: 'Câmp prea lung' }, { status: 400 });
    if (location && location.length > 300) return NextResponse.json({ error: 'Locație prea lungă' }, { status: 400 });

    // Validare data (trebuie sa fie o data valida)
    if (isNaN(Date.parse(eventDate))) {
      return NextResponse.json({ error: 'Data invalidă' }, { status: 400 });
    }

    // Limitele de stocare per nivel: Basic / Standard / Premium (GB)
    const STORAGE_LIMITS = { intim: 75, complet: 150, vis: 200 };
    const allowedGB = STORAGE_LIMITS[packageTier] || 75;
    const safMaxStorageBytes = allowedGB * 1024 * 1024 * 1024;

    // Verificam ca userul nu are deja un eveniment activ (un cont = un eveniment)
    const { data: existingEvent } = await createAdminClient()
      .from('events')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingEvent) {
      return NextResponse.json({ error: 'Ai deja un eveniment activ' }, { status: 409 });
    }

    // Generam event_code sigur cu crypto
    const { randomBytes } = await import('crypto');
    const eventCode = randomBytes(4).toString('hex').toUpperCase();

    // Folosim admin client (service_role) care ocoleste RLS
    const adminSupabase = createAdminClient();
    const { data: event, error: insertError } = await adminSupabase
      .from('events')
      .insert({
        user_id: user.id,
        event_name: eventName.trim(),
        event_type: eventType,
        event_date: eventDate,
        couple_names: coupleNames?.trim() || null,
        location: location?.trim() || null,
        event_code: eventCode,
        status: 'active',
        max_guests: Math.min(maxGuests || 100, 1000),
        max_storage_bytes: safMaxStorageBytes,
        package_type: packageType || eventType,
        package_tier: packageTier || 'complet',
      })
      .select('*')
      .single();

    if (insertError) {
      console.error('DB insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Eroare neașteptată' }, { status: 500 });
  }
}
