import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Bypass auth checks and Supabase client initialization for demo routes
  // so the sandbox can run local-storage simulations without Supabase credentials.
  if (pathname === '/dashboard/demo' || pathname === '/admin/demo') {
    return NextResponse.next();
  }

  // Gracefully handle missing Supabase credentials instead of crashing the server
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next();
  }

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
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protejează dashboard organizator
  if (pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Protejează admin
  if (pathname.startsWith('/admin') && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check profile for status and role if user is logged in
  if (user && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname === '/first-login')) {
    const { data: profile } = await supabase
      .from('users')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (profile?.status === 'pending') {
      return NextResponse.redirect(new URL('/pending', request.url));
    }

    if (pathname.startsWith('/admin') && profile?.role !== 'admin') {
      return NextResponse.redirect(
        new URL('/dashboard/evenimentul-meu', request.url)
      );
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/first-login'],
};
