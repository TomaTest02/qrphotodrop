-- ─────────────────────────────────────────────────────────────────────────────
-- Sesiuni multipart + rezervare ATOMICĂ a spațiului de stocare.
-- Motiv: rutele de upload sunt PUBLICE. Nu avem încredere în r2Key/uploadId
-- trimise de browser — le ținem în DB și le validăm prin sessionId. Rezervarea
-- împiedică mai multe uploaduri simultane să depășească plafonul evenimentului.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.multipart_sessions (
  id                   uuid primary key default gen_random_uuid(),
  event_id             uuid not null references public.events(id) on delete cascade,
  r2_key               text not null unique,
  upload_id            text not null,
  expected_size_bytes  bigint not null,
  part_size_bytes      integer not null,
  total_parts          integer not null,
  status               text not null default 'pending'
                         check (status in ('pending','uploading','completed','failed','aborted')),
  created_at           timestamptz not null default now(),
  expires_at           timestamptz not null
);

create index if not exists multipart_sessions_event_status_idx
  on public.multipart_sessions (event_id, status);

-- Rezervare atomică: blochează rândul evenimentului (FOR UPDATE → serializează
-- cererile concurente), verifică used + reserved + nou <= max, inserează sesiunea
-- (pending) și întoarce id-ul. Întoarce NULL dacă nu mai e loc.
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
