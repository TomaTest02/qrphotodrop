# PROMPT COMPLET — Website Cybernova Systems

> Copiază tot ce urmează și dă-i unui AI developer. Conține tot ce e necesar pentru a construi website-ul de la zero.

---

## 1. CONTEXT & OBIECTIV

Construiește website-ul de prezentare al firmei **Cybernova Systems** — o agenție digitală din România care oferă:
- Website-uri profesionale
- Web Applications
- Mobile Apps
- Automatizări de procese
- Implementări AI în aplicații și website-uri

**Scopul principal al website-ului:** conversie — vizitatorul trebuie să ajungă la butonul de contact sau să completeze un formular. Fiecare secțiune, CTA și animație servesc acest scop.

**Feel vizual:** Modern 2026, curat, inspirat din Apple.com și Vercel.com. NU gradiente de text cu neon, NU glassmorphism gros, NU carduri de dashboard AI. Tipografie masivă, spațiu generos, animații elegante care ghidează privirea.

---

## 2. STACK TEHNIC (versiuni exacte)

```
Next.js   16.2.6   ← ATENȚIE: versiune cu breaking changes față de Next.js 14/15
React     19.2.4
GSAP      3.15.0   (cu ScrollTrigger, SplitText dacă e disponibil)
Lenis     1.3.23   (smooth scroll)
Lucide    1.16.0   (lucide-react — pentru iconițe)
CSS       Module CSS (*.module.css per componentă) — ZERO Tailwind, ZERO styled-components
```

**IMPORTANT pentru Next.js 16:** Înainte de a scrie cod, citește `node_modules/next/dist/docs/` — sunt breaking changes față de Next.js 14/15 pe care le cunoști din training data. Respectă orice deprecation notice întâlnit.

**Import alias:** `@/` = root-ul proiectului (configurat în jsconfig.json)

**Structura de bază deja existentă:**
```
app/
  layout.js          ← root layout (adaugă SmoothScroll și fonturile aici)
  (marketing)/
    layout.js        ← layout pentru paginile publice (Navbar + Footer)
    page.js          ← homepage
components/
  SmoothScroll.js    ← deja există, Lenis + GSAP ScrollTrigger configurat
  marketing/         ← toate componentele pentru site
```

---

## 3. DESIGN SYSTEM

### 3.1 Paletă de culori

```css
:root {
  /* Culori principale */
  --color-bg:       #feffff;   /* fundal principal — aproape alb, nu pur alb */
  --color-bg-alt:   #f6f5f3;   /* fundal secțiuni alternate — gri cald subtil */
  --color-purple:   #56297f;   /* violet profund — culoarea primară, headings, logo, CTA-uri */
  --color-blue:     #4b8dc4;   /* albastru mediu — accente secundare, link-uri, taguri */
  --color-pink:     #e4a39f;   /* roz somon — accente terțiare, decorații, hover-uri */

  /* Text */
  --color-text-primary:   #56297f;         /* headings, titluri */
  --color-text-body:      #3d1f5c;         /* text corp — purple mai închis */
  --color-text-muted:     rgba(86,41,127,0.45);  /* text secundar, subtitluri */
  --color-text-faint:     rgba(86,41,127,0.25);  /* placeholders, separator text */

  /* Suprafețe */
  --color-surface:        #ffffff;
  --color-surface-hover:  rgba(86,41,127,0.04);
  --color-border:         rgba(86,41,127,0.08);
  --color-border-accent:  rgba(75,141,196,0.2);
}
```

### 3.2 Tipografie

```css
/* Font: Inter (Google Fonts) */
/* Weights necesare: 300, 400, 500, 600, 700, 800, 900 */

--font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Scale */
--text-xs:   11px  / letter-spacing: 0.06em
--text-sm:   13px
--text-base: 15px  / line-height: 1.65
--text-md:   17px  / line-height: 1.6
--text-lg:   20px
--text-xl:   24px  / letter-spacing: -0.02em
--text-2xl:  32px  / letter-spacing: -0.03em
--text-3xl:  48px  / letter-spacing: -0.04em
--text-4xl:  64px  / letter-spacing: -0.04em  (hero headline desktop)
--text-5xl:  80px  / letter-spacing: -0.05em  (display size)

/* Weights */
Headings:    800–900
Subheadings: 600–700
Body:        400–500
Labels/tags: 600, uppercase, letter-spacing: 0.08em
```

### 3.3 Spacing & Layout

```css
--container-max: 1200px;
--container-pad: 52px;  /* padding orizontal pe desktop */
--section-py:    120px; /* padding vertical secțiuni pe desktop */

/* Border radius */
--radius-sm:   8px
--radius-md:   14px
--radius-lg:   20px
--radius-xl:   28px
--radius-pill: 980px
```

### 3.4 Shadows

```css
--shadow-card:    0 2px 16px rgba(86,41,127,0.08);
--shadow-card-hover: 0 12px 48px rgba(86,41,127,0.14);
--shadow-cta:     0 8px 32px rgba(86,41,127,0.25);
```

---

## 4. SETUP ANIMAȚII

### 4.1 SmoothScroll (deja există în `components/SmoothScroll.js`)

Lenis + GSAP ScrollTrigger sunt deja conectate. Folosește componenta existentă:
```jsx
// app/layout.js sau app/(marketing)/layout.js
import SmoothScroll from '@/components/SmoothScroll';
// Wrap children cu <SmoothScroll>
```

### 4.2 Pattern GSAP în componente Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export default function MySection() {
  const sectionRef = useRef(null);
  
  useEffect(() => {
    const ctx = gsap.context(() => {
      // Toate animațiile tale aici — se cleanup automat
      gsap.fromTo('.animate-me', 
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out',
          scrollTrigger: {
            trigger: '.animate-me',
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        }
      );
    }, sectionRef); // scoped la componentă

    return () => ctx.revert(); // cleanup obligatoriu
  }, []);

  return <section ref={sectionRef}>...</section>;
}
```

### 4.3 Animații predefinite de folosit

```
INTRARE TEXT (headings):
  gsap.from(el, { y: 60, opacity: 0, duration: 1, ease: 'power4.out' })

STAGGER CARDURI:
  gsap.from(cards, { y: 50, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out' })

COUNTER ANIMAT:
  gsap.from(obj, { val: 0, duration: 2, ease: 'power2.out',
    onUpdate: () => el.textContent = Math.round(obj.val) + suffix })

REVEAL CU CLIP-PATH (efect modern):
  gsap.from(el, { clipPath: 'inset(0 100% 0 0)', duration: 1, ease: 'power4.inOut' })

LINE DRAW (pentru linii decorative SVG):
  gsap.from(path, { strokeDashoffset: 1, duration: 1.5, ease: 'power3.inOut' })

PARALLAX SUBTIL pe elemente decorative:
  gsap.to(el, { y: -80, ease: 'none',
    scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: 1.5 } })

PAGE LOAD (animație inițială hero):
  gsap.timeline({ delay: 0.1 })
    .from(navbar, { y: -20, opacity: 0, duration: 0.6 })
    .from(eyebrow, { y: 30, opacity: 0, duration: 0.7 }, '-=0.2')
    .from(titleLines, { y: 60, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power4.out' }, '-=0.4')
    .from(subtitle, { y: 20, opacity: 0, duration: 0.7 }, '-=0.5')
    .from(buttons, { y: 20, opacity: 0, stagger: 0.08, duration: 0.6 }, '-=0.4')
```

---

## 5. STRUCTURA FIȘIERE

```
app/
  (marketing)/
    layout.js          ← Navbar + Footer + SmoothScroll wrap
    page.js            ← import și render toate secțiunile homepage

components/
  marketing/
    Navbar.js + Navbar.module.css
    Hero.js + Hero.module.css
    Services.js + Services.module.css
    HowWeWork.js + HowWeWork.module.css
    Stats.js + Stats.module.css
    Portfolio.js + Portfolio.module.css
    Technologies.js + Technologies.module.css
    Testimonials.js + Testimonials.module.css
    CTASection.js + CTASection.module.css
    Footer.js + Footer.module.css
  SmoothScroll.js      ← există deja, nu modifica
```

---

## 6. SECȚIUNILE HOMEPAGE (detaliate)

### SECȚIUNEA 1 — Navbar

**Fișier:** `components/marketing/Navbar.js`

**Comportament:**
- La load: transparentă, fără background
- La scroll > 40px: background `rgba(254,255,255,0.88)` cu `backdrop-filter: blur(16px)`, border-bottom subtil
- Tranzitie CSS smoothă (transition: background 0.3s, backdrop-filter 0.3s)
- Sticky (position: fixed, top: 0)

**Layout desktop:**
```
[Logo: "Cybernova" — font-weight: 900, color: --color-purple]
  [Servicii] [Proiecte] [Despre noi] [Blog]
[Buton "Hai să vorbim" — pill, bg: --color-purple, text: white]
```

**Logo:** Text "Cybernova" cu "nova" în --color-blue. Font-size: 20px, font-weight: 900.

**Link-uri nav:** font-size: 14px, font-weight: 500, color: --color-text-muted. Hover: --color-purple.

**Iconițe Lucide folosite:** `Menu` (hamburger mobile), `X` (close mobile menu)

**Mobile:** Hamburger → drawer full-screen cu animație slide-down GSAP.

**Animație la load:** `gsap.from(navbar, { y: -60, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.1 })`

---

### SECȚIUNEA 2 — Hero

**Fișier:** `components/marketing/Hero.js`

**Layout:** Split 2 coloane — conținut stânga (55%), visual abstract dreapta (45%)
**Min-height:** 100vh
**Background:** --color-bg (#feffff)

**Conținut stânga (de sus în jos):**

1. **Tag/eyebrow:**
   ```
   · Agenție digitală din România
   ```
   Pill mic, background: rgba(75,141,196,0.1), border: rgba(75,141,196,0.25), color: --color-blue
   Lucide icon: `Zap` (16px) în stânga textului

2. **Heading principal** (H1):
   ```
   Construim
   produse digitale
   excepționale.
   ```
   Font-size: clamp(48px, 6vw, 76px), font-weight: 900, letter-spacing: -0.04em, color: --color-purple
   Cuvântul "digitale" în --color-blue
   Fiecare linie e un `<span class={styles.line}><span class={styles.inner}>text</span></span>` pentru animație clip-path

3. **Subtitlu:**
   ```
   Website-uri, aplicații web & mobile, automatizări și 
   soluții AI — livrate cu atenție la fiecare detaliu.
   ```
   font-size: 18px, color: --color-text-muted, max-width: 460px, line-height: 1.7

4. **Butoane CTA:**
   - Primar: "Pornește un proiect" — pill, bg: --color-purple, text: white, padding: 14px 28px, font-size: 15px, font-weight: 700
   - Secundar: "Vezi portofoliul →" — text link, color: --color-blue, font-weight: 600

5. **Social proof strip (sub butoane):**
   ```
   [Avatar 1][Avatar 2][Avatar 3] +50 de clienți mulțumiți  ⭐ 4.9/5
   ```
   3 avatar-uri suprapuse (divuri circulare colorate cu initiale), text muted

**Visual dreapta:**
Un element decorativ abstract — NU un dashboard, NU un screenshot de produs. Opțiuni:
- Un grid 3×3 Bauhaus cu formele geometrice în cele 4 culori (cercuri, semi-cercuri, pătrate) — similar cu Huemint's intersection grid
- SAU: Un element SVG animat cu forme geometrice care se mișcă subtil (GSAP float/rotate lent)
- Folosește `--color-purple`, `--color-blue`, `--color-pink`, `--color-bg` pentru formele geometrice
- Animație: `gsap.to(shape, { rotate: 360, duration: 20, ease: 'none', repeat: -1 })` pentru rotire lentă

**Animație hero la page load (GSAP timeline):**
```js
gsap.timeline({ delay: 0.2 })
  .from('.hero-tag', { y: 20, opacity: 0, duration: 0.5 })
  .from('.hero-line .hero-inner', { y: '100%', duration: 0.9, stagger: 0.1, ease: 'power4.out' }, '-=0.2')
  .from('.hero-sub', { y: 20, opacity: 0, duration: 0.7 }, '-=0.5')
  .from('.hero-btns > *', { y: 20, opacity: 0, stagger: 0.1, duration: 0.6 }, '-=0.4')
  .from('.hero-social-proof', { y: 15, opacity: 0, duration: 0.5 }, '-=0.3')
  .from('.hero-visual', { x: 40, opacity: 0, duration: 1, ease: 'power3.out' }, '-=0.8')
```

**Scroll indicator:** O săgeată animată jos (bounce GSAP) care dispare la scroll.

---

### SECȚIUNEA 3 — Servicii

**Fișier:** `components/marketing/Services.js`

**Background:** --color-bg-alt (#f6f5f3)
**Padding:** 120px 52px

**Header secțiune:**
```
[Tag: "Ce facem"]
Servicii complete
pentru afacerea ta digitală
```
Centrat, tag în --color-blue, heading în --color-purple, font-size: clamp(36px, 4vw, 52px), font-weight: 800

**Grid carduri:** 5 carduri în layout `grid-template-columns: repeat(3, 1fr)` — primele 3 pe rândul 1, ultimele 2 centrate pe rândul 2. Pe mobile: 1 coloană.

**Fiecare card conține:**
- Icon Lucide (32px, color: --color-blue sau --color-purple alternant)
- Titlu serviciu (font-size: 20px, font-weight: 800, color: --color-purple)
- Descriere scurtă (2-3 rânduri, color: --color-text-muted)
- Link "Află mai mult →" în --color-blue

**Card design:** background: white, border: 1px solid --color-border, border-radius: 20px, padding: 32px, box-shadow: --shadow-card. La hover: box-shadow: --shadow-card-hover, transform: translateY(-4px).

**Servicii + iconițe Lucide:**
| Serviciu | Icon Lucide |
|---|---|
| Website-uri | `Globe` |
| Web Applications | `LayoutDashboard` |
| Mobile Apps | `Smartphone` |
| Automatizări | `Zap` |
| Implementări AI | `BrainCircuit` |

**Animație ScrollTrigger:**
```js
gsap.from(cards, {
  y: 60, opacity: 0, duration: 0.7, stagger: 0.12, ease: 'power3.out',
  scrollTrigger: { trigger: grid, start: 'top 80%' }
})
```

---

### SECȚIUNEA 4 — Cum lucrăm

**Fișier:** `components/marketing/HowWeWork.js`

**Background:** --color-bg (alb)
**Titlu secțiune:** "Procesul nostru" / "De la idee la lansare în 4 pași"

**Layout:** 4 pași în linie orizontală (desktop) sau vertical (mobile), conectați printr-o linie care se "desenează" cu GSAP strokeDashoffset.

**Cei 4 pași:**
1. **Descoperire** — Înțelegem afacerea, obiectivele și publicul tău
   Icon: `Search`
2. **Design & Strategie** — Wireframes, design system, arhitectură tehnică
   Icon: `Figma` sau `PenTool`
3. **Development** — Cod curat, performant, scalabil
   Icon: `Code2`
4. **Lansare & Suport** — Deploy, testare, optimizare continuă
   Icon: `Rocket`

**Design pas:**
- Număr mare (01, 02, 03, 04) în --color-pink, font-size: 48px, font-weight: 900, opacity: 0.4
- Icon Lucide (28px) în --color-purple
- Titlu pas: font-weight: 700, --color-purple
- Descriere: --color-text-muted

**Animație:** Linia orizontală se desenează cu `strokeDashoffset` ScrollTrigger scrub. Pașii apar staggered.

---

### SECȚIUNEA 5 — Cifre / Stats

**Fișier:** `components/marketing/Stats.js`

**Background:** --color-purple (sectiunea e întunecată — singura cu fond violet)
**Text:** alb

**Layout:** 4 carduri în linie

**Stats:**
| Nr | Label |
|---|---|
| 50+ | Proiecte livrate |
| 98% | Clienți mulțumiți |
| 4.9★ | Rating mediu |
| 3 ani | Experiență |

**Animație counter:** Fiecare număr se animează de la 0 la valoarea finală cu `gsap.to(obj, { val: target, onUpdate })` declanșat de ScrollTrigger.

**Design:** Fiecare stat are numărul mare (font-size: 56px, font-weight: 900, color: --color-pink) și labelul dedesubt (font-size: 14px, color: rgba(255,255,255,0.6)).

---

### SECȚIUNEA 6 — Portofoliu (teaser)

**Fișier:** `components/marketing/Portfolio.js`

**Background:** --color-bg-alt
**Titlu:** "Lucrările noastre" + buton "Vezi toate proiectele →" aliniat dreapta

**Layout:** 3 carduri în grid `repeat(3, 1fr)` (desktop) sau `repeat(2, 1fr)` (tablet) sau `1fr` (mobile)

**Card proiect:**
- Placeholder imagine (aspect-ratio: 16/10) cu gradient lin în culorile brandului (folosește div cu background gradient, nu img)
- Tag categorie (ex: "Web App") — pill mic în --color-blue
- Titlu proiect: font-weight: 800, --color-purple
- Descriere scurtă 1 rând
- "Vezi proiectul →" link în --color-blue

**Proiecte placeholder (inventate, dar verosimile):**
1. "EduTrack" — Platformă e-learning pentru licee | Web App
2. "MediFlow" — Sistem de programări online pentru clinici | Web App + Mobile
3. "AutoBot CRM" — Automatizare CRM pentru agenții imobiliare | Automatizare + AI

**Hover card:** Scale 1.02, box-shadow crescut, overlay subtil.

**Animație:** Cards fade in + slide up staggered la scroll.

---

### SECȚIUNEA 7 — Tehnologii

**Fișier:** `components/marketing/Technologies.js`

**Background:** --color-bg
**Titlu:** "Cu ce lucrăm"

**Layout:** Logo-uri tehnologii în grid cu scroll marquee (infinite horizontal loop cu GSAP):
- Next.js, React, React Native, Node.js, TypeScript, PostgreSQL, Supabase, AWS, Vercel, Figma, OpenAI, n8n

**Implementare marquee GSAP:**
```js
gsap.to(track, {
  x: '-50%',
  duration: 20,
  ease: 'none',
  repeat: -1
})
// track conține logo-urile duplicate pentru loop seamless
```

**Design logo-uri:** Text sau SVG simplu, filter: grayscale(1) opacity: 0.4. Hover: grayscale(0) opacity: 1, transition 0.3s.

---

### SECȚIUNEA 8 — Testimoniale

**Fișier:** `components/marketing/Testimonials.js`

**Background:** --color-bg-alt
**Titlu:** "Ce spun clienții noștri"

**Layout:** 3 carduri în grid (desktop), sau un slider simplu (mobile)

**Card testimonial:**
- Ghilimele decorative " " în --color-pink, font-size: 64px
- Textul review (3-5 rânduri), color: --color-text-body
- Separator linie
- Avatar (inițiale în cerc, background: --color-purple) + Nume client + Companie
- Rating: ★★★★★ în --color-pink

**Testimoniale placeholder:**
1. *"Cybernova ne-a livrat aplicația în 6 săptămâni. Arată exact cum am visat și performează perfect."*
   — Andrei M., CEO @TechStart
2. *"Automatizările implementate de ei ne-au economisit 30 de ore pe lună. ROI în prima lună."*
   — Elena P., Manager @ImoFlow
3. *"Design modern, cod curat, comunicare excelentă. Singurul partener digital de care ai nevoie."*
   — Radu C., Fondator @EduPlat

---

### SECȚIUNEA 9 — CTA Final

**Fișier:** `components/marketing/CTASection.js`

**Background:** --color-purple (a doua secțiune întunecată)

**Layout:** Centrat, full-width

**Conținut:**
```
[Icon: Zap sau ArrowRight — mare, 48px, color: --color-pink]

Gata să construim ceva
extraordinar împreună?

Spune-ne despre proiectul tău și îți trimitem 
o propunere în 24 de ore.

[Buton mare: "Trimite-ne proiectul"  →]
[Link mic dedesubt: "sau scrie-ne pe WhatsApp"]
```

**Buton:** Background: --color-pink, color: --color-purple, font-weight: 800, padding: 16px 36px, border-radius: pill, font-size: 17px. Hover: scale(1.03), shadow crescut.

**Animație:** Heading split pe linii cu reveal de jos în sus. Butonul apare cu scale from 0.9.

**Element decorativ:** Forme geometrice abstracte în background (cercuri mari semi-transparente în --color-blue și --color-pink) cu parallax GSAP scrub.

---

### SECȚIUNEA 10 — Footer

**Fișier:** `components/marketing/Footer.js`

**Background:** #0d0817 (violet aproape negru — mai închis decât --color-purple)
**Text:** rgba(255,255,255,0.5)

**Layout 4 coloane:**
```
[Logo + tagline + social icons]  [Servicii]  [Companie]  [Contact]
```

**Col 1 — Brand:**
- Logo "Cybernova" alb
- Tagline: "Construim viitorul digital al afacerii tale."
- Social icons Lucide: `Linkedin`, `Instagram`, `Github`, `Twitter`

**Col 2 — Servicii:**
- Website-uri
- Web Applications
- Mobile Apps
- Automatizări
- Implementări AI

**Col 3 — Companie:**
- Despre noi
- Proiecte
- Blog
- Cariere

**Col 4 — Contact:**
- contact@cybernova.ro
- +40 xxx xxx xxx
- România, București

**Bottom bar:** © 2025 Cybernova Systems · Privacy Policy · Termeni și condiții

---

## 7. ANIMAȚII GLOBALE (aplicate pe mai multe componente)

### 7.1 Heading reveal universal

Creează un component `AnimatedHeading.js` refolosibil:
```jsx
// Împarte heading-ul pe cuvinte/linii și animă fiecare cu clip-path sau translateY
// Trigger: ScrollTrigger start: 'top 80%'
```

### 7.2 Card hover (CSS + GSAP)

```css
.card {
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}
.card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-card-hover);
}
```

### 7.3 Section reveal generat

Fiecare `<section>` primește `data-animate="fade-up"` și un observer global GSAP ScrollTrigger care animă:
```js
gsap.from('[data-animate="fade-up"]', {
  y: 40, opacity: 0, duration: 0.8, ease: 'power3.out',
  scrollTrigger: { trigger: el, start: 'top 85%' }
})
```

---

## 8. ICONIȚE LUCIDE — listă completă folosită

```jsx
import {
  Globe,          // Website-uri
  LayoutDashboard,// Web Apps
  Smartphone,     // Mobile Apps
  Zap,            // Automatizări + tag hero
  BrainCircuit,   // AI
  Search,         // Pas 1 process
  PenTool,        // Pas 2 process
  Code2,          // Pas 3 process
  Rocket,         // Pas 4 process
  ArrowRight,     // CTA links
  Star,           // Rating
  Menu,           // Navbar mobile
  X,              // Close mobile menu
  Linkedin,
  Instagram,
  Github,
  Twitter,
  ChevronDown,    // Scroll indicator hero
  Check,          // Checkmarks în cards
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
```

---

## 9. RESPONSIVE BREAKPOINTS

```css
/* Mobile first */
@media (max-width: 640px)  { /* mobile */ }
@media (max-width: 768px)  { /* tablet */ }
@media (min-width: 1024px) { /* desktop */ }
@media (min-width: 1280px) { /* large desktop */ }

/* Hero: 2 col → 1 col centrat pe mobile */
/* Services grid: 3 col → 2 col → 1 col */
/* Stats: 4 col → 2 col → 2 col */
/* Footer: 4 col → 2 col → 1 col */
```

---

## 10. PERFORMANȚĂ & NOTE IMPORTANTE

1. **`'use client'` doar unde e necesar** — componentele cu GSAP și event handlers. Componentele statice rămân Server Components.
2. **GSAP cleanup obligatoriu** — `return () => ctx.revert()` în fiecare useEffect cu GSAP. Fără cleanup = memory leak + animații duble pe hot reload.
3. **Font loading** — Adaugă Inter în `app/layout.js` cu `next/font/google` conform documentației Next.js 16.
4. **CSS Modules naming** — `.camelCase` pentru clase în `.module.css`, nu kebab-case.
5. **Lenis + ScrollTrigger** — `SmoothScroll.js` existent sincronizează deja cele două. Nu reinițializa Lenis separat.
6. **Nu folosi `<img>` direct** — Folosește `<Image>` din `next/image` pentru toate imaginile.
7. **GSAP SplitText** — Dacă SplitText nu e disponibil în GSAP 3.15 free tier, împarte manual pe `<span>` per linie/cuvânt.
8. **Animații dezactivate pe reduced-motion:**
   ```js
   const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   if (!prefersReduced) { /* animații GSAP */ }
   ```

---

## 11. ORDINEA DE IMPLEMENTARE RECOMANDATĂ

1. Setup `app/(marketing)/layout.js` cu Navbar, Footer, SmoothScroll
2. CSS variables în `app/globals.css`
3. Hero — prima secțiune, cea mai importantă
4. Navbar cu behavior scroll
5. Services
6. Stats
7. HowWeWork
8. Portfolio
9. Technologies (marquee)
10. Testimonials
11. CTASection
12. Footer
13. Responsive pentru toate

---

## 12. CONȚINUT TEXTUAL FINAL

**Meta SEO:**
- Title: `Cybernova Systems — Agenție Digitală | Website-uri, Apps & AI`
- Description: `Construim website-uri profesionale, aplicații web & mobile, automatizări și soluții AI pentru afacerea ta. Cybernova Systems — partenerul tău digital din România.`

**Headline hero opțiuni (alege una):**
- `Construim produse digitale excepționale.`
- `Digitalizăm afacerea ta. Fără compromisuri.`
- `Codul din spatele afacerii tale de succes.`

**Tagline navbar:** (sub logo, opțional) `Digital Agency`

---

*Prompt creat pentru proiectul Cybernova Systems · Mai 2026*
