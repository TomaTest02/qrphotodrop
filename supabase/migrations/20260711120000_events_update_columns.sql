-- ─────────────────────────────────────────────────────────────────────────────
-- Restrânge ce poate modifica un ORGANIZATOR (rol `authenticated`), din browser,
-- pe propriul eveniment. Fără asta, un client putea să-și modifice singur
-- max_storage_bytes / package_tier / status / expires_at etc. (auto-upgrade).
--
-- `service_role` (API-ul de admin) NU e afectat — adminul poate modifica orice.
-- Coloanele permise = EXACT ce editează dashboard-ul (verificat în cod):
--   is_gallery_public, whatsapp_message, event_name, couple_names, location.
-- `event_date` rămâne DOAR admin (decizie de produs).
-- ─────────────────────────────────────────────────────────────────────────────

REVOKE UPDATE ON public.events FROM anon, authenticated;

GRANT UPDATE (
  event_name,
  couple_names,
  location,
  is_gallery_public,
  whatsapp_message
) ON public.events TO authenticated;
