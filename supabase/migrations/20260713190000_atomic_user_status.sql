-- ─────────────────────────────────────────────────────────────────────────────
-- Suspendarea contului trebuie să fie ATOMICĂ: userul și evenimentul lui se
-- modifică ÎMPREUNĂ. Înainte erau două update-uri separate — dacă al doilea
-- eșua, userul apărea suspendat, dar evenimentul rămânea activ și invitații
-- puteau încărca în continuare.
--
-- Coloana `deactivated_by_suspension` reține DE CE a fost oprit un eveniment,
-- ca la reactivare să repornim DOAR evenimentele oprite din cauza suspendării
-- (nu și pe cele dezactivate de ștergerea contului sau manual).
-- ─────────────────────────────────────────────────────────────────────────────

-- SIGURANȚĂ: tabelul `events` e citit/scris de upload-urile în curs. ALTER TABLE cere
-- un lock scurt; dacă prinde unul ocupat, vrem să EȘUEZE rapid, nu să stea la coadă și
-- să blocheze upload-urile invitaților. Adăugarea unei coloane cu DEFAULT constant e
-- oricum metadata-only în Postgres 11+ (instant, fără rescrierea tabelului).
set lock_timeout = '3s';

alter table public.events
  add column if not exists deactivated_by_suspension boolean not null default false;

reset lock_timeout;

create or replace function public.set_user_status(
  p_user_id uuid,
  p_status  text
) returns void
language plpgsql
set search_path = ''
as $$
declare
  v_found boolean;
begin
  if p_status not in ('pending', 'active', 'suspended') then
    raise exception 'INVALID_STATUS' using errcode = '22023';
  end if;

  -- Lock pe user → operația se serializează cu orice altă schimbare de status
  select true into v_found from public.users where id = p_user_id for update;
  if not found then
    raise exception 'USER_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.users set status = p_status where id = p_user_id;

  if p_status = 'suspended' then
    -- Oprim DOAR evenimentele ACTIVE și marcăm motivul (suspendare).
    -- Evenimentele `expired` sau deja `inactive` NU sunt atinse.
    update public.events
       set status = 'inactive',
           deactivated_by_suspension = true
     where user_id = p_user_id
       and status = 'active';

  elsif p_status = 'active' then
    -- Repornim DOAR evenimentele oprite DIN CAUZA suspendării.
    -- Un eveniment `inactive` din alt motiv (ex. ștergere de cont în curs)
    -- rămâne oprit. Un eveniment `expired` nu e atins niciodată.
    update public.events
       set status = 'active',
           deactivated_by_suspension = false
     where user_id = p_user_id
       and status = 'inactive'
       and deactivated_by_suspension = true;
  end if;

  -- Totul rulează într-o singură tranzacție: dacă orice update eșuează,
  -- se anulează TOT (userul NU rămâne suspendat cu evenimentul activ).
end;
$$;

revoke execute on function public.set_user_status(uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_user_status(uuid, text)
  to service_role;
