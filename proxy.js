import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request) {
  const { pathname } = request.nextUrl;

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
