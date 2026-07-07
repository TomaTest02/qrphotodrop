import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// --- Rate Limiter Map (In-Memory for Edge) ---
const rateLimitMap = new Map();
const RATE_LIMIT_MAX_REQUESTS = 15;
const RATE_LIMIT_WINDOW_MS = 10000;

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // ─── Rate Limiting for critical API routes ─────────────────────────────
  if (pathname.startsWith('/api/events/create') ||
      pathname.startsWith('/api/upload/presigned') ||
      pathname.startsWith('/api/upload/direct') ||
      pathname.startsWith('/api/admin/otp')) {
    
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    if (ip !== 'unknown') {
      const now = Date.now();
      const windowStart = now - RATE_LIMIT_WINDOW_MS;
      const requestTimestamps = (rateLimitMap.get(ip) || []).filter(timestamp => timestamp > windowStart);

      if (requestTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
        console.warn(`[RATE LIMIT] IP ${ip} blocked on ${pathname}`);
        return new NextResponse(
          JSON.stringify({ error: 'Too Many Requests', message: 'Prea multe cereri. Te rugăm să aștepți câteva secunde.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      requestTimestamps.push(now);
      rateLimitMap.set(ip, requestTimestamps);
    }
  }

  // ─── Rute publice care nu necesită autentificare ──────────────────────────
  // upload guest, API-uri publice pentru invitați
  const PUBLIC_ROUTES = [
    '/',
    '/login',
    '/register',
    '/pending',
    '/preturi',
    '/contact',
    '/blog',
    '/forgot-password',
    '/reset-password',
  ];

  const PUBLIC_PREFIXES = [
    '/register/',      // link-uri de recomandare wedding planner (/register/<slug>)
    '/upload/',        // pagina de upload pentru invitați
    '/api/upload/',    // API-urile de upload pentru invitați
    '/api/events',     // lookup event by code (pentru invitați)
    '/api/wishes',     // urări de la invitați
    '/api/qrcode',     // generare QR code
    '/api/contact',    // formular contact public
    '/api/auth/',      // callback OAuth
    '/api/stripe/webhook', // Stripe webhook (are propria semnătură)
    '/api/revalidate', // webhook Sanity (protejat cu secret în query)
    '/api/cron/',      // joburi programate (protejate cu CRON_SECRET)
    '/api/slideshow',  // date pentru slideshow-ul live
    '/slideshow/',     // pagina de slideshow (proiecție TV)
    '/eveniment/',     // pagini publice eveniment
    '/dashboard/demo', // pagina demo publică
    '/studio/',        // Sanity Studio
    '/_next/',         // assets Next.js
    '/favicon',
    '/icon',           // app/icon.svg
    '/apple-icon',     // app/apple-icon.png
    '/robots.txt',     // SEO — crawlere
    '/sitemap.xml',    // SEO — crawlere
    '/llms',           // llms.txt + llms-full.txt (descoperire LLM: ChatGPT/Claude/etc.)
    '/og-image',       // imagini OpenGraph
    '/images/',
    '/fonts/',
  ];

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
    || PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
    || pathname.match(/^\/(blog|preturi|contact)\//);

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // ─── Construim client Supabase fără cookies mutabile (read-only în middleware) ─
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // getUser() poate reîmprospăta sesiunea (access token expiră la ~1h) și scrie
  // cookie-uri noi pe `response`. La un redirect trebuie să le propagăm, altfel
  // refresh token-ul rotit se pierde și utilizatorul e delogat pe neașteptate.
  const redirectWithCookies = (url) => {
    const r = NextResponse.redirect(url);
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  // ─── Rutele /admin/* ───────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return redirectWithCookies(loginUrl);
    }

    // Verificăm rolul de admin din tabelul users
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      // User logat dar nu admin — îl trimitem la dashboard-ul lui
      return redirectWithCookies(new URL('/dashboard/evenimentul-meu', request.url));
    }

    return response;
  }

  // ─── Rutele /dashboard/* ───────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/first-login')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return redirectWithCookies(loginUrl);
    }

    // Verificăm că nu este pending (redirecționăm la /pending)
    const { data: profile } = await supabase
      .from('users')
      .select('status, role')
      .eq('id', user.id)
      .single();

    if (profile?.status === 'pending') {
      return redirectWithCookies(new URL('/pending', request.url));
    }

    // Adminul logat care accesează /dashboard — îl trimitem la /admin
    if (profile?.role === 'admin' && pathname.startsWith('/dashboard')) {
      return redirectWithCookies(new URL('/admin', request.url));
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Aplică middleware pe toate rutele EXCEPȚIE:
     * - _next/static (fișiere statice)
     * - _next/image (optimizare imagini)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
