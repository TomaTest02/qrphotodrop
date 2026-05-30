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

    if (!eventName || !eventType || !eventDate) {
      return NextResponse.json({ error: 'Câmpuri obligatorii lipsă' }, { status: 400 });
    }

    const eventCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    // Folosim admin client (service_role) care ocoleste RLS
    const adminSupabase = createAdminClient();
    const { data: event, error: insertError } = await adminSupabase
      .from('events')
      .insert({
        user_id: user.id,
        event_name: eventName,
        event_type: eventType,
        event_date: eventDate,
        couple_names: coupleNames || null,
        location: location || null,
        event_code: eventCode,
        status: 'active',
        max_guests: maxGuests || 100,
        max_storage_bytes: maxStorageBytes || 26843545600,
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
