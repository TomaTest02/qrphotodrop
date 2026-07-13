-- ═══════════════════════════════════════════════════════════════════════════
-- ROLLBACK pentru 20260713170000_atomic_event_writes.sql
--
-- CÂND se rulează: DOAR dacă migrarea a fost aplicată, dar codul NOU nu a fost
-- încă deployat (sau tocmai a fost dat înapoi). Repune baza exact ca înainte.
--
-- SIGURANȚĂ: nu atinge NICIUN rând de date. Doar restaurează o funcție,
-- șterge 3 funcții noi (pe care nimeni nu le cheamă) și un tabel nou (gol).
-- ═══════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Restaurăm funcția VECHE reserve_multipart_session (exact ca înainte) ──
create or replace function public.reserve_multipart_session(
  p_event_id      uuid,
  p_r2_key        text,
  p_upload_id     text,
  p_expected_size bigint,
  p_part_size     integer,
  p_total_parts   integer,
  p_expires_at    timestamptz
) returns uuid
language plpgsql
as $$
declare
  v_max      bigint;
  v_used     bigint;
  v_reserved bigint;
  v_id       uuid;
begin
  -- lock pe rândul evenimentului → rezervările concurente se serializează
  select max_storage_bytes into v_max from public.events where id = p_event_id for update;
  if v_max is null then
    return null;
  end if;

  select coalesce(sum(size_bytes), 0) into v_used
    from public.uploads where event_id = p_event_id;

  select coalesce(sum(expected_size_bytes), 0) into v_reserved
    from public.multipart_sessions
    where event_id = p_event_id
      and status in ('pending','uploading')
      and expires_at > now();

  if v_used + v_reserved + p_expected_size > v_max then
    return null; -- fără loc
  end if;

  insert into public.multipart_sessions
    (event_id, r2_key, upload_id, expected_size_bytes, part_size_bytes, total_parts, status, expires_at)
  values
    (p_event_id, p_r2_key, p_upload_id, p_expected_size, p_part_size, p_total_parts, 'pending', p_expires_at)
  returning id into v_id;

  return v_id;
end;
$$;

-- păstrăm granturile ca înainte (doar server-side)
revoke execute on function public.reserve_multipart_session(uuid, text, text, bigint, integer, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.reserve_multipart_session(uuid, text, text, bigint, integer, integer, timestamptz)
  to service_role;

-- ─── 2. Ștergem funcțiile NOI (nimic nu le cheamă dacă noul cod nu e live) ────
drop function if exists public.finalize_upload_atomic(uuid, text, text, text, bigint, text, uuid);
drop function if exists public.insert_wish_if_event_active(uuid, text, text, text, text);
drop function if exists public.purge_expired_event_data(uuid);

-- ─── 3. Ștergem tabelul nou ───────────────────────────────────────────────────
-- ATENȚIE: dacă noul cod a rulat și cineva și-a șters contul, aici pot exista
-- job-uri de curățare R2 în așteptare. Verifică întâi că e gol:
--   select count(*) from public.storage_deletion_jobs;
-- Dacă e 0 (cazul normal la rollback pre-deploy), poți șterge liniștit.
drop table if exists public.storage_deletion_jobs;

commit;
