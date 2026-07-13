-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK pentru 20260713210000_events_user_unique.sql
--
-- Scoate regula „un cont = un eveniment" din DB. Nu șterge niciun rând.
-- (Ruta /api/events/create continuă să verifice în cod — doar apărarea finală
--  împotriva cererilor concurente dispare.)
-- ═══════════════════════════════════════════════════════════════════════════

drop index if exists public.events_user_id_unique;
