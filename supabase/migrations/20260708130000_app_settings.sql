-- ═══════════════════════════════════════════════════════════════
-- Setări globale (feature flags) controlate din admin.
-- Prima: public_gallery_enabled — dacă e 'false', opțiunea „galerie
-- publică" dispare din dashboard-uri și galeria e oprită la toate conturile.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (key, value)
VALUES ('public_gallery_enabled', 'true')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Flag public (nesecret): oricine îl poate CITI; scrierea doar prin service_role (API admin).
DROP POLICY IF EXISTS "Anyone can read app settings" ON public.app_settings;
CREATE POLICY "Anyone can read app settings" ON public.app_settings FOR SELECT USING (true);

GRANT SELECT ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.app_settings TO service_role;
