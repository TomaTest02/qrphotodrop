# CloudMemories — Prompt Complet pentru Generare Aplicație

> Acest document este un prompt detaliat pentru un AI care va genera întreaga aplicație.
> Citește tot documentul înainte de a scrie orice cod.

---

## 1. CE TREBUIE SĂ CONSTRUIEȘTI

O platformă SaaS numită **CloudMemories** (domeniu: `cloudofmemories.ro`) care permite organizatorilor de evenimente (nunți, botezuri, aniversări, corporate) să colecteze poze, clipuri și urări de la invitați prin scanarea unui cod QR.

**Conceptul central:**
- Organizatorul creează un eveniment și primește un cod QR unic
- Invitații scanează QR-ul și pot încărca poze/clipuri sau trimite urări — **fără să instaleze nimic, fără cont**
- Organizatorul descarcă toate fișierele dintr-un dashboard, grupate și organizate

---

## 2. STACK TEHNIC — OBLIGATORIU

```
Framework:    Next.js 15 cu App Router
Limbaj:       JavaScript (NU TypeScript)
Stilizare:    CSS Modules + variabile CSS globale (NU Tailwind, NU styled-components)
Animații:     GSAP 3 + ScrollTrigger (instalat ca pachet npm)
Auth + DB:    Supabase (PostgreSQL + Supabase Auth + Row Level Security)
Fișiere:      Cloudflare R2 (S3-compatible, zero egress fees)
Plăți:        Stripe Checkout + Stripe Webhooks
Email:        Resend
QR Code:      librăria npm "qrcode"
Arhivă:       librăria npm "archiver" (pentru ZIP streaming)
Deploy:       Vercel
```

**Pachete npm de instalat:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2",
    "@supabase/ssr": "^0",
    "@aws-sdk/client-s3": "^3",
    "@aws-sdk/s3-request-presigner": "^3",
    "gsap": "^3",
    "stripe": "^16",
    "resend": "^4",
    "qrcode": "^1",
    "archiver": "^7",
    "uuid": "^9"
  }
}
```

---

## 3. DESIGN SYSTEM

### 3.1 Direcție vizuală
**Editorial Luxury** — inspirat din reviste premium de evenimente. Crem/off-white ca fundal, violet profund ca accent principal, tipografie mixtă serif+sans, spații generoase, animații fluide cu GSAP.

### 3.2 Paleta de culori (variabile CSS globale în `app/globals.css`)

```css
:root {
  /* Fundal principal */
  --color-cream:        #f5f0e8;
  --color-cream-dark:   #ede8df;
  --color-cream-darker: #e0d9cc;

  /* Accent principal */
  --color-violet:       #2d1b69;
  --color-violet-mid:   #4a3580;
  --color-violet-light: #6b5ca5;
  --color-violet-pale:  #e8e4f5;
  --color-violet-ultra: #f3f0fc;

  /* Text */
  --color-text:         #1a0f3c;
  --color-text-muted:   #6b7280;
  --color-text-light:   #9ca3af;

  /* Accent secundar */
  --color-gold:         #c9a227;
  --color-gold-light:   #f5d76e;

  /* Stări */
  --color-success:      #10b981;
  --color-error:        #ef4444;
  --color-warning:      #f59e0b;

  /* Alb */
  --color-white:        #ffffff;

  /* Umbre */
  --shadow-sm:    0 1px 3px rgba(45,27,105,0.08);
  --shadow-md:    0 4px 16px rgba(45,27,105,0.12);
  --shadow-lg:    0 8px 32px rgba(45,27,105,0.16);
  --shadow-xl:    0 16px 64px rgba(45,27,105,0.20);

  /* Border radius */
  --radius-sm:    6px;
  --radius-md:    12px;
  --radius-lg:    20px;
  --radius-xl:    32px;
  --radius-full:  9999px;

  /* Spacing */
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:   16px;
  --space-lg:   24px;
  --space-xl:   40px;
  --space-2xl:  64px;
  --space-3xl:  96px;

  /* Tranziții */
  --transition-fast:   0.15s ease;
  --transition-mid:    0.3s ease;
  --transition-slow:   0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

### 3.3 Tipografie

```css
/* În <head> din layout.js — importă din Google Fonts */
/* Playfair Display: 400, 700, 900 italic */
/* Inter: 400, 500, 600, 700, 800 */

:root {
  --font-serif: 'Playfair Display', Georgia, serif;
  --font-sans:  'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

/* Scale tipografic */
/* Display: 72-96px Playfair Display 900, letter-spacing: -3px */
/* H1: 48-64px Playfair Display 700, letter-spacing: -2px */
/* H2: 36-48px Playfair Display 700, letter-spacing: -1.5px */
/* H3: 24-32px Inter 700, letter-spacing: -0.5px */
/* Body: 16px Inter 400, line-height: 1.7 */
/* Small: 13px Inter 400, line-height: 1.6 */
/* Label: 11px Inter 700, letter-spacing: 2px, text-transform: uppercase */
```

### 3.4 Animații GSAP

**Instalare în componentă:**
```javascript
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
gsap.registerPlugin(ScrollTrigger);
```

**Animații de folosit:**

1. **Hero text reveal** (pe homepage):
```javascript
// Split titlul pe cuvinte și animă fiecare cu stagger
gsap.from(words, {
  y: 80,
  opacity: 0,
  duration: 0.8,
  stagger: 0.12,
  ease: 'power3.out',
  delay: 0.3
});
```

2. **Section fade-in cu ScrollTrigger** (pe toate secțiunile):
```javascript
gsap.from(element, {
  scrollTrigger: { trigger: element, start: 'top 80%' },
  y: 40,
  opacity: 0,
  duration: 0.7,
  ease: 'power2.out'
});
```

3. **Stagger cards** (pricing cards, feature cards):
```javascript
gsap.from(cards, {
  scrollTrigger: { trigger: container, start: 'top 75%' },
  y: 50,
  opacity: 0,
  duration: 0.6,
  stagger: 0.1,
  ease: 'power2.out'
});
```

4. **Navbar hide/show la scroll**:
```javascript
ScrollTrigger.create({
  start: 'top -80',
  onUpdate: (self) => {
    if (self.direction === -1) gsap.to(navbar, { y: 0, duration: 0.3 });
    else gsap.to(navbar, { y: '-100%', duration: 0.3 });
  }
});
```

5. **Floating elements pe hero** (cercuri decorative):
```javascript
gsap.to(circle, {
  y: -20,
  duration: 3,
  repeat: -1,
  yoyo: true,
  ease: 'sine.inOut'
});
```

6. **Outline text reveal** (tipografie editorială):
```javascript
// Titlu cu -webkit-text-stroke care se umple la scroll
gsap.fromTo(outlineText,
  { webkitTextFillColor: 'transparent' },
  {
    scrollTrigger: { trigger: outlineText, start: 'top 60%', scrub: 1 },
    webkitTextFillColor: 'var(--color-violet)',
    duration: 1
  }
);
```

---

## 4. STRUCTURA FIȘIERELOR (COMPLETĂ)

```
/
├── app/
│   ├── globals.css                          ← CSS global: variabile, reset, tipografie
│   ├── layout.js                            ← Root layout (Google Fonts import)
│   │
│   ├── (marketing)/                         ← Grup rute: site prezentare (PUBLIC)
│   │   ├── layout.js                        ← Include Navbar + Footer marketing
│   │   ├── page.js                          ← Homepage
│   │   ├── eveniment/
│   │   │   └── [type]/
│   │   │       └── page.js                  ← nunta | botez | aniversare | corporate
│   │   ├── preturi/
│   │   │   └── page.js                      ← Pagina prețuri cu selector tip eveniment
│   │   ├── blog/
│   │   │   ├── page.js                      ← Lista articole blog
│   │   │   └── [slug]/
│   │   │       └── page.js                  ← Articol individual
│   │   └── contact/
│   │       └── page.js                      ← Pagina contact cu formular
│   │
│   ├── (app)/                               ← Grup rute: zona autentificată ORGANIZATOR
│   │   ├── login/
│   │   │   └── page.js                      ← Login cu email + parolă
│   │   ├── first-login/
│   │   │   └── page.js                      ← Schimbare parolă + verificare telefon
│   │   └── dashboard/
│   │       ├── layout.js                    ← Layout cu sidebar
│   │       ├── evenimentul-meu/
│   │       │   └── page.js                  ← Dashboard principal organizator
│   │       └── contul-meu/
│   │           └── page.js                  ← Setări cont
│   │
│   ├── (admin)/                             ← Grup rute: panou ADMIN
│   │   └── admin/
│   │       ├── layout.js                    ← Layout admin cu sidebar
│   │       ├── page.js                      ← Dashboard admin
│   │       ├── conturi/
│   │       │   └── page.js                  ← Gestionare conturi
│   │       └── blog/
│   │           └── page.js                  ← CMS blog
│   │
│   ├── upload/
│   │   └── [eventCode]/
│   │       └── page.js                      ← Pagina guest (FĂRĂ AUTH, acces public)
│   │
│   └── api/
│       ├── auth/
│       │   └── callback/
│       │       └── route.js                 ← Callback Supabase Auth
│       ├── upload/
│       │   ├── presigned/
│       │   │   └── route.js                 ← POST: generează presigned URL pentru R2
│       │   └── confirm/
│       │       └── route.js                 ← POST: confirmă upload în tabelul uploads
│       ├── wishes/
│       │   └── route.js                     ← POST: creează urare în DB
│       ├── events/
│       │   └── route.js                     ← GET: obține eveniment după eventCode
│       ├── archive/
│       │   └── route.js                     ← POST: declanșează generare arhivă async
│       ├── contact/
│       │   └── route.js                     ← POST: trimite formular contact via Resend
│       ├── stripe/
│       │   ├── checkout/
│       │   │   └── route.js                 ← POST: creează sesiune Stripe Checkout
│       │   └── webhook/
│       │       └── route.js                 ← POST: handler webhook Stripe
│       └── admin/
│           ├── accounts/
│           │   └── route.js                 ← GET/POST/PATCH/DELETE: CRUD conturi
│           ├── approve/
│           │   └── route.js                 ← POST: aprobă cerere cont, creează user Supabase
│           └── otp/
│               └── route.js                 ← POST: generează parolă temporară pentru cont
│
├── components/
│   ├── ui/                                  ← Componente UI reutilizabile
│   │   ├── Button.js + Button.module.css
│   │   ├── Modal.js + Modal.module.css
│   │   ├── Toast.js + Toast.module.css
│   │   └── Spinner.js + Spinner.module.css
│   │
│   ├── marketing/                           ← Componente site prezentare
│   │   ├── Navbar.js + Navbar.module.css
│   │   ├── Footer.js + Footer.module.css
│   │   ├── Hero.js + Hero.module.css        ← Hero cu GSAP
│   │   ├── HowItWorks.js + .module.css
│   │   ├── PricingCard.js + .module.css
│   │   ├── PricingSection.js + .module.css  ← Cu selector tip eveniment
│   │   ├── FAQ.js + FAQ.module.css
│   │   └── CTABanner.js + CTABanner.module.css
│   │
│   ├── dashboard/                           ← Componente dashboard organizator
│   │   ├── DashboardSidebar.js + .module.css
│   │   ├── QRDisplay.js + .module.css       ← Afișează QR + link copiabil
│   │   ├── UploadsFeed.js + .module.css     ← Grid cu poze + clipuri
│   │   ├── WishesFeed.js + .module.css      ← Lista urări
│   │   ├── ArchiveButton.js + .module.css   ← Buton generare arhivă
│   │   └── QRDesignPicker.js + .module.css  ← Catalog design-uri cartonașe
│   │
│   ├── upload/                              ← Componente pagina guest
│   │   ├── UploadChoice.js + .module.css    ← Ecran inițial cu 2 butoane
│   │   ├── PhotoUploader.js + .module.css   ← Upload poze (galerie/cameră)
│   │   ├── VideoUploader.js + .module.css   ← Upload video (galerie/cameră)
│   │   ├── WishForm.js + .module.css        ← Formular urare
│   │   └── SuccessMessage.js + .module.css  ← Mesaj succes + buton închide
│   │
│   └── admin/                              ← Componente panou admin
│       ├── AdminSidebar.js + .module.css
│       ├── AccountsTable.js + .module.css
│       ├── AccountRequestCard.js + .module.css
│       └── BlogEditor.js + .module.css      ← Editor Markdown simplu
│
├── lib/
│   ├── supabase/
│   │   ├── client.js                        ← createBrowserClient (pentru componente client)
│   │   ├── server.js                        ← createServerClient (pentru Server Components)
│   │   └── admin.js                         ← createClient cu SERVICE_ROLE_KEY (doar server)
│   ├── r2.js                                ← S3Client pentru R2, funcții: getPresignedUrl, deleteObject
│   ├── stripe.js                            ← Stripe client + PACKAGES config
│   ├── resend.js                            ← Resend client + funcții: sendArchiveReady, sendOTP, sendContact
│   ├── qrcode.js                            ← generateQRCode(url) → PNG Buffer
│   └── archive.js                           ← generateArchive(eventId) → stream ZIP în R2
│
├── middleware.js                            ← Protejează rutele /dashboard și /admin
├── .env.local                               ← Variabile de mediu (NU se commitează)
├── .env.example                             ← Template variabile de mediu
├── next.config.mjs
└── package.json
```

---

## 5. BAZA DE DATE — SQL COMPLET (Supabase PostgreSQL)

Rulează acest SQL în Supabase SQL Editor:

```sql
-- EXTENSII
create extension if not exists "uuid-ossp";

-- ENUM-URI
create type user_role as enum ('organizer', 'admin');
create type user_status as enum ('active', 'blocked', 'pending');
create type event_type as enum ('nunta', 'botez', 'aniversare', 'corporate');
create type package_type as enum ('intim', 'complet', 'vis');
create type file_type as enum ('photo', 'video');
create type order_status as enum ('pending', 'paid', 'failed');
create type request_status as enum ('pending', 'approved', 'rejected');

-- USERS (extinde auth.users din Supabase)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  phone text,
  role user_role not null default 'organizer',
  status user_status not null default 'active',
  must_change_password boolean not null default false,
  created_at timestamptz not null default now()
);

-- EVENTS
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  organizer_id uuid not null references public.users(id) on delete cascade,
  event_name text not null,
  event_type event_type not null,
  event_date date,
  event_code text unique not null,  -- codul scurt din QR, ex: "ABC123"
  qr_r2_key text,                   -- calea în R2 a imaginii QR
  package_type package_type not null,
  status text not null default 'active',
  storage_expires_at timestamptz,   -- data expirării stocării (3 luni)
  created_at timestamptz not null default now()
);

-- UPLOADS
create table public.uploads (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  r2_key text not null,             -- calea completă în R2
  file_type file_type not null,
  thumbnail_r2_key text,            -- thumbnail pentru video
  size_bytes bigint,
  original_name text,
  created_at timestamptz not null default now()
);

-- WISHES (URĂRI)
create table public.wishes (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,                        -- opțional
  message text not null,
  created_at timestamptz not null default now()
);

-- QR DESIGNS (cataloage design-uri cartonașe)
create table public.qr_designs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  preview_r2_key text not null,      -- imaginea preview în R2
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- BLOG POSTS
create table public.blog_posts (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  content_md text not null,          -- Markdown
  cover_r2_key text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ORDERS (comenzi Stripe)
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  organizer_email text not null,
  stripe_session_id text unique not null,
  package_type package_type not null,
  event_type event_type not null,
  amount_ron integer not null,        -- în bani (ex: 36900 = 369 RON)
  status order_status not null default 'pending',
  event_id uuid references public.events(id),
  created_at timestamptz not null default now()
);

-- ACCOUNT REQUESTS (cereri de cont de la vizitatori)
create table public.account_requests (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  event_type event_type not null,
  package_type package_type not null,
  order_id uuid references public.orders(id),
  status request_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ROW LEVEL SECURITY
alter table public.users enable row level security;
alter table public.events enable row level security;
alter table public.uploads enable row level security;
alter table public.wishes enable row level security;
alter table public.orders enable row level security;

-- Politici RLS de bază (organizatorul vede doar propriile date)
create policy "users_own" on public.users for all using (auth.uid() = id);
create policy "events_own" on public.events for all using (auth.uid() = organizer_id);
create policy "uploads_own" on public.uploads for all using (
  event_id in (select id from public.events where organizer_id = auth.uid())
);
create policy "wishes_own" on public.wishes for all using (
  event_id in (select id from public.events where organizer_id = auth.uid())
);
-- Uploads pot fi create fără auth (pentru guest upload)
create policy "uploads_insert_public" on public.uploads for insert with check (true);
create policy "wishes_insert_public" on public.wishes for insert with check (true);
```

---

## 6. VARIABILE DE MEDIU (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cloudflare R2
CLOUDFLARE_R2_ACCOUNT_ID=abc123
CLOUDFLARE_R2_ACCESS_KEY_ID=xxx
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxx
CLOUDFLARE_R2_BUCKET_NAME=cloudmemories
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Resend
RESEND_API_KEY=re_xxx

# App
NEXT_PUBLIC_APP_URL=https://cloudofmemories.ro
ADMIN_EMAIL=admin@cloudofmemories.ro
```

---

## 7. FIȘIERE CORE (LIB/)

### `lib/supabase/client.js`
```javascript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
```

### `lib/supabase/server.js`
```javascript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        }
      }
    }
  );
}
```

### `lib/supabase/admin.js`
```javascript
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
```

### `lib/r2.js`
```javascript
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

export async function getPresignedUploadUrl(key, contentType, expiresIn = 900) {
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

export function getPublicUrl(key) {
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}
```

### `lib/stripe.js`
```javascript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const PACKAGES = {
  nunta: {
    intim:    { price: 27900, label: 'Nuntă Intimă',    guests: 100 },
    complet:  { price: 36900, label: 'Nuntă Completă',  guests: 250 },
    vis:      { price: 55900, label: 'Nuntă de Vis',    guests: 500 },
  },
  botez: {
    intim:    { price: 24900, label: 'Botez Intim',     guests: 50  },
    complet:  { price: 32900, label: 'Botez Complet',   guests: 150 },
    vis:      { price: 48900, label: 'Botez de Vis',    guests: 300 },
  },
  aniversare: {
    intim:    { price: 24900, label: 'Aniversare Intimă', guests: 50  },
    complet:  { price: 32900, label: 'Aniversare Completă', guests: 150 },
    vis:      { price: 48900, label: 'Aniversare de Vis',   guests: 300 },
  },
  corporate: {
    intim:    { price: 32900, label: 'Corporate Basic',    guests: 100 },
    complet:  { price: 45900, label: 'Corporate Standard', guests: 300 },
    vis:      { price: 69900, label: 'Corporate Premium',  guests: 600 },
  },
};
```

### `lib/resend.js`
```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendArchiveReady(email, downloadUrl) {
  return resend.emails.send({
    from: 'CloudMemories <noreply@cloudofmemories.ro>',
    to: email,
    subject: 'Arhiva ta este gata! 🎉',
    html: `
      <h2>Arhiva evenimentului tău este gata!</h2>
      <p>Poți descărca toate pozele, clipurile și urările folosind linkul de mai jos.</p>
      <p><strong>Linkul este valabil 7 zile.</strong></p>
      <a href="${downloadUrl}" style="background:#2d1b69;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">
        Descarcă Arhiva
      </a>
    `,
  });
}

export async function sendOTP(email, tempPassword) {
  return resend.emails.send({
    from: 'CloudMemories <noreply@cloudofmemories.ro>',
    to: email,
    subject: 'Parolă temporară CloudMemories',
    html: `
      <h2>Parolă temporară</h2>
      <p>Parola ta temporară este: <strong>${tempPassword}</strong></p>
      <p>La prima autentificare vei fi rugat să schimbi această parolă.</p>
    `,
  });
}

export async function sendAdminNotification(subject, body) {
  return resend.emails.send({
    from: 'CloudMemories <noreply@cloudofmemories.ro>',
    to: process.env.ADMIN_EMAIL,
    subject,
    html: body,
  });
}
```

### `lib/qrcode.js`
```javascript
import QRCode from 'qrcode';

export async function generateQRCodeBuffer(url) {
  return QRCode.toBuffer(url, {
    width: 400,
    margin: 2,
    color: { dark: '#2d1b69', light: '#f5f0e8' },
  });
}
```

---

## 8. MIDDLEWARE (Protecție rute)

### `middleware.js`
```javascript
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Protejează dashboard organizator
  if (pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protejează admin
  if (pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verifică rol admin
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard/evenimentul-meu', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
```

---

## 9. PAGINI — SPECIFICAȚII DETALIATE

### 9.1 Homepage (`app/(marketing)/page.js`)

**Secțiuni în ordine:**

1. **Hero** — Full-height, fundal crem (#f5f0e8), titlu mare cu Playfair Display:
   - Titlu: "Amintiri pentru totdeauna" — animație GSAP reveal cuvânt cu cuvânt
   - Subtitlu: "Sute de poze și clipuri WOW de la invitați, chiar a 2-a zi după eveniment"
   - CTA principal: buton violet "Vreau la nunta mea →"
   - CTA secundar: link "Încearcă Demo"
   - Element decorativ: cerc mare cu -webkit-text-stroke (outline text) "MEMORIES" în background
   - Elemente flotante: 2-3 cercuri cu animație GSAP float

2. **How It Works** — 3 pași cu numbere mari serif și iconuri:
   - "1 — Alegi pachetul" / "2 — Pui codul QR" / "3 — Invitații scanează"
   - Animație stagger ScrollTrigger

3. **Event Types** — 4 carduri: Nuntă / Botez / Aniversare / Corporate
   - Fiecare card duce la `/eveniment/[type]`
   - Design: fundal violet-pale, border hover violet

4. **Social Proof** — "500+ evenimente fericite", avatare, stele

5. **Pricing Preview** — Cele mai populare pachete cu buton "Vezi toate prețurile"

6. **FAQ** — Acordion cu 6 întrebări frecvente

7. **CTA Final** — Banner violet cu text alb: "Nu aștepți 2 luni, ai sute de poze WOW!"

---

### 9.2 Pagina eveniment (`app/(marketing)/eveniment/[type]/page.js`)

**Params valizi:** `nunta`, `botez`, `aniversare`, `corporate`

**Conținut (exemplu pentru nuntă):**
- Hero: "Nu aștepți 2 luni, ai sute de poze și clipuri WOW de la invitați chiar a 2-a zi după nuntă"
- Descriere scurtă a fluxului
- Secțiunea cu 3 opțiuni de acces: Cod QR digital / Cartonașe fizice / Link
- Pricing pentru tipul selectat (3 pachete)
- Buton "Încearcă DEMO" → `/upload/DEMO`
- FAQ specific evenimentului

---

### 9.3 Pagina prețuri (`app/(marketing)/preturi/page.js`)

- Selector tip eveniment în nav (tabs): Nuntă | Botez | Aniversare | Corporate
- La selectare, se afișează 3 carduri de pachete (intim, complet, vis)
- Cardul "Cel mai popular" are un badge special și border violet
- Fiecare card are: preț, număr invitați, listă beneficii, buton "Comanzi acum"
- Butonul "Comanzi acum" → POST la `/api/stripe/checkout` cu `{eventType, packageType}`
- Toate pachetele includ lista de beneficii comune
- Animație GSAP: cards fade-in stagger la scroll

**Design card pachet:**
```
┌─────────────────────────────┐
│  [BADGE: Cel mai popular]   │
│                             │
│  NUNTĂ COMPLETĂ             │
│  369 RON                    │
│  ─────────────────          │
│  ideal pentru evenimente    │
│  până în 250 invitați       │
│                             │
│  ✓ Album Digital & QR unic  │
│  ✓ Catalog & Design QR      │
│  ✓ 3 luni stocare           │
│  ✓ Încărcări nelimitate     │
│  ✓ Cartonașe fizice opțional│
│                             │
│  [  COMANZI ACUM →  ]       │
└─────────────────────────────┘
```

---

### 9.4 Pagina Guest Upload (`app/upload/[eventCode]/page.js`)

**IMPORTANT:** Această pagină NU necesită autentificare. Este accesată EXCLUSIV prin scanarea QR.

**Flow complet:**

**Ecran 1 — UploadChoice:**
- Logo CloudMemories centrat sus
- Titlu: "Bun venit la [Nume Eveniment]! 🎉"
- Data evenimentului
- 2 butoane mari:
  - "📸 Încarcă o poză / video" → Ecran 2
  - "💌 Trimite o urare" → Ecran 4

**Ecran 2 — MediaChoice (după click pe Încarcă):**
- 2 butoane:
  - "🖼️ Încarcă din galerie" → selectează fișiere
  - "📷 Fă o fotografie / filmează" → deschide camera

**Ecran 3 — Upload în progres:**
- Progress bar animat
- Text: "Se încarcă [X] din [Y] fișiere..."
- Fișierele se uploadează DIRECT la R2 via presigned URLs
- Flow tehnic:
  1. `POST /api/upload/presigned` cu `{eventCode, fileType, contentType}`
  2. Primești `{uploadUrl, r2Key}`
  3. `PUT uploadUrl` cu fișierul (direct la R2, NU prin server)
  4. `POST /api/upload/confirm` cu `{r2Key, eventCode, fileType, sizeBytes}`

**Ecran 4 — Succes Upload:**
```
✓ Mulțumim!
"Putem să ne vedem povestea din ochii tăi!"
[  Închide  ]
```
La click pe Închide: revine la Ecran 1 (starea inițială)

**Ecran 5 — WishForm (urare):**
- Formular:
  - Prenume* (obligatoriu)
  - Nume* (obligatoriu)
  - Email (opțional) — placeholder: "exemplu@gmail.com (opțional)"
  - Mesaj* (obligatoriu) — textarea
- Buton: "Trimite urarea 💌"
- POST la `/api/wishes` cu datele formularului + eventCode

**Ecran 6 — Succes Urare:**
```
💌 Mulțumim pentru urare!
[  Închide  ]
```

**Design pagina guest:**
- Mobil-first (95% din useri sunt pe telefon!)
- Fundal crem (#f5f0e8)
- Butoane mari, easy-tap (min 54px height)
- Font mare, lizibil
- Animații subtile între ecrane (fade/slide)

---

### 9.5 Login (`app/(app)/login/page.js`)

- Layout centrat, fundal crem
- Logo + titlu "Contul tău CloudMemories"
- Formular: Email + Parolă
- Buton submit: "Autentifică-te"
- Link: "Ai uitat parola? Contactează suportul"
- La succes: redirect la `/dashboard/evenimentul-meu`
- Dacă `must_change_password === true` → redirect la `/first-login`

---

### 9.6 First Login (`app/(app)/first-login/page.js`)

**Pas 1 — Schimbă parola:**
- Parolă nouă + Confirmare parolă
- Validare: min 8 caractere, cel puțin o cifră

**Pas 2 — Verificare telefon:**
- Input număr telefon (format: +40...)
- Buton "Trimite SMS"
- Input cod SMS (6 cifre)
- Buton "Verifică"
- Folosește Supabase Auth phone verification

**La finalizare:** update `must_change_password = false`, redirect la dashboard

---

### 9.7 Dashboard Organizator (`app/(app)/dashboard/evenimentul-meu/page.js`)

**Layout cu sidebar stânga:**
- Sidebar: logo + "Evenimentul meu" + "Contul meu" + logout
- Conținut principal: scroll independent

**Secțiunile din "Evenimentul meu":**

**Blocul QR + Link:**
```
┌─────────────────────────────────────────┐
│  [QR CODE IMAGE 200x200]                │
│                                         │
│  Link eveniment:                        │
│  cloudofmemories.ro/upload/ABC123       │
│  [  📋 Copiază linkul  ]               │
└─────────────────────────────────────────┘
```

**Blocul Arhivă:**
```
┌─────────────────────────────────────────┐
│  📦 Generează Arhiva                    │
│                                         │
│  Generează arhiva cu poze, clipuri      │
│  și urări. Vei primi un email când      │
│  este gata. Recomandăm Wi-Fi!           │
│                                         │
│  [  Generează Arhiva  ]                 │
└─────────────────────────────────────────┘
```
La click: POST `/api/archive`, butonul devine "Se generează..." și apare mesajul: "Arhiva este în curs de generare, durează câteva minute. Va fi trimis un email când este gata."

**Tabs — Conținut:**
- Tab "📸 Poze & Clipuri" — grid de poze/thumburi video cu data upload
- Tab "💌 Urări" — lista card-uri cu prenume, nume, mesaj, data

**Blocul Design Cartonașe:**
```
Alege un design din catalog
[Card design 1] [Card design 2] [Card design 3]
[  Descarcă design digital  ]
[  Cere printare fizică (+cost)  ]
```

---

### 9.8 Contul meu (`app/(app)/dashboard/contul-meu/page.js`)

- Formular schimbare email (cu confirmare parolă)
- Formular schimbare parolă (parolă curentă + parolă nouă)
- Secțiune "Contactează suport": textarea + buton "Trimite mesaj" → email la admin

---

### 9.9 Admin Dashboard (`app/(admin)/admin/page.js`)

**Sidebar stânga:**
- Dashboard / Conturi / Blog / Ieșire

**Conținut Dashboard:**
- Card "Cereri noi" — lista email-uri care aşteaptă aprobare cu buton "Aprobă cont"
- Card "Comenzi recente" — ultimele 10 comenzi Stripe
- Card "Evenimente active" — număr total

---

### 9.10 Admin — Conturi (`app/(admin)/admin/conturi/page.js`)

**Tabel cu toți organizatorii:**
- Coloane: Email | Telefon | Status | Eveniment | Data creare | Acțiuni
- Acțiuni per rând:
  - "Blochează" / "Activează"
  - "Generează OTP" — generează parolă temporară de 10 caractere + seată `must_change_password = true`, trimite email
  - "Șterge cont"
- Filtre: Activi / Blocați / În așteptare

---

### 9.11 Admin — Blog CMS (`app/(admin)/admin/blog/page.js`)

- Lista articole cu status (publicat/draft) și butoane Edit/Delete
- Formular creare/editare:
  - Titlu
  - Slug (auto-generat din titlu)
  - Editor Markdown (textarea simplu cu preview)
  - Upload imagine cover (direct la R2)
  - Toggle Publicat/Draft
  - Buton Salvează

---

## 10. API ROUTES — SPECIFICAȚII COMPLETE

### `POST /api/upload/presigned`
```javascript
// Request body:
{ eventCode: "ABC123", contentType: "image/jpeg", fileType: "photo" }

// Response:
{ uploadUrl: "https://...", r2Key: "events/uuid/photos/uuid.jpg" }

// Logică:
// 1. Găsește evenimentul după eventCode (SELECT din events)
// 2. Verifică că e activ
// 3. Generează uuid pentru fișier
// 4. Construiește r2Key: "events/{eventId}/{fileType}s/{uuid}.{ext}"
// 5. Apelează getPresignedUploadUrl(r2Key, contentType, 900)
// 6. Returnează { uploadUrl, r2Key }
```

### `POST /api/upload/confirm`
```javascript
// Request body:
{ r2Key: "events/...", eventCode: "ABC123", fileType: "photo", sizeBytes: 1234567 }

// Response:
{ success: true, uploadId: "uuid" }

// Logică:
// 1. Găsește evenimentul după eventCode
// 2. INSERT în uploads { event_id, r2_key, file_type, size_bytes }
// 3. Returnează uploadId
```

### `POST /api/wishes`
```javascript
// Request body:
{ eventCode: "ABC123", firstName: "Ion", lastName: "Popescu", email: "...", message: "..." }

// Response:
{ success: true }

// Logică:
// 1. Validează câmpurile obligatorii (firstName, lastName, message)
// 2. Găsește evenimentul după eventCode
// 3. INSERT în wishes
```

### `POST /api/stripe/checkout`
```javascript
// Request body:
{ eventType: "nunta", packageType: "complet", organizerEmail: "..." }

// Response:
{ checkoutUrl: "https://checkout.stripe.com/..." }

// Logică:
// 1. Găsește pachetul în PACKAGES config
// 2. Creează Stripe Checkout Session cu:
//    - price_data: { currency: 'ron', unit_amount: price, product_data: { name } }
//    - success_url: `${APP_URL}/dashboard/evenimentul-meu?success=true`
//    - cancel_url: `${APP_URL}/preturi`
//    - metadata: { eventType, packageType, organizerEmail }
// 3. INSERT în orders cu status 'pending'
// 4. Returnează session.url
```

### `POST /api/stripe/webhook`
```javascript
// Headers: stripe-signature
// Body: raw buffer (IMPORTANT: nu parsa JSON, folosește request.text())

// Logică pentru event 'checkout.session.completed':
// 1. Verifică semnătura: stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
// 2. Extrage metadata: { eventType, packageType, organizerEmail }
// 3. UPDATE orders SET status='paid' WHERE stripe_session_id=session.id
// 4. Generează eventCode unic (6 caractere alfanumerice uppercase)
// 5. INSERT în events { organizer_id: null, event_name: "Eveniment " + organizerEmail,
//    event_type, event_code, package_type, storage_expires_at: now + 3 luni }
// 6. INSERT în account_requests { email: organizerEmail, event_type, package_type, order_id }
// 7. UPDATE orders SET event_id = eventId
// 8. Trimite email admin: sendAdminNotification(
//      "Cerere cont nou - " + organizerEmail,
//      "A plătit pachetul X. Aprobă contul în dashboard."
//    )
```

### `POST /api/admin/approve`
```javascript
// Request body (auth: admin only):
{ requestId: "uuid" }

// Logică:
// 1. Găsește account_request după id
// 2. Generează parolă aleatorie de 12 caractere
// 3. Creează user în Supabase Auth: supabase.auth.admin.createUser({ email, password })
// 4. INSERT în users { id: user.id, email, role: 'organizer', must_change_password: true }
// 5. UPDATE events SET organizer_id = user.id WHERE id = request.event_id
// 6. UPDATE account_requests SET status = 'approved'
// 7. Trimite email admin cu credențialele: "Email: X, Parolă: Y"
//    (adminul le transmite manual pe WhatsApp)
// 8. Returnează { success: true, tempPassword }
```

### `POST /api/admin/otp`
```javascript
// Request body (auth: admin only):
{ userId: "uuid" }

// Logică:
// 1. Generează parolă temporară (10 caractere alfanumerice)
// 2. supabase.auth.admin.updateUserById(userId, { password: tempPassword })
// 3. UPDATE users SET must_change_password = true WHERE id = userId
// 4. Găsește email-ul userului
// 5. sendOTP(email, tempPassword)
// 6. Returnează { success: true, tempPassword }
```

### `POST /api/archive`
```javascript
// Auth: organizator autentificat

// Logică ASINCRONĂ (nu așteaptă generarea):
// 1. Verifică că userul e autentificat și are un eveniment activ
// 2. Lansează job-ul async (fără await):
//    generateAndUploadArchive(eventId, userEmail)
// 3. Returnează imediat { success: true, message: "Arhiva se generează..." }

// Funcția generateAndUploadArchive (din lib/archive.js):
// 1. SELECT toate uploads pentru eventId
// 2. SELECT toate wishes pentru eventId
// 3. Creează archiver stream
// 4. Adaugă fiecare fișier din R2 în arhivă
// 5. Adaugă wishes.csv în arhivă
// 6. Upload arhivă ZIP în R2: "archives/{eventId}/{timestamp}.zip"
// 7. Generează presigned URL pentru download (valabil 7 zile)
// 8. sendArchiveReady(userEmail, downloadUrl)
```

---

## 11. COMPONENTE UI DE BAZĂ

### `components/ui/Button.js`
Variante: `primary` (violet solid), `outline` (border violet), `ghost` (transparent), `danger` (roșu)
Dimensiuni: `sm`, `md` (default), `lg`
Props: `variant`, `size`, `loading` (afișează spinner), `disabled`, `onClick`, `type`, `children`

### `components/ui/Modal.js`
- Overlay cu blur pe fundal
- Container centrat cu border-radius-lg
- Buton X de închidere sus-dreapta
- Animație: fade-in + scale-up cu GSAP
- Props: `isOpen`, `onClose`, `title`, `children`

### `components/ui/Toast.js`
- Notificări temporare jos-dreapta
- Variante: `success` (verde), `error` (roșu), `info` (violet)
- Auto-dispare după 4 secunde
- Animație slide-in cu GSAP

---

## 12. COMPONENTE MARKETING

### `components/marketing/Navbar.js`

**Desktop:**
```
Logo (stânga) | Acasă / Eveniment▼ / Prețuri / Blog / Contact (centru) | Accesează Aplicația (dreapta, buton violet)
```

**Mobile:**
- Hamburger menu
- Meniu full-screen slide-in

**Dropdown "Eveniment":** Nuntă / Botez / Aniversare / Corporate

**Comportament scroll:**
- La scroll-down: navbar se ascunde (translateY(-100%)) via GSAP
- La scroll-up: navbar reapare

**Stil:**
- Fundal: transparent inițial → crem cu blur (backdrop-filter) după scroll 80px
- Border-bottom subțire după scroll
- Padding: 20px 40px desktop, 16px 20px mobile

### `components/marketing/Hero.js`

**Layout:**
```
[Eyebrow label cu linie: "Album digital pentru evenimente"]

Amintiri                ← font serif 72px, animat cu GSAP word by word
pentru                  
totdeauna               ← ultimul cuvânt cu gradient sau outline

Subtitlu: "Sute de poze și clipuri WOW de la invitați,
chiar a 2-a zi după eveniment."

[Vreau la nunta mea →] [▶ Încearcă Demo]

Social proof: ★★★★★ "500+ evenimente fericite"
```

**Fundal:**
- Crem (#f5f0e8)
- Cerc decorativ mare outline (violet, opacity 0.1) în dreapta
- Câteva cercuri mici flotante cu animație GSAP

### `components/marketing/PricingCard.js`

Props: `name`, `price` (în bani), `eventType`, `packageType`, `guestLimit`, `features`, `isPopular`, `onSelect`

Design: fundal alb, border violet-pale, hover → shadow-lg + border violet
Badge "Cel mai popular": background gradient violet, text alb, sus-dreapta

---

## 13. PAGINI BLOG ȘI CONTACT

### Blog list (`app/(marketing)/blog/page.js`)
- Fetch din Supabase: SELECT * FROM blog_posts WHERE published = true ORDER BY created_at DESC
- Grid 3 coloane desktop, 1 coloană mobile
- Fiecare card: imagine cover, titlu, dată, link spre articol

### Blog post (`app/(marketing)/blog/[slug]/page.js`)
- Fetch: SELECT * FROM blog_posts WHERE slug = params.slug AND published = true
- Randare Markdown simplu (cu dangerouslySetInnerHTML după sanitizare sau o librărie simplă)
- Generează metadata pentru SEO: title, description, og:image

### Contact (`app/(marketing)/contact/page.js`)
- Formular: Prenume, Nume, Email*, Telefon, Tip eveniment (select), Mesaj*
- POST la `/api/contact`
- Informații contact: telefon, email, program
- Secțiunea "De ce să ne alegi?"

---

## 14. NEXT.CONFIG.MJS

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'pub-*.r2.dev',
      }
    ],
  },
};

export default nextConfig;
```

---

## 15. GLOBALS.CSS (structura completă)

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Inter:wght@400;500;600;700;800&display=swap');

/* Variabile CSS — vezi secțiunea 3.2 */

/* Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--font-sans);
  background-color: var(--color-cream);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
}

/* Tipografie de bază */
h1, h2, h3 { font-family: var(--font-serif); }
h4, h5, h6, p, span, button, input, textarea { font-family: var(--font-sans); }

/* Scrollbar custom */
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: var(--color-cream-dark); }
::-webkit-scrollbar-thumb { background: var(--color-violet-light); border-radius: 4px; }

/* Utilități */
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
```

---

## 16. STRUCTURA FIȘIERELOR R2

```
cloudmemories/                          ← Bucket R2
├── events/
│   └── {eventId}/
│       ├── photos/
│       │   └── {uuid}.jpg             ← Poze uploadate de invitați
│       ├── videos/
│       │   └── {uuid}.mp4             ← Clipuri uploadate de invitați
│       ├── thumbnails/
│       │   └── {uuid}.jpg             ← Thumbnail-uri video
│       └── qr.png                     ← Imaginea QR a evenimentului
├── archives/
│   └── {eventId}/
│       └── {timestamp}.zip            ← Arhivele generate
├── qr-designs/
│   └── {designId}.png                 ← Imaginile design-urilor de cartonașe
└── blog/
    └── {slug}/
        └── {uuid}.jpg                 ← Imagini articole blog
```

---

## 17. REGULI DE BUSINESS IMPORTANTE

1. **Videourile** au limita de 2 minute și 200MB per fișier — validează pe client înainte de upload
2. **Pozele** au limita de 20MB per fișier
3. **Stocarea** expiră la 3 luni de la data evenimentului — setează `storage_expires_at` la INSERT
4. **Linkul arhivei** expirat după 7 zile (presigned URL R2)
5. **Adminul** este SINGURUL care poate crea conturi de organizator — nu există "sign up" public
6. **Prima logare** necesită: schimbare parolă + verificare telefon (ambele obligatorii)
7. **eventCode** — 6 caractere alfanumerice uppercase (ex: "ABC123"), unic în DB
8. **Pagina guest** `/upload/[eventCode]` este 100% publică, fără autentificare
9. **Admin** poate vedea TOATE uploadurile și urările din TOATE evenimentele
10. **Organizatorul** vede DOAR propriul eveniment

---

## 18. FLOW COMPLET STRIPE (pentru claritate maximă)

```
1. Visitor pe /preturi selectează "Nuntă Completă" → click "Comanzi acum"
2. Frontend POST /api/stripe/checkout { eventType:"nunta", packageType:"complet", organizerEmail:"..." }
3. Server creează Stripe Checkout Session → returnează checkoutUrl
4. Frontend redirect la checkoutUrl (Stripe hosted page în RON)
5. Visitor plătește cu cardul
6. Stripe trimite webhook POST /api/stripe/webhook cu event "checkout.session.completed"
7. Server:
   a. Verifică semnătura Stripe
   b. UPDATE orders status='paid'
   c. Generează eventCode unic (ex: "N7K2X9")
   d. INSERT în events (fără organizer_id încă)
   e. INSERT în account_requests
   f. Trimite email admin: "Ion Popescu a plătit Nuntă Completă. Aprobă contul?"
8. Admin vede în dashboard notificarea
9. Admin click "Aprobă" → POST /api/admin/approve { requestId }
10. Server:
    a. Creează user în Supabase Auth cu parolă generată
    b. INSERT în users cu must_change_password=true
    c. UPDATE events SET organizer_id = nouUser.id
    d. UPDATE account_requests status='approved'
    e. Admin primește email cu: "Email: ion@..., Parolă: XxY7z2K9m1"
11. Admin trimite credențialele manual pe WhatsApp organizatorului
12. Organizatorul se loghează → redirect la /first-login
13. Schimbă parola + verifică telefonul
14. Acces la /dashboard/evenimentul-meu cu QR-ul deja generat
```

---

## 19. NOTE TEHNICE FINALE

- **Server Components vs Client Components**: Folosește Server Components pentru fetch de date, Client Components (`'use client'`) doar unde ai nevoie de interactivitate sau GSAP
- **GSAP în Next.js**: Importă GSAP și ScrollTrigger DOAR în componente client cu `useEffect` pentru a evita SSR errors
- **R2 presigned URLs**: Expiră în 15 minute (900 secunde) — suficient pentru un upload normal
- **Stripe webhook**: Endpoint-ul `/api/stripe/webhook` trebuie să folosească `request.text()` (nu `request.json()`) pentru a verifica semnătura corect
- **Supabase Service Role Key**: NICIODATĂ în cod client (nu în componente cu `'use client'`), DOAR în API routes server-side
- **CSS Modules**: Fiecare componentă are propriul fișier `.module.css`. Nu folosii clase globale în componente
- **Mobile-first**: Pagina `/upload/[eventCode]` este 100% mobile-first — designul trebuie să fie perfect pe telefon
- **Image optimization**: Folosește `next/image` pentru toate imaginile statice și cele din R2
