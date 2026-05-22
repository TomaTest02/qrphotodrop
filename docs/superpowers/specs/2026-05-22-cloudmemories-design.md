# CloudMemories — Design Spec
_Date: 2026-05-22_

## Overview

SaaS platform pentru colectarea de poze, clipuri și urări de la invitați la evenimente (nunți, botezuri, aniversări, corporate) prin scanarea unui cod QR. Organizatorul primește toate fișierele centralizat și poate descărca o arhivă.

---

## Actori

| Actor | Descriere |
|---|---|
| **Guest (Invitat)** | Scanează QR, încarcă poze/clipuri sau trimite o urare. Fără cont. |
| **Organizer (Organizator)** | Plătește un pachet, primește cont + cod QR, accesează dashboardul cu fișierele colectate. |
| **Admin** | Gestionează tot: conturi, evenimente, blog CMS, notificări. |
| **Visitor** | Navighează site-ul de prezentare, cumpără un pachet. |

---

## Stack Tehnic

| Strat | Tehnologie | Motiv |
|---|---|---|
| Framework | Next.js 15, App Router, JavaScript | Cerut de client |
| Stilizare | CSS Modules + variabile CSS globale | Cerut de client ("CSS strict") |
| Animații | GSAP + ScrollTrigger | Cerut de client |
| Auth + DB | Supabase (PostgreSQL + Auth + RLS) | Ieftin, include auth și DB |
| Fișiere | Cloudflare R2 | Zero egress fees — critic pentru arhive mari |
| Plăți | Stripe Checkout + Webhooks | Standard industry |
| Email | Resend | 3.000/lună gratuit |
| QR Code | librăria `qrcode` (npm) | Gratuit |
| Deploy | Vercel | Natural pentru Next.js |

**Cost estimat la start: ~$0/lună.** La scale (300GB fișiere): ~$4.50/lună.

---

## Structura Rutelor (Next.js App Router)

```
app/
  (marketing)/
    page.js                     ← Homepage cu GSAP hero
    eveniment/[type]/page.js    ← nunta | botez | aniversare | corporate
    preturi/page.js             ← Pricing cu Stripe Checkout
    blog/page.js                ← Lista articole
    blog/[slug]/page.js         ← Articol individual
    contact/page.js             ← Formular contact
    layout.js                   ← Navbar + Footer marketing

  (app)/
    login/page.js               ← Login organizator
    dashboard/layout.js         ← Sidebar dashboard
    dashboard/evenimentul-meu/page.js   ← QR, uploads, urări, arhivă
    dashboard/contul-meu/page.js        ← Setări cont

  (admin)/
    admin/page.js               ← Dashboard admin
    admin/conturi/page.js       ← Gestionare conturi
    admin/blog/page.js          ← CMS blog
    admin/layout.js             ← Sidebar admin

  upload/[eventCode]/page.js    ← Pagina guest (fără auth)

  api/
    auth/[...supabase]/route.js
    upload/presigned/route.js   ← Generare presigned URL pentru R2
    upload/confirm/route.js     ← Confirmă upload reușit în DB
    wishes/route.js
    events/route.js
    archive/route.js            ← Trigger generare arhivă async
    stripe/checkout/route.js
    stripe/webhook/route.js
    admin/accounts/route.js
    admin/approve/route.js
    admin/otp/route.js
    contact/route.js
```

---

## Schema Bază de Date (Supabase PostgreSQL)

```sql
users         (id, email, phone, role: 'organizer'|'admin', status: 'active'|'blocked'|'pending', must_change_password, created_at)
events        (id, organizer_id, event_type, event_date, event_name, qr_code, package_type, status, storage_expires_at, created_at)
uploads       (id, event_id, r2_key, file_type: 'photo'|'video', thumbnail_key, size_bytes, created_at)
wishes        (id, event_id, first_name, last_name, email, message, created_at)
qr_designs    (id, name, preview_url, template_css)
blog_posts    (id, slug, title, content_md, cover_r2_key, published, created_at, updated_at)
orders        (id, organizer_email, stripe_session_id, package_type, event_type, amount_ron, status: 'pending'|'paid'|'failed', created_at)
account_requests (id, email, status: 'pending'|'approved'|'rejected', created_at)
```

---

## Pachete și Prețuri

### Nuntă
| Pachet | Preț | Invitați |
|---|---|---|
| Intimă | 279 RON | ≤100 |
| Completă | 369 RON | ≤250 |
| De Vis | 559 RON | ≤500 |

### Botez
| Pachet | Preț | Invitați |
|---|---|---|
| Intim | 249 RON | ≤50 |
| Complet | 329 RON | ≤150 |
| De Vis | 489 RON | ≤300 |

_Aniversare și Corporate: prețuri similare, detaliate la implementare._

Toate pachetele includ: album digital, QR unic, design printabil, 3 luni stocare, încărcări nelimitate, clipuri max 2 minute.

---

## Fluxuri Principale

### 1. Guest (Invitat)
1. Scanează QR → `/upload/[eventCode]`
2. Două butoane: **Încarcă poze/clipuri** | **Trimite o urare**
3. Upload poze: din galerie (multiple) sau cameră foto
4. Upload video: din galerie sau cameră (max 2 min)
5. Fișierele merg direct la R2 via presigned URL (nu prin server)
6. Succes: "Mulțumim! Putem să ne vedem povestea din ochii tăi!" + buton Închide
7. Urare: formular Prenume, Nume, Email (opțional), Mesaj (obligatoriu) → Mulțumim!

### 2. Visitor → Cumpărare pachet
1. Alege tipul de eveniment + pachet → buton "Comanzi acum"
2. Stripe Checkout (RON)
3. Webhook `checkout.session.completed` → creează `order` + `event` + `account_request`
4. Admin vede în dashboard: "user@example.com a plătit Nuntă Completă — aprobă cont?"
5. Admin aprobă → se creează cont cu parolă auto-generată
6. Admin trimite manual credențialele (WhatsApp/email)

### 3. Organizator — Prima logare
1. Login cu email + parolă
2. Redirect la schimbare parolă obligatorie
3. Introducere număr telefon → SMS cu cod (Supabase Auth)
4. Verificare cod → acces dashboard

### 4. Organizator — Dashboard
**Evenimentul meu:**
- QR code afișat + link copiabil
- Tab **Poze & Clipuri** | Tab **Urări**
- Buton "Generează arhivă" → job async → email cu link download
- Catalog designs pentru cartonașele QR
- Buton "Cere printare cartonașe" → notificare admin

**Contul meu:**
- Schimbă parolă / email
- Buton "Contactează suport" → mesaj către admin

### 5. Admin
- Dashboard cu: conturi noi, comenzi recente, evenimente active
- Gestionare conturi: creare, blocare, ștergere, generare OTP pentru reset parolă
- Blog CMS: creare/editare/ștergere articole cu upload imagine
- Poate vedea toate uploadurile și urările din orice eveniment

### 6. Arhivă (job async)
- Organizatorul cere arhiva → API route creează un job
- Job: stream din R2 toate fișierele evenimentului + CSV cu urările → ZIP → upload arhivă în R2
- Email via Resend cu link presigned (valabil 7 zile)

---

## Upload Fișiere (Arhitectură Critică)

**Fișierele NU trec prin serverul Next.js.** Flow:
1. Client cere presigned URL la `/api/upload/presigned`
2. Server verifică că `eventCode` există și e activ, generează URL presigned R2 (PUT, 15 min TTL)
3. Client face PUT direct la R2 cu fișierul
4. Client confirmă la `/api/upload/confirm` cu `r2_key`
5. Server înregistrează în tabelul `uploads`

Structura R2:
```
events/{eventId}/photos/{uuid}.jpg
events/{eventId}/videos/{uuid}.mp4
events/{eventId}/thumbnails/{uuid}.jpg
qr-designs/{designId}.png
blog/{slug}/{uuid}.jpg
archives/{eventId}/{timestamp}.zip
```

---

## Design & Animații

**Direcție:** Editorial Luxury — crem/off-white (#f5f0e8), violet profund (#2d1b69), accente aurii, tipografie serif (Georgia/Playfair Display) combinată cu sans-serif modern.

**GSAP:**
- Hero: text reveal cu SplitText stagger + parallax background
- Scroll: fade-in + slide-up pe secțiuni cu ScrollTrigger
- Pricing cards: hover cu scale + shadow animation
- Navbar: hide/show la scroll cu GSAP

**CSS Modules** pentru toate componentele. Variabile CSS globale în `app/globals.css`.

---

## Email-uri (Resend)

| Trigger | Destinatar | Conținut |
|---|---|---|
| Cont nou solicitat | Admin | "X a plătit pachetul Y, aprobă cont?" |
| Arhivă gata | Organizator | Link download (7 zile) |
| Contact form | Admin | Mesajul trimis |
| OTP reset | Organizator | Parolă temporară |

---

## Variabile de Mediu Necesare

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
CLOUDFLARE_R2_ACCOUNT_ID
CLOUDFLARE_R2_ACCESS_KEY_ID
CLOUDFLARE_R2_SECRET_ACCESS_KEY
CLOUDFLARE_R2_BUCKET_NAME
CLOUDFLARE_R2_PUBLIC_URL
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
NEXT_PUBLIC_APP_URL
```

---

## Limitări și Reguli Business

- Video max 2 minute / 200MB
- Poze max 20MB per fișier
- Stocare 3 luni de la data evenimentului (cron job ștergere automată)
- Arhivă link valabil 7 zile
- Admin este singurul care poate crea conturi de organizator
- La prima logare: schimbare parolă + verificare telefon obligatorie
