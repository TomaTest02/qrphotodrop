-- ═══════════════════════════════════════════════════════════════
-- #1 Aprobare manuală: conturile noi sunt 'pending' până le aprobă adminul
-- Recreăm trigger-ul handle_new_user ca să seteze status = 'pending'.
-- (înainte nu seta status → default-ul era 'active', deci aprobarea
--  manuală nu se declanșa niciodată)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role, status, phone)
  VALUES (
    new.id,
    new.email,
    'organizer',
    'pending',
    new.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET phone = EXCLUDED.phone;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger-ul rămâne același (on_auth_user_created) — doar funcția s-a schimbat.
