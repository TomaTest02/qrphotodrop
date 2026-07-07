-- ═══════════════════════════════════════════════════════════════
-- Wedding planneri (parteneri de recomandare) + comision
--
-- Fiecare planner are un slug folosit în link-ul de recomandare
--   qrphotodrop.ro/register/<slug>
-- Conturile înregistrate prin acel link primesc users.referred_by = planner.id
-- (rezolvat automat de trigger-ul handle_new_user din referrer_slug).
--
-- Comisionul se calculează DOAR pe conturile plătite: amount_paid * commission_rate.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tabel wedding_planners ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wedding_planners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  commission_rate NUMERIC NOT NULL DEFAULT 0.15,   -- 0.15 = 15%
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wedding_planners_slug ON public.wedding_planners(slug);

-- Doar service_role (API-urile admin) citește/scrie. Fără politici anon/authenticated.
ALTER TABLE public.wedding_planners ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.wedding_planners FROM anon, authenticated;
GRANT ALL ON public.wedding_planners TO service_role;

-- ── 2. Legătura cont → planner ──────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.wedding_planners(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON public.users(referred_by);

-- ── 3. Trigger: rezolvă referrer_slug → referred_by la signup ───
-- Trigger SECURITY DEFINER, rulează ca owner → poate citi wedding_planners.
-- Păstrează comportamentul existent (requested_* din metadata), adaugă doar referred_by.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  ref_id UUID;
BEGIN
  SELECT id INTO ref_id
    FROM public.wedding_planners
    WHERE slug = new.raw_user_meta_data->>'referrer_slug'
      AND active = true
    LIMIT 1;

  INSERT INTO public.users (
    id, email, role, status, phone,
    requested_event_name, requested_event_type, requested_package_tier, requested_event_date,
    referred_by
  )
  VALUES (
    new.id, new.email, 'organizer', 'pending',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'event_name',
    new.raw_user_meta_data->>'event_type',
    new.raw_user_meta_data->>'package_tier',
    NULLIF(new.raw_user_meta_data->>'event_date', '')::timestamptz,
    ref_id
  )
  ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Recreăm view-ul admin cu plannerul care a recomandat ─────
-- (bazat pe versiunea din 20260630180000_signup_request.sql, + referred_by/referrer_*)
DROP VIEW IF EXISTS public.admin_account_overview;
CREATE VIEW public.admin_account_overview
WITH (security_invoker = true) AS
SELECT
  u.id, u.email, u.role, u.status, u.phone, u.must_change_password, u.created_at,
  u.requested_event_name, u.requested_event_type, u.requested_package_tier, u.requested_event_date,
  u.referred_by,
  wp.name AS referrer_name,
  wp.slug AS referrer_slug,
  wp.commission_rate AS referrer_commission_rate,
  e.id AS event_id, e.event_name, e.event_type, e.event_date, e.event_code,
  e.location, e.couple_names, e.status AS event_status,
  e.package_type, e.package_tier, e.max_storage_bytes, e.max_guests,
  e.is_gallery_public, e.amount_paid, e.payment_status, e.paid_at, e.expires_at,
  COALESCE(up.photo_count, 0)  AS photo_count,
  COALESCE(up.video_count, 0)  AS video_count,
  COALESCE(up.storage_used, 0) AS storage_used,
  COALESCE(w.wish_count, 0)    AS wish_count
FROM public.users u
LEFT JOIN public.wedding_planners wp ON wp.id = u.referred_by
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
) w ON w.event_id = e.id;

REVOKE ALL ON public.admin_account_overview FROM anon, authenticated;
GRANT SELECT ON public.admin_account_overview TO service_role;
