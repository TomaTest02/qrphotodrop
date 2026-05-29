-- ═══════════════════════════════════════════════════════════════
-- QRPhotoDrop — Schema completă Supabase
-- Rulează acest script în Supabase → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. Tabel USERS (organizatori + admini) ─────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'organizer' CHECK (role IN ('organizer', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
  must_change_password BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Tabel EVENTS (evenimentele create) ──────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  event_code TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL CHECK (event_type IN ('nunta', 'botez', 'aniversare', 'corporate')),
  event_date TIMESTAMPTZ,
  couple_names TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  max_guests INTEGER DEFAULT 100,
  max_storage_bytes BIGINT DEFAULT 26843545600, -- 25 GB default
  package_type TEXT,
  package_tier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. Tabel UPLOADS (poze + clipuri de la invitați) ───────
CREATE TABLE IF NOT EXISTS public.uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('photo', 'video')),
  r2_key TEXT NOT NULL,
  public_url TEXT,
  original_name TEXT,
  size_bytes BIGINT DEFAULT 0,
  sender_name TEXT,
  sender_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. Tabel WISHES (urări de la invitați) ─────────────────
CREATE TABLE IF NOT EXISTS public.wishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 5. Tabel ORDERS (comenzi Stripe) ───────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent TEXT,
  package_type TEXT NOT NULL,
  package_tier TEXT NOT NULL,
  package_label TEXT,
  amount_total INTEGER, -- în bani (ex: 27900 = 279.00 RON)
  currency TEXT DEFAULT 'ron',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  organizer_email TEXT,
  organizer_name TEXT,
  event_name TEXT,
  event_date TIMESTAMPTZ,
  event_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 6. Tabel ARCHIVES (arhive ZIP generate) ────────────────
CREATE TABLE IF NOT EXISTS public.archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  r2_key TEXT,
  download_url TEXT,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'expired')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 7. Tabel CONTACT_MESSAGES (formularul de contact) ──────
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  event_type TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 8. Tabel BLOG_POSTS (articole blog) ────────────────────
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author TEXT DEFAULT 'QRPhotoDrop',
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXURI pentru performanță
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_events_user_id ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_event_code ON public.events(event_code);
CREATE INDEX IF NOT EXISTS idx_uploads_event_id ON public.uploads(event_id);
CREATE INDEX IF NOT EXISTS idx_wishes_event_id ON public.wishes(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session ON public.orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(published);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS) — protecție la nivel de rând
-- ═══════════════════════════════════════════════════════════════

-- Activare RLS pe toate tabelele
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- ── USERS: organizatorul își vede doar propriul profil ──────
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- ── EVENTS: organizatorul vede doar evenimentul lui ─────────
CREATE POLICY "Organizers can view own events"
  ON public.events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Organizers can update own events"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id);

-- ── UPLOADS: organizatorul vede upload-urile evenimentului său
CREATE POLICY "Organizers can view event uploads"
  ON public.uploads FOR SELECT
  USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

-- Invitații (anonimi) pot insera upload-uri — via service_role din API
CREATE POLICY "Anyone can insert uploads via API"
  ON public.uploads FOR INSERT
  WITH CHECK (true);

-- ── WISHES: organizatorul vede urările; oricine poate insera ─
CREATE POLICY "Organizers can view event wishes"
  ON public.wishes FOR SELECT
  USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

CREATE POLICY "Anyone can insert wishes"
  ON public.wishes FOR INSERT
  WITH CHECK (true);

-- ── ORDERS: utilizatorul vede doar comenzile lui ────────────
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- ── ARCHIVES: organizatorul vede doar arhivele evenimentului ─
CREATE POLICY "Organizers can view own archives"
  ON public.archives FOR SELECT
  USING (
    event_id IN (SELECT id FROM public.events WHERE user_id = auth.uid())
  );

-- ── CONTACT MESSAGES: oricine poate trimite ─────────────────
CREATE POLICY "Anyone can insert contact messages"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

-- ── BLOG POSTS: toată lumea citește articolele publicate ────
CREATE POLICY "Anyone can read published blog posts"
  ON public.blog_posts FOR SELECT
  USING (published = true);

-- ── EVENTS: acces public pentru lookup după cod (upload guest)
CREATE POLICY "Anyone can lookup event by code"
  ON public.events FOR SELECT
  USING (true);

-- ═══════════════════════════════════════════════════════════════
-- ADMIN: bypass complet RLS prin service_role key
-- (API-urile admin folosesc SUPABASE_SERVICE_ROLE_KEY care
--  ocolește automat RLS-ul — nu e nevoie de politici extra)
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════
-- FUNCȚIE: auto-update updated_at
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_events
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_blog_posts
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
