-- Scrierile publice trebuie să se serializeze cu expirarea/ștergerea evenimentului.
-- Toate funcțiile de mai jos sunt accesibile doar din rutele server-side (service_role).

create table if not exists public.storage_deletion_jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique,
  event_ids   uuid[] not null,
  not_before  timestamptz not null default (now() + interval '2 hours'),
  attempts    integer not null default 0,
  last_error  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.storage_deletion_jobs enable row level security;
revoke all on public.storage_deletion_jobs from public, anon, authenticated;
grant all on public.storage_deletion_jobs to service_role;

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
set search_path = ''
as $$
declare
  v_event    public.events%rowtype;
  v_used     bigint;
  v_reserved bigint;
  v_id       uuid;
begin
  if p_expected_size <= 0
     or p_part_size <= 0
     or p_total_parts <= 0
     or p_total_parts <> ceil(p_expected_size::numeric / p_part_size::numeric)::integer
     or p_expires_at <= now()
     or p_r2_key not like ('events/' || p_event_id::text || '/%')
     or position('..' in p_r2_key) > 0 then
    raise exception 'INVALID_MULTIPART_SESSION' using errcode = '22023';
  end if;

  select * into v_event
    from public.events
    where id = p_event_id
    for update;

  if not found or v_event.status <> 'active' or v_event.max_storage_bytes is null then
    return null;
  end if;

  select coalesce(sum(size_bytes), 0) into v_used
    from public.uploads
    where event_id = p_event_id;

  select coalesce(sum(expected_size_bytes), 0) into v_reserved
    from public.multipart_sessions
    where event_id = p_event_id
      and status in ('pending', 'uploading')
      and expires_at > now();

  if v_used::numeric + v_reserved::numeric + p_expected_size::numeric
       > v_event.max_storage_bytes::numeric then
    return null;
  end if;

  insert into public.multipart_sessions
    (event_id, r2_key, upload_id, expected_size_bytes, part_size_bytes, total_parts, status, expires_at)
  values
    (p_event_id, p_r2_key, p_upload_id, p_expected_size, p_part_size, p_total_parts, 'pending', p_expires_at)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.finalize_upload_atomic(
  p_event_id             uuid,
  p_r2_key               text,
  p_public_url           text,
  p_file_type            text,
  p_size_bytes           bigint,
  p_original_name        text,
  p_multipart_session_id uuid
) returns setof public.uploads
language plpgsql
set search_path = ''
as $$
declare
  v_event    public.events%rowtype;
  v_session  public.multipart_sessions%rowtype;
  v_existing public.uploads%rowtype;
  v_upload   public.uploads%rowtype;
  v_used     bigint;
  v_reserved bigint;
begin
  if p_file_type not in ('photo', 'video')
     or p_size_bytes <= 0
     or p_r2_key not like ('events/' || p_event_id::text || '/%')
     or position('..' in p_r2_key) > 0 then
    raise exception 'INVALID_UPLOAD' using errcode = '22023';
  end if;

  -- Același lock este folosit de rezervare, expirare și ștergerea contului.
  select * into v_event
    from public.events
    where id = p_event_id
    for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Retry-ul aceleiași chei este idempotent, inclusiv după expirarea evenimentului.
  select * into v_existing
    from public.uploads
    where r2_key = p_r2_key;
  if found then
    if p_multipart_session_id is not null then
      update public.multipart_sessions
        set status = 'completed'
        where id = p_multipart_session_id and r2_key = p_r2_key;
    end if;
    return next v_existing;
    return;
  end if;

  if v_event.status <> 'active' then
    raise exception 'EVENT_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  if v_event.max_storage_bytes is null then
    raise exception 'STORAGE_LIMIT_NOT_CONFIGURED' using errcode = 'P0001';
  end if;

  if p_multipart_session_id is not null then
    select * into v_session
      from public.multipart_sessions
      where id = p_multipart_session_id
      for update;

    if not found
       or v_session.event_id <> p_event_id
       or v_session.r2_key <> p_r2_key
       or v_session.expected_size_bytes <> p_size_bytes
       or v_session.status not in ('pending', 'uploading')
       or v_session.expires_at <= now() then
      raise exception 'MULTIPART_SESSION_NOT_ACTIVE' using errcode = 'P0001';
    end if;
  end if;

  select coalesce(sum(size_bytes), 0) into v_used
    from public.uploads
    where event_id = p_event_id;

  -- Uploadurile single-PUT nu pot consuma spațiul deja rezervat de multipart.
  -- La finalizarea multipart excludem chiar rezervarea care devine acum upload real.
  select coalesce(sum(expected_size_bytes), 0) into v_reserved
    from public.multipart_sessions
    where event_id = p_event_id
      and status in ('pending', 'uploading')
      and expires_at > now()
      and (p_multipart_session_id is null or id <> p_multipart_session_id);

  if v_used::numeric + v_reserved::numeric + p_size_bytes::numeric
       > v_event.max_storage_bytes::numeric then
    raise exception 'STORAGE_LIMIT_EXCEEDED' using errcode = 'P0001';
  end if;

  insert into public.uploads
    (event_id, r2_key, public_url, file_type, size_bytes, original_name)
  values
    (p_event_id, p_r2_key, p_public_url, p_file_type, p_size_bytes, p_original_name)
  returning * into v_upload;

  if p_multipart_session_id is not null then
    update public.multipart_sessions
      set status = 'completed'
      where id = p_multipart_session_id;
  end if;

  return next v_upload;
end;
$$;

create or replace function public.insert_wish_if_event_active(
  p_event_id  uuid,
  p_first_name text,
  p_last_name  text,
  p_email      text,
  p_message    text
) returns setof public.wishes
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_wish public.wishes%rowtype;
begin
  select status into v_status
    from public.events
    where id = p_event_id
    for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_status <> 'active' then
    raise exception 'EVENT_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  insert into public.wishes (event_id, first_name, last_name, email, message)
  values (p_event_id, p_first_name, p_last_name, p_email, p_message)
  returning * into v_wish;

  return next v_wish;
end;
$$;

create or replace function public.purge_expired_event_data(p_event_id uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status
    from public.events
    where id = p_event_id
    for update;

  if not found or v_status <> 'expired' then
    return false;
  end if;

  delete from public.uploads where event_id = p_event_id;
  delete from public.archives where event_id = p_event_id;
  delete from public.wishes where event_id = p_event_id;
  delete from public.multipart_sessions where event_id = p_event_id;
  return true;
end;
$$;

revoke execute on function public.reserve_multipart_session(uuid, text, text, bigint, integer, integer, timestamptz)
  from public, anon, authenticated;
revoke execute on function public.finalize_upload_atomic(uuid, text, text, text, bigint, text, uuid)
  from public, anon, authenticated;
revoke execute on function public.insert_wish_if_event_active(uuid, text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public.purge_expired_event_data(uuid)
  from public, anon, authenticated;

grant execute on function public.reserve_multipart_session(uuid, text, text, bigint, integer, integer, timestamptz)
  to service_role;
grant execute on function public.finalize_upload_atomic(uuid, text, text, text, bigint, text, uuid)
  to service_role;
grant execute on function public.insert_wish_if_event_active(uuid, text, text, text, text)
  to service_role;
grant execute on function public.purge_expired_event_data(uuid)
  to service_role;
