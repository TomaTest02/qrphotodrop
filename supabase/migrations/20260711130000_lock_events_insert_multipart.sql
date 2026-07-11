-- ─────────────────────────────────────────────────────────────────────────────
-- Hardening DB (runda 2, după audit):
-- 1) Închidem INSERT pe events din client. Evenimentele se creează DOAR pe server
--    (service_role: /api/events/create + /api/admin/*). Fără asta, un organizator
--    logat putea crea singur evenimente cu propriile valori de plan/storage/status.
-- 2) Blocăm complet `multipart_sessions` + funcția de rezervare din client
--    (sunt folosite EXCLUSIV server-side). service_role rămâne cu acces complet.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) events: fără INSERT din client
REVOKE INSERT ON public.events FROM anon, authenticated;
DROP POLICY IF EXISTS "Organizers can insert own events" ON public.events;

-- 2) multipart_sessions: doar server-side
ALTER TABLE public.multipart_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.multipart_sessions FROM anon, authenticated;
GRANT ALL ON public.multipart_sessions TO service_role;

-- 3) funcția de rezervare: doar service_role o poate executa
REVOKE EXECUTE ON FUNCTION public.reserve_multipart_session(uuid, text, text, bigint, integer, integer, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_multipart_session(uuid, text, text, bigint, integer, integer, timestamptz)
  TO service_role;
