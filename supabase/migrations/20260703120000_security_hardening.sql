-- ═══════════════════════════════════════════════════════════════════════════
-- Security hardening (2026-07-03)
--
-- Repară două probleme reale de access control descoperite în auditul de cod:
--
-- 1. ESCALADARE DE PRIVILEGII: politica "Users can update own profile" avea doar
--    USING (auth.uid() = id) și niciun WITH CHECK pe coloane. Un user autentificat
--    putea rula din browser (cu cheia anon):
--        supabase.from('users').update({ role: 'admin' }).eq('id', <id-ul lui>)
--    și devenea admin, pentru că verificarea se făcea doar pe `id`, nu pe `role`.
--
-- 2. RÂNDURI FORJATE: politicile INSERT cu WITH CHECK (true) pe uploads/wishes/
--    contact_messages permiteau oricui cu cheia anon publică să insereze rânduri
--    arbitrare direct prin PostgREST, ocolind toate validările din API
--    (cotă storage, whitelist MIME, event activ etc.).
--
-- Toate inserturile legitime se fac prin service_role (care ocolește RLS), iar
-- singura actualizare client-side pe `users` este `must_change_password`
-- (în /first-login). Deci restrângerile de mai jos nu afectează fluxurile reale.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Blocăm escaladarea de privilegii pe public.users ─────────────────────
-- Defense-in-depth la nivel de RLS (WITH CHECK explicit)...
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ...și enforcement real la nivel de coloană: userul autentificat poate schimba
-- DOAR must_change_password pe rândul lui. role/status/phone se schimbă exclusiv
-- prin API-urile admin (service_role, neafectat de aceste grant-uri).
REVOKE UPDATE ON public.users FROM authenticated, anon;
GRANT UPDATE (must_change_password) ON public.users TO authenticated;

-- ── 2. Eliminăm inserturile anon forjabile ──────────────────────────────────
-- service_role ocolește RLS, deci API-urile de upload/wishes/contact continuă
-- să funcționeze; doar scrierile directe cu cheia anon sunt oprite.
DROP POLICY IF EXISTS "Anyone can insert uploads via API" ON public.uploads;
DROP POLICY IF EXISTS "Anyone can insert wishes" ON public.wishes;
DROP POLICY IF EXISTS "Anyone can insert contact messages" ON public.contact_messages;
