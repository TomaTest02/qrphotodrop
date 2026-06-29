-- ═══════════════════════════════════════════════════════════════
-- Panou Admin avansat: urmărire plăți + expirare + view de ansamblu
-- ═══════════════════════════════════════════════════════════════

-- ── Plăți manuale + expirare (pe events) ────────────────────────
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS amount_paid INTEGER DEFAULT 0;          -- în RON (lei întregi)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid', 'partial', 'paid'));
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;                  -- override manual; dacă e NULL se calculează din event_date + nivel

-- ── View de ansamblu pentru admin (agregate per cont) ───────────
-- security_invoker = view-ul respectă RLS-ul tabelelor pentru rolul care interoghează.
-- service_role (folosit de API-urile admin) ocolește RLS → vede tot.
CREATE OR REPLACE VIEW public.admin_account_overview
WITH (security_invoker = true) AS
SELECT
  u.id, u.email, u.role, u.status, u.phone, u.must_change_password, u.created_at,
  e.id AS event_id, e.event_name, e.event_type, e.event_date, e.event_code,
  e.location, e.couple_names, e.status AS event_status,
  e.package_type, e.package_tier, e.max_storage_bytes, e.max_guests,
  e.is_gallery_public, e.amount_paid, e.payment_status, e.paid_at, e.expires_at,
  COALESCE(up.photo_count, 0)     AS photo_count,
  COALESCE(up.video_count, 0)     AS video_count,
  COALESCE(up.storage_used, 0)    AS storage_used,
  COALESCE(w.wish_count, 0)       AS wish_count,
  COALESCE(r.rsvp_count, 0)       AS rsvp_count,
  COALESCE(r.guests_attending, 0) AS guests_attending
FROM public.users u
LEFT JOIN public.events e ON e.user_id = u.id
LEFT JOIN (
  SELECT event_id,
    COUNT(*) FILTER (WHERE file_type = 'photo') AS photo_count,
    COUNT(*) FILTER (WHERE file_type = 'video') AS video_count,
    SUM(size_bytes) AS storage_used
  FROM public.uploads GROUP BY event_id
) up ON up.event_id = e.id
LEFT JOIN (
  SELECT event_id, COUNT(*) AS wish_count
  FROM public.wishes GROUP BY event_id
) w ON w.event_id = e.id
LEFT JOIN (
  SELECT event_id,
    COUNT(*) AS rsvp_count,
    SUM(guests_count) FILTER (WHERE status = 'attending') AS guests_attending
  FROM public.rsvps GROUP BY event_id
) r ON r.event_id = e.id;

-- Securitate: doar service_role poate citi view-ul (nu anon/authenticated)
REVOKE ALL ON public.admin_account_overview FROM anon, authenticated;
GRANT SELECT ON public.admin_account_overview TO service_role;
