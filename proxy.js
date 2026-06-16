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
  ];

  const PUBLIC_PREFIXES = [
    '/upload/',        // pagina de upload pentru invitați
    '/api/upload/',    // API-urile de upload pentru invitați
    '/api/events',     // lookup event by code (pentru invitați)
    '/api/wishes',     // urări de la invitați
    '/api/qrcode',     // generare QR code
    '/api/contact',    // formular contact public
    '/api/auth/',      // callback OAuth
    '/api/stripe/webhook', // Stripe webhook (are propria semnătură)
    '/eveniment/',     // pagini publice eveniment
    '/dashboard/demo', // pagina demo publică
    '/studio/',        // Sanity Studio
    '/_next/',         // assets Next.js
    '/favicon',
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

  // ─── Rutele /admin/* ───────────────────────────────────────────────────────
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verificăm rolul de admin din tabelul users
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      // User logat dar nu admin — îl trimitem la dashboard-ul lui
      return NextResponse.redirect(new URL('/dashboard/evenimentul-meu', request.url));
    }

    return response;
  }

  // ─── Rutele /dashboard/* ───────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/first-login')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verificăm că nu este pending (redirecționăm la /pending)
    const { data: profile } = await supabase
      .from('users')
      .select('status, role')
      .eq('id', user.id)
      .single();

    if (profile?.status === 'pending') {
      return NextResponse.redirect(new URL('/pending', request.url));
    }

    // Adminul logat care accesează /dashboard — îl trimitem la /admin
    if (profile?.role === 'admin' && pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/admin', request.url));
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
