-- ═══════════════════════════════════════════════════════════════
-- Curățare: eliminăm modulul invitație digitală + RSVP
-- - dropăm view-ul (depinde de rsvps), apoi tabelul rsvps
-- - dropăm coloana events.invitation_details (nefolosită)
-- - recreăm view-ul admin fără coloanele RSVP
-- ═══════════════════════════════════════════════════════════════

-- 1. dropăm view-ul (ca să putem șterge rsvps de care depinde)
DROP VIEW IF EXISTS public.admin_account_overview;

-- 2. ștergem tabelul rsvps + coloana invitation_details
DROP TABLE IF EXISTS public.rsvps;
ALTER TABLE public.events DROP COLUMN IF EXISTS invitation_details;

-- 3. recreăm view-ul admin fără RSVP
CREATE VIEW public.admin_account_overview
WITH (security_invoker = true) AS
SELECT
  u.id, u.email, u.role, u.status, u.phone, u.must_change_password, u.created_at,
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
