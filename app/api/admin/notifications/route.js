import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get pending accounts
    const { count: pendingAccounts } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get pending print requests (new / unread)
    // Deoarece nu avem coloană status în contact_messages,
    // vom considera cererile din ultimele 7 zile drept "noi", SAU le marcăm adăugând un câmp temporar.
    // Dar hai să le considerăm "noi" dacă au event_type = 'Comandă Printare (Nouă)'.
    // Pentru a menține simplitatea fără migrare, vom face pur și simplu un count pentru event_type = 'Comandă Printare'.
    const { count: pendingPrints } = await supabase
      .from('contact_messages')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'Comandă Printare');

    return NextResponse.json({
      success: true,
      pendingAccounts: pendingAccounts || 0,
      pendingPrints: pendingPrints || 0
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
