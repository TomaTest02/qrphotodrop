import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    // Verificare autentificare și rol admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = createAdminClient();

    // Conturi în așteptare
    const { count: pendingAccounts } = await admin
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Cereri de printare NEREZOLVATE (doar cele noi, nu și cele marcate ca rezolvate)
    const { count: pendingPrints } = await admin
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'Comandă Printare'); // cele rezolvate au event_type = 'Comandă Printare (Rezolvată)'

    return NextResponse.json({
      success: true,
      pendingAccounts: pendingAccounts || 0,
      pendingPrints: pendingPrints || 0,
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
