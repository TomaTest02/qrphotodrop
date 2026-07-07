-- ═══════════════════════════════════════════════════════════════
-- Metodă de rezervă: numele plannerului scris manual la înscriere
--
-- Dacă înscrierea NU vine prin link-ul /register/<slug>, clientul poate scrie
-- numele plannerului într-un câmp opțional. Textul se salvează mereu în
-- users.referred_by_name (nu se pierde). Dacă se potrivește exact (case-insensitive)
-- cu un planner activ, se atribuie automat (referred_by). Altfel, adminul îl
-- atribuie manual din pagina contului.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referred_by_name TEXT;

-- Trigger: rezolvă întâi slug-ul (din link), apoi numele scris manual
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  ref_id   UUID;
  ref_name TEXT;
BEGIN
  ref_name := NULLIF(btrim(new.raw_user_meta_data->>'referrer_name'), '');

  -- 1) după slug (link de recomandare)
  SELECT id INTO ref_id
    FROM public.wedding_planners
    WHERE slug = new.raw_user_meta_data->>'referrer_slug'
      AND active = true
    LIMIT 1;

  -- 2) dacă n-a venit prin link, încercăm potrivire exactă după nume
  IF ref_id IS NULL AND ref_name IS NOT NULL THEN
    SELECT id INTO ref_id
      FROM public.wedding_planners
      WHERE lower(btrim(name)) = lower(ref_name)
        AND active = true
      LIMIT 1;
  END IF;

  INSERT INTO public.users (
    id, email, role, status, phone,
    requested_event_name, requested_event_type, requested_package_tier, requested_event_date,
    referred_by, referred_by_name
  )
  VALUES (
    new.id, new.email, 'organizer', 'pending',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'event_name',
    new.raw_user_meta_data->>'event_type',
    new.raw_user_meta_data->>'package_tier',
    NULLIF(new.raw_user_meta_data->>'event_date', '')::timestamptz,
    ref_id, ref_name
  )
  ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreăm view-ul admin cu referred_by_name
DROP VIEW IF EXISTS public.admin_account_overview;
CREATE VIEW public.admin_account_overview
WITH (security_invoker = true) AS
SELECT
  u.id, u.email, u.role, u.status, u.phone, u.must_change_password, u.created_at,
  u.requested_event_name, u.requested_event_type, u.requested_package_tier, u.requested_event_date,
  u.referred_by, u.referred_by_name,
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
