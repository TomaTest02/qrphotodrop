-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK pentru 20260713190000_atomic_user_status.sql
--
-- CÂND: doar dacă noul cod NU e deployat (ruta admin apelează set_user_status).
-- SIGURANȚĂ: nu șterge niciun rând. Doar scoate o funcție și o coloană.
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- 1. Scoatem funcția (nimeni n-o cheamă dacă noul cod nu e live)
drop function if exists public.set_user_status(uuid, text);

-- 2. Scoatem coloana.
-- ATENȚIE: dacă între timp au fost suspendate conturi, informația „acest eveniment
-- a fost oprit din cauza suspendării" se pierde. Evenimentele rămân `inactive` —
-- reactivarea lor va trebui făcută manual. Verifică întâi:
--   select count(*) from public.events where deactivated_by_suspension;
set lock_timeout = '3s';
alter table public.events drop column if exists deactivated_by_suspension;
reset lock_timeout;

commit;
