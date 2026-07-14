import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { generateEventCode } from '@/lib/securityGuards';

export async function POST(request) {
  try {
    // Verificam ca utilizatorul este autentificat
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
    }

    // Doar conturile APROBATE (active) pot crea evenimente — nu ocolim aprobarea manuală.
    const { data: profile } = await createAdminClient()
      .from('users').select('status').eq('id', user.id).single();
    if (profile?.status !== 'active') {
      return NextResponse.json({ error: 'Contul tău nu este activ încă.' }, { status: 403 });
    }

    const body = await request.json();
    const {
      eventName,
      eventType,
      eventDate,
      coupleNames,
      location,
      maxGuests,
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

    // Whitelist pachet + stocare derivată pe SERVER (niciodată din client)
    const STORAGE_LIMITS = { intim: 75, complet: 150, vis: 200 };
    const tier = STORAGE_LIMITS[packageTier] ? packageTier : 'intim';
    const safMaxStorageBytes = STORAGE_LIMITS[tier] * 1024 * 1024 * 1024;

    // Verificam ca userul nu are deja un eveniment (un cont = un eveniment).
    // maybeSingle(): 0 randuri e un caz NORMAL aici, nu o eroare.
    const { data: existingEvent, error: existingErr } = await createAdminClient()
      .from('events')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingErr) {
      console.error('events/create: existing check failed:', existingErr);
      return NextResponse.json({ error: 'Eroare la verificare' }, { status: 500 });
    }
    if (existingEvent) {
      return NextResponse.json({ error: 'Ai deja un eveniment activ' }, { status: 409 });
    }

    const eventCode = generateEventCode();

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
        package_tier: tier,
      })
      .select('*')
      .single();

    if (insertError) {
      // 23505 = unique_violation. DB e apararea FINALA impotriva a doua cereri
      // concurente care trec amandoua de verificarea de mai sus: indexul
      // events_user_id_unique lasa sa treaca doar una, a doua primeste 409.
      const dubluEveniment = insertError.code === '23505'
        && /events_user_id_unique|user_id/i.test(`${insertError.message} ${insertError.details || ''}`);
      if (dubluEveniment) {
        return NextResponse.json({ error: 'Ai deja un eveniment activ' }, { status: 409 });
      }
      console.error('DB insert error:', insertError);
      return NextResponse.json({ error: 'Eroare la crearea evenimentului' }, { status: 500 });
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Eroare neașteptată' }, { status: 500 });
  }
}
