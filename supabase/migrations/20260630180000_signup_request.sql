-- ═══════════════════════════════════════════════════════════════
-- Comanda la înregistrare: pachet + dată eveniment alese de client
-- Le stocăm pe users (requested_*) ca să apară în admin la conturile pending,
-- iar la Aprobare evenimentul se creează automat din ele.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS requested_event_name   TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS requested_event_type   TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS requested_package_tier TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS requested_event_date   TIMESTAMPTZ;

-- Trigger-ul copiază comanda din metadata-ul de signup în coloanele users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, email, role, status, phone,
    requested_event_name, requested_event_type, requested_package_tier, requested_event_date
  )
  VALUES (
    new.id, new.email, 'organizer', 'pending',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'event_name',
    new.raw_user_meta_data->>'event_type',
    new.raw_user_meta_data->>'package_tier',
    NULLIF(new.raw_user_meta_data->>'event_date', '')::timestamptz
  )
  ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreăm view-ul admin ca să includă cererea (requested_*)
DROP VIEW IF EXISTS public.admin_account_overview;
CREATE VIEW public.admin_account_overview
WITH (security_invoker = true) AS
SELECT
  u.id, u.email, u.role, u.status, u.phone, u.must_change_password, u.created_at,
  u.requested_event_name, u.requested_event_type, u.requested_package_tier, u.requested_event_date,
  e.id AS event_id, e.event_name, e.event_type, e.event_date, e.event_code,
  e.location, e.couple_names, e.status AS event_status,
  e.package_type, e.package_tier, e.max_storage_bytes, e.max_guests,
  e.is_gallery_public, e.amount_paid, e.payment_status, e.paid_at, e.expires_at,
  COALESCE(up.photo_count, 0)  AS photo_count,
  COALESCE(up.video_count, 0)  AS video_count,
  COALESCE(up.storage_used, 0) AS storage_used,
  COALESCE(w.wish_count, 0)    AS wish_count
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
) w ON w.event_id = e.id;

REVOKE ALL ON public.admin_account_overview FROM anon, authenticated;
GRANT SELECT ON public.admin_account_overview TO service_role;
