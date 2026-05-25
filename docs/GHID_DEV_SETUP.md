# CloudMemories — Ghid Complet Setup & Integrare pentru Developer

> Citește tot documentul înainte să scrii orice cod.
> Urmează pașii în ordinea exactă de mai jos.

---

## PASUL 0 — Inițializare proiect Next.js

```bash
# Creezi proiectul (în folderul gol al proiectului)
npx create-next-app@latest . \
  --js \
  --no-tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --no-eslint

# Instalezi toate dependențele
npm install \
  @supabase/supabase-js \
  @supabase/ssr \
  @aws-sdk/client-s3 \
  @aws-sdk/s3-request-presigner \
  gsap \
  stripe \
  resend \
  qrcode \
  archiver \
  uuid
```

---

## PASUL 1 — Supabase Setup

### 1.1 Creare cont și proiect

1. Mergi la **https://supabase.com** → Sign Up cu GitHub sau email
2. Click **"New Project"**
3. Completezi:
   - **Name:** `cloudmemories`
   - **Database Password:** generezi una puternică și o SALVEZI undeva sigur
   - **Region:** `eu-central-1` (Frankfurt)
4. Aștepți ~2 minute să se creeze proiectul

### 1.2 Rulezi schema SQL

1. În Supabase, click stânga pe **"SQL Editor"**
2. Click **"New Query"**
3. Copiezi TOT SQL-ul de mai jos și dai **Run (Ctrl+Enter)**:

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

-- USERS
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
  organizer_id uuid references public.users(id) on delete cascade,
  event_name text not null,
  event_type event_type not null,
  event_date date,
  event_code text unique not null,
  qr_r2_key text,
  package_type package_type not null,
  status text not null default 'active',
  storage_expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- UPLOADS
create table public.uploads (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  r2_key text not null,
  file_type file_type not null,
  thumbnail_r2_key text,
  size_bytes bigint,
  original_name text,
  created_at timestamptz not null default now()
);

-- WISHES
create table public.wishes (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text,
  message text not null,
  created_at timestamptz not null default now()
);

-- QR DESIGNS
create table public.qr_designs (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  preview_r2_key text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- BLOG POSTS
create table public.blog_posts (
  id uuid primary key default uuid_generate_v4(),
  slug text unique not null,
  title text not null,
  content_md text not null,
  cover_r2_key text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ORDERS
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  organizer_email text not null,
  stripe_session_id text unique not null,
  package_type package_type not null,
  event_type event_type not null,
  amount_ron integer not null,
  status order_status not null default 'pending',
  event_id uuid references public.events(id),
  created_at timestamptz not null default now()
);

-- ACCOUNT REQUESTS
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
alter table public.account_requests enable row level security;
alter table public.blog_posts enable row level security;
alter table public.qr_designs enable row level security;

-- POLITICI RLS
create policy "users_own" on public.users
  for all using (auth.uid() = id);

create policy "events_own" on public.events
  for all using (auth.uid() = organizer_id);

create policy "uploads_own_read" on public.uploads
  for select using (
    event_id in (select id from public.events where organizer_id = auth.uid())
  );

-- Invitații pot insera uploads și wishes fără cont
create policy "uploads_insert_public" on public.uploads
  for insert with check (true);

create policy "wishes_own_read" on public.wishes
  for select using (
    event_id in (select id from public.events where organizer_id = auth.uid())
  );

create policy "wishes_insert_public" on public.wishes
  for insert with check (true);

-- Blog posts publice (toți pot citi ce e publicat)
create policy "blog_public_read" on public.blog_posts
  for select using (published = true);

-- QR designs publice
create policy "qr_designs_public_read" on public.qr_designs
  for select using (is_active = true);
```

4. Dacă toate au mers OK, în stânga la **"Table Editor"** trebuie să vezi toate tabelele

### 1.3 Activezi autentificarea prin email

1. Mergi la **Authentication → Providers**
2. **Email** — asigură-te că e enabled
3. Dezactivează **"Confirm email"** (pentru simplitate la start — adminul creează conturile manual)
4. Mergi la **Authentication → URL Configuration**
5. Setezi **Site URL:** `http://localhost:3000` (local) sau domeniul tău când deploy-ezi

### 1.4 (Opțional) Activezi Phone Auth pentru verificare SMS

1. **Authentication → Providers → Phone**
2. Enable + alegi provider-ul (Twilio recomandat)
3. Introduci Twilio Account SID, Auth Token, Phone Number
4. **NOTĂ:** Necesită cont Twilio (~$0.0075/SMS în România)

### 1.5 Creezi primul cont Admin manual

1. Mergi la **Authentication → Users**
2. Click **"Add User" → "Create new user"**
3. Introduci email-ul adminului + parolă
4. Copiezi `User UID` (un UUID de forma `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
5. Mergi la **SQL Editor** și rulezi:

```sql
INSERT INTO public.users (id, email, role, status, must_change_password)
VALUES (
  'PUNE-AICI-UUID-DIN-PASUL-4',
  'admin@cloudofmemories.ro',
  'admin',
  'active',
  false
);
```

### 1.6 Iei cheile API

1. Mergi la **Settings (roată) → API**
2. Copiezi și salvezi:

```
Project URL     → NEXT_PUBLIC_SUPABASE_URL
anon public     → NEXT_PUBLIC_SUPABASE_ANON_KEY
service_role    → SUPABASE_SERVICE_ROLE_KEY  ← NICIODATĂ în frontend!
```

---

## PASUL 2 — Cloudflare R2 Setup

### 2.1 Creare cont Cloudflare

1. Mergi la **https://cloudflare.com** → Sign Up
2. Introduci cardul (nu taxează pentru free tier, dar îl cere pentru R2)

### 2.2 Activezi R2 și creezi bucket-ul

1. În dashboard Cloudflare, stânga → **R2 Object Storage**
2. Prima dată te va întreba să activezi R2 → **Activate R2**
3. Click **"Create bucket"**
4. Completezi:
   - **Bucket name:** `cloudmemories`
   - **Location:** selectezi **"Eastern Europe (EEUR)"**
5. Click **"Create bucket"**

### 2.3 Faci bucket-ul public (pentru servire directă a imaginilor)

1. Intri în bucket-ul `cloudmemories`
2. Click pe tab-ul **"Settings"**
3. Scroll jos la **"Public Access"**
4. Click **"Allow Access"** → confirmă
5. Vei primi un URL de forma: `https://pub-XXXXXXXX.r2.dev`
6. **Salvează acest URL** — acesta e `CLOUDFLARE_R2_PUBLIC_URL`

### 2.4 Creezi API Token pentru R2

1. Sus în dashboard → click pe **"R2"** din stânga
2. Click pe **"Manage R2 API Tokens"** (sus dreapta)
3. Click **"Create API Token"**
4. Completezi:
   - **Token name:** `cloudmemories-app`
   - **Permissions:** `Object Read & Write`
   - **Specify bucket:** selectezi `cloudmemories`
5. Click **"Create API Token"**
6. **IMPORTANT:** Copiezi IMEDIAT (se afișează o singură dată):

```
Access Key ID       → CLOUDFLARE_R2_ACCESS_KEY_ID
Secret Access Key   → CLOUDFLARE_R2_SECRET_ACCESS_KEY
```

### 2.5 Iei Account ID

1. În dashboard Cloudflare, orice pagină → uită-te în **dreapta jos**
2. Sau: **Overview → Account ID** (dreapta sus în sidebar)

```
Account ID  → CLOUDFLARE_R2_ACCOUNT_ID
```

### 2.6 Configurezi CORS pe bucket (obligatoriu pentru upload direct din browser)

1. Intri în bucket `cloudmemories` → tab **"Settings"**
2. Scroll la **"CORS Policy"** → click **"Add CORS policy"**
3. Adaugi această configurare:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://cloudofmemories.ro",
      "https://www.cloudofmemories.ro"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

4. Click **"Save"**

---

## PASUL 3 — Stripe Setup

### 3.1 Creare cont

1. Mergi la **https://stripe.com** → Create account
2. Completezi datele firmei (sau persoană fizică autorizată)
3. **IMPORTANT:** Verifică contul cu documentele cerute înainte de a merge în producție

### 3.2 Iei cheile API

1. În dashboard Stripe → **Developers → API Keys**
2. Copiezi:

```
Publishable key  → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  (pk_live_...)
Secret key       → STRIPE_SECRET_KEY                   (sk_live_...)
```

**Pentru development folosești cheile de TEST** (pk_test_... și sk_test_...)

### 3.3 Configurezi Webhook

1. **Developers → Webhooks → Add endpoint**
2. **Endpoint URL:**
   - Local (development): folosești **Stripe CLI** (vezi mai jos)
   - Producție: `https://cloudofmemories.ro/api/stripe/webhook`
3. **Events to listen:** selectezi `checkout.session.completed`
4. Click **"Add endpoint"**
5. Click pe webhook-ul creat → **"Reveal signing secret"**

```
Signing secret  → STRIPE_WEBHOOK_SECRET  (whsec_...)
```

### 3.4 Stripe CLI pentru development local

```bash
# Instalezi Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forwardezi webhook-urile local
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Îți va da un webhook secret temporar pentru development:
# > Ready! Your webhook signing secret is whsec_xxxxx
```

Rulezi asta într-un terminal separat în timp ce dezvolți.

### 3.5 Configurezi RON ca monedă

1. **Settings → Business settings → Customer emails**
2. Asigură-te că moneda default e RON sau că o setezi în cod la crearea sesiunii

---

## PASUL 4 — Resend Setup (email)

### 4.1 Creare cont

1. Mergi la **https://resend.com** → Sign Up
2. Verifici email-ul

### 4.2 Verifici domeniul

1. **Domains → Add Domain**
2. Introduci `cloudofmemories.ro`
3. Adaugi înregistrările DNS indicate (TXT și MX) la provider-ul de domeniu
4. Click **"Verify"** (poate dura până la 48h propagare DNS)

**Până se verifică domeniul**, poți trimite emailuri de la `onboarding@resend.dev` (doar pentru development)

### 4.3 Iei API Key

1. **API Keys → Create API Key**
2. Permisiuni: **Full access**

```
API Key  → RESEND_API_KEY  (re_...)
```

---

## PASUL 5 — Fișierul `.env.local`

Creezi fișierul `.env.local` în rădăcina proiectului cu TOATE cheile:

```bash
# ─── SUPABASE ───────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ─── CLOUDFLARE R2 ──────────────────────────────────
CLOUDFLARE_R2_ACCOUNT_ID=1234567890abcdef1234567890abcdef
CLOUDFLARE_R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
CLOUDFLARE_R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLOUDFLARE_R2_BUCKET_NAME=cloudmemories
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev

# ─── STRIPE ─────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ─── RESEND ─────────────────────────────────────────
RESEND_API_KEY=re_...

# ─── APP ────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@cloudofmemories.ro
```

**IMPORTANT:** Adaugă `.env.local` în `.gitignore` (Next.js face asta automat)

---

## PASUL 6 — Codul de integrare (fișierele lib/)

### `lib/supabase/client.js` — pentru componente browser
```javascript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
```

### `lib/supabase/server.js` — pentru Server Components și API Routes
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
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

### `lib/supabase/admin.js` — DOAR pentru operații admin (server-side)
```javascript
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
```

### `lib/r2.js` — Cloudflare R2
```javascript
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
});

// Generează URL presigned pentru UPLOAD (client → R2 direct)
export async function getPresignedUploadUrl(key, contentType, expiresIn = 900) {
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

// Generează URL presigned pentru DOWNLOAD (arhivă)
export async function getPresignedDownloadUrl(key, expiresIn = 604800) { // 7 zile
  const command = new GetObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn });
}

// URL public pentru imagini (fără expirare, bucket public)
export function getPublicUrl(key) {
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}

// Șterge un obiect din R2
export async function deleteObject(key) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
  });
  return r2Client.send(command);
}
```

### `lib/stripe.js` — Stripe + configurare pachete
```javascript
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
});

// Prețuri în bani (RON × 100 pentru Stripe)
export const PACKAGES = {
  nunta: {
    intim:   { price: 27900, label: 'Nuntă Intimă',     guestLimit: 100 },
    complet: { price: 36900, label: 'Nuntă Completă',   guestLimit: 250 },
    vis:     { price: 55900, label: 'Nuntă de Vis',     guestLimit: 500 },
  },
  botez: {
    intim:   { price: 24900, label: 'Botez Intim',      guestLimit: 50  },
    complet: { price: 32900, label: 'Botez Complet',    guestLimit: 150 },
    vis:     { price: 48900, label: 'Botez de Vis',     guestLimit: 300 },
  },
  aniversare: {
    intim:   { price: 24900, label: 'Aniversare Intimă',   guestLimit: 50  },
    complet: { price: 32900, label: 'Aniversare Completă', guestLimit: 150 },
    vis:     { price: 48900, label: 'Aniversare de Vis',   guestLimit: 300 },
  },
  corporate: {
    intim:   { price: 32900, label: 'Corporate Basic',   guestLimit: 100 },
    complet: { price: 45900, label: 'Corporate Standard', guestLimit: 300 },
    vis:     { price: 69900, label: 'Corporate Premium',  guestLimit: 600 },
  },
};
```

### `lib/resend.js` — Email-uri
```javascript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'CloudMemories <noreply@cloudofmemories.ro>';

export async function sendArchiveReady(toEmail, downloadUrl) {
  return resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: '📦 Arhiva ta CloudMemories este gata!',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px">
        <h1 style="color:#2d1b69;font-size:28px">Arhiva ta este gata! 🎉</h1>
        <p style="color:#4b5563;font-size:16px;line-height:1.6">
          Am pregătit arhiva cu toate pozele, clipurile și urările de la evenimentul tău.
        </p>
        <p style="color:#6b7280;font-size:14px">
          <strong>Important:</strong> Linkul este valabil 7 zile. Recomandăm descărcarea printr-o conexiune Wi-Fi.
        </p>
        <a href="${downloadUrl}"
           style="display:inline-block;background:#2d1b69;color:white;padding:14px 28px;
                  border-radius:8px;text-decoration:none;font-weight:700;margin-top:20px">
          Descarcă Arhiva →
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:40px">
          CloudMemories · cloudofmemories.ro
        </p>
      </div>
    `,
  });
}

export async function sendOTP(toEmail, tempPassword) {
  return resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: '🔑 Parolă temporară CloudMemories',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px">
        <h1 style="color:#2d1b69;font-size:24px">Resetare parolă</h1>
        <p style="color:#4b5563">Parola ta temporară este:</p>
        <div style="background:#f5f0e8;border:2px solid #2d1b69;border-radius:8px;
                    padding:20px;text-align:center;font-size:24px;font-weight:700;
                    letter-spacing:4px;color:#2d1b69;margin:20px 0">
          ${tempPassword}
        </div>
        <p style="color:#6b7280;font-size:14px">
          La prima autentificare vei fi rugat să schimbi această parolă.
        </p>
      </div>
    `,
  });
}

export async function sendAdminNotification(subject, htmlBody) {
  return resend.emails.send({
    from: FROM,
    to: process.env.ADMIN_EMAIL,
    subject,
    html: htmlBody,
  });
}

export async function sendContactForm({ name, email, phone, eventType, message }) {
  return resend.emails.send({
    from: FROM,
    to: process.env.ADMIN_EMAIL,
    subject: `📩 Mesaj nou de la ${name}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:40px 20px">
        <h2 style="color:#2d1b69">Mesaj nou de pe site</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px 0;color:#6b7280;width:120px">Nume:</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Email:</td><td style="padding:8px 0">${email}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Telefon:</td><td style="padding:8px 0">${phone || '-'}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280">Eveniment:</td><td style="padding:8px 0">${eventType || '-'}</td></tr>
        </table>
        <div style="background:#f5f0e8;border-radius:8px;padding:16px;margin-top:16px">
          <p style="color:#1a0f3c;margin:0">${message}</p>
        </div>
      </div>
    `,
  });
}
```

### `lib/qrcode.js` — Generare QR
```javascript
import QRCode from 'qrcode';

export async function generateQRCodeBuffer(url) {
  return QRCode.toBuffer(url, {
    width: 500,
    margin: 2,
    color: {
      dark: '#2d1b69',
      light: '#f5f0e8',
    },
    errorCorrectionLevel: 'M',
  });
}

export async function generateQRCodeDataURL(url) {
  return QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: {
      dark: '#2d1b69',
      light: '#f5f0e8',
    },
  });
}
```

---

## PASUL 7 — Middleware (protecție rute)

### `middleware.js` — în rădăcina proiectului
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
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // Redirecționează la login dacă nu e autentificat
  if (pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verifică rol admin pentru rutele /admin
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(
        new URL('/dashboard/evenimentul-meu', request.url)
      );
    }
  }

  // Redirecționează la first-login dacă must_change_password
  if (pathname.startsWith('/dashboard') && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('must_change_password')
      .eq('id', user.id)
      .single();

    if (profile?.must_change_password && pathname !== '/first-login') {
      return NextResponse.redirect(new URL('/first-login', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/first-login',
  ],
};
```

---

## PASUL 8 — API Routes critice

### `app/api/upload/presigned/route.js`
```javascript
import { NextResponse } from 'next/server';
import { getPresignedUploadUrl } from '@/lib/r2';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/mov', 'video/avi'];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB

export async function POST(request) {
  try {
    const { eventCode, contentType, fileType } = await request.json();

    if (!eventCode || !contentType || !fileType) {
      return NextResponse.json({ error: 'Lipsesc parametri' }, { status: 400 });
    }

    // Verifică content type permis
    const allowedTypes = fileType === 'photo' ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ error: 'Tip fișier nepermis' }, { status: 400 });
    }

    // Verifică că evenimentul există și e activ
    const supabase = await createClient();
    const { data: event, error } = await supabase
      .from('events')
      .select('id, status')
      .eq('event_code', eventCode)
      .single();

    if (error || !event) {
      return NextResponse.json({ error: 'Eveniment inexistent' }, { status: 404 });
    }

    if (event.status !== 'active') {
      return NextResponse.json({ error: 'Evenimentul nu mai acceptă upload-uri' }, { status: 403 });
    }

    // Construiește calea în R2
    const ext = contentType.split('/')[1].replace('quicktime', 'mov');
    const folder = fileType === 'photo' ? 'photos' : 'videos';
    const r2Key = `events/${event.id}/${folder}/${uuidv4()}.${ext}`;

    // Generează presigned URL (valabil 15 minute)
    const uploadUrl = await getPresignedUploadUrl(r2Key, contentType, 900);

    return NextResponse.json({ uploadUrl, r2Key, eventId: event.id });
  } catch (err) {
    console.error('Presigned URL error:', err);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
```

### `app/api/upload/confirm/route.js`
```javascript
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  try {
    const { r2Key, eventId, fileType, sizeBytes, originalName } = await request.json();

    if (!r2Key || !eventId || !fileType) {
      return NextResponse.json({ error: 'Lipsesc parametri' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('uploads')
      .insert({
        event_id: eventId,
        r2_key: r2Key,
        file_type: fileType,
        size_bytes: sizeBytes || null,
        original_name: originalName || null,
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, uploadId: data.id });
  } catch (err) {
    console.error('Confirm upload error:', err);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
```

### `app/api/stripe/checkout/route.js`
```javascript
import { NextResponse } from 'next/server';
import { stripe, PACKAGES } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request) {
  try {
    const { eventType, packageType, organizerEmail } = await request.json();

    const pkg = PACKAGES[eventType]?.[packageType];
    if (!pkg) {
      return NextResponse.json({ error: 'Pachet invalid' }, { status: 400 });
    }

    // Creează sesiunea Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'ron',
            unit_amount: pkg.price,
            product_data: {
              name: pkg.label,
              description: `CloudMemories — până la ${pkg.guestLimit} invitați, 3 luni stocare`,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: organizerEmail,
      metadata: {
        eventType,
        packageType,
        organizerEmail,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/evenimentul-meu?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/preturi`,
    });

    // Salvează comanda în DB cu status pending
    const supabase = createAdminClient();
    await supabase.from('orders').insert({
      organizer_email: organizerEmail,
      stripe_session_id: session.id,
      package_type: packageType,
      event_type: eventType,
      amount_ron: pkg.price,
      status: 'pending',
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}
```

### `app/api/stripe/webhook/route.js`
```javascript
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateQRCodeBuffer } from '@/lib/qrcode';
import { r2Client } from '@/lib/r2';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { sendAdminNotification } from '@/lib/resend';

// IMPORTANT: Nu parsa body-ul ca JSON — Stripe are nevoie de raw bytes pentru verificare
export const config = {
  api: { bodyParser: false },
};

function generateEventCode(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { eventType, packageType, organizerEmail } = session.metadata;

    const supabase = createAdminClient();

    // Generează eventCode unic
    let eventCode;
    let isUnique = false;
    while (!isUnique) {
      eventCode = generateEventCode();
      const { data } = await supabase
        .from('events')
        .select('id')
        .eq('event_code', eventCode)
        .single();
      if (!data) isUnique = true;
    }

    // URL-ul pentru QR
    const uploadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/upload/${eventCode}`;

    // Generează imaginea QR și o uploadează în R2
    const qrBuffer = await generateQRCodeBuffer(uploadUrl);
    const qrKey = `events/temp-${eventCode}/qr.png`;
    await r2Client.send(new PutObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: qrKey,
      Body: qrBuffer,
      ContentType: 'image/png',
    }));

    // Calculează data expirării (3 luni)
    const storageExpiresAt = new Date();
    storageExpiresAt.setMonth(storageExpiresAt.getMonth() + 3);

    // Creează evenimentul în DB
    const { data: newEvent } = await supabase
      .from('events')
      .insert({
        event_name: `Eveniment ${organizerEmail}`,
        event_type: eventType,
        event_code: eventCode,
        qr_r2_key: qrKey,
        package_type: packageType,
        storage_expires_at: storageExpiresAt.toISOString(),
        status: 'active',
      })
      .select('id')
      .single();

    // Actualizează comanda cu event_id și status paid
    await supabase
      .from('orders')
      .update({ status: 'paid', event_id: newEvent.id })
      .eq('stripe_session_id', session.id);

    // Creează cererea de cont
    const { data: orderData } = await supabase
      .from('orders')
      .select('id')
      .eq('stripe_session_id', session.id)
      .single();

    await supabase.from('account_requests').insert({
      email: organizerEmail,
      event_type: eventType,
      package_type: packageType,
      order_id: orderData.id,
      status: 'pending',
    });

    // Notifică adminul
    await sendAdminNotification(
      `🎉 Comandă nouă — ${organizerEmail}`,
      `
        <div style="font-family:sans-serif;padding:20px">
          <h2 style="color:#2d1b69">Comandă nouă primită!</h2>
          <p><strong>Email:</strong> ${organizerEmail}</p>
          <p><strong>Pachet:</strong> ${packageType} (${eventType})</p>
          <p><strong>Cod eveniment:</strong> ${eventCode}</p>
          <br>
          <p>Accesează dashboardul admin pentru a aproba contul:</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/conturi"
             style="background:#2d1b69;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">
            Aprobă Contul →
          </a>
        </div>
      `
    );
  }

  return NextResponse.json({ received: true });
}
```

---

## PASUL 9 — Deploy pe Vercel

### 9.1 Prima dată

```bash
# Instalezi Vercel CLI
npm install -g vercel

# Din folderul proiectului
vercel

# Urmezi instrucțiunile:
# - Link to existing project? No
# - Project name: cloudmemories
# - Directory: ./
# - Override settings? No
```

### 9.2 Adaugi variabilele de mediu pe Vercel

1. Mergi la **vercel.com → proiectul tău → Settings → Environment Variables**
2. Adaugi FIECARE variabilă din `.env.local` (una câte una)
3. Selectezi **Production + Preview + Development** pentru fiecare

### 9.3 Actualizezi URL-urile după deploy

1. Supabase → **Authentication → URL Configuration**
   - **Site URL:** `https://cloudofmemories.ro`
   - **Redirect URLs:** adaugi `https://cloudofmemories.ro/**`

2. Cloudflare R2 → CORS Policy → adaugi domeniul de producție

3. Stripe → Webhook → actualizezi URL-ul la `https://cloudofmemories.ro/api/stripe/webhook`

4. Resend → verifici domeniul `cloudofmemories.ro`

### 9.4 Deploy automat

```bash
# Orice push pe main face deploy automat
git add .
git commit -m "feat: initial deploy"
git push origin main
```

---

## PASUL 10 — Verificare finală (checklist)

```
□ Supabase: proiect creat, SQL rulat, tabele vizibile
□ Supabase: cont admin creat manual în auth.users + public.users
□ Cloudflare R2: bucket creat, public access activat, CORS configurat
□ Cloudflare R2: API token creat cu read+write permissions
□ Stripe: cont verificat, webhook configurat, Stripe CLI pornit local
□ Resend: domeniu verificat (sau folosești onboarding@resend.dev pt dev)
□ .env.local: toate cele 14 variabile completate
□ npm install: fără erori
□ npm run dev: pornește pe localhost:3000 fără erori
□ Test upload: /upload/TEST → butonele apar
□ Test login: /login → autentificare funcționează
□ Test admin: /admin → accesibil doar cu rol admin
```

---

## Probleme comune și soluții

**"Invalid JWT" la Supabase**
→ Verifică că `NEXT_PUBLIC_SUPABASE_ANON_KEY` e cel din proiectul corect

**"NoSuchBucket" la R2**
→ Verifică `CLOUDFLARE_R2_BUCKET_NAME` și că `CLOUDFLARE_R2_ACCOUNT_ID` e corect

**"Webhook signature mismatch" la Stripe**
→ Local: asigură-te că rulezi `stripe listen --forward-to localhost:3000/api/stripe/webhook`
→ Producție: verifică că `STRIPE_WEBHOOK_SECRET` e cel din dashboard-ul Stripe, nu cel din CLI

**CORS error la upload direct în R2**
→ Verifică configurarea CORS pe bucket (Pasul 2.6)
→ Asigură-te că originea din CORS include exact URL-ul aplicației tale

**"Row not found" la Supabase RLS**
→ Verifică că politicile RLS sunt create (SQL-ul din Pasul 1.2)
→ Folosește `createAdminClient()` (cu service role key) în API routes, NU `createClient()`
