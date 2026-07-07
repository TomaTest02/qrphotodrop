import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import RegisterFlow from '../RegisterFlow';

export const dynamic = 'force-dynamic';

// Link de recomandare wedding planner: /register/<slug>
// Căutăm plannerul activ după slug (server-side, service_role) și îl transmitem
// în fluxul de înregistrare. Dacă slug-ul nu există / e inactiv → register normal.
export default async function RegisterReferralPage({ params }) {
  const { ref } = await params;

  let plannerName = null;
  let referrerSlug = null;

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const { data } = await supabase
      .from('wedding_planners')
      .select('name, slug, active')
      .eq('slug', ref)
      .eq('active', true)
      .maybeSingle();
    if (data) {
      plannerName = data.name;
      referrerSlug = data.slug;
    }
  } catch {
    // eșec de lookup → tratăm ca înregistrare normală, fără recomandare
  }

  return <RegisterFlow referrerSlug={referrerSlug} plannerName={plannerName} />;
}
