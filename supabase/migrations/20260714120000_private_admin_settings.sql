-- Valorile operaționale și lista managerilor nu sunt informații publice.
-- Clientul organizatorului are nevoie doar de flag-ul galeriei.
set lock_timeout = '3s';

drop policy if exists "Anyone can read app settings" on public.app_settings;
drop policy if exists "Public can read safe app settings" on public.app_settings;

create policy "Public can read safe app settings"
  on public.app_settings
  for select
  to anon, authenticated
  using (key in ('public_gallery_enabled'));

-- service_role păstrează accesul complet pentru rutele server/admin și cron.

-- Trigger-ul de signup rulează cu privilegii ridicate: blocăm hijacking-ul prin
-- search_path și nu permitem apelarea lui directă din rolurile API.
alter function public.handle_new_user() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.handle_new_user() to supabase_auth_admin;

reset lock_timeout;
