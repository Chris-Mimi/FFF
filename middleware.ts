import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Page routes that don't require authentication
const publicPaths = ['/', '/login', '/signup', '/auth', '/forgot-password', '/reset-password'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Refresh the session (important for token refresh). A dead/rotated refresh
  // token (the multi-tab race) makes getUser() return a 4xx auth error; a network
  // blip throws or returns a 5xx. We only treat the former as "session invalid" so
  // a transient hiccup never logs a healthy user out.
  let user = null;
  let sessionInvalid = false;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      const status = (error as { status?: number }).status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        sessionInvalid = true;
      }
    } else {
      user = data.user;
    }
  } catch {
    // Thrown (network) error — transient, leave cookies alone.
  }

  const { pathname } = request.nextUrl;

  // Allow public routes through
  const isPublic = publicPaths.some((path) =>
    pathname === path || pathname.startsWith(path + '/')
  );

  if (!user) {
    // Self-heal a corrupted Supabase session: if auth cookies are present but the
    // session is definitively invalid, clear them so the user gets a clean login
    // instead of a frozen "signing in" state. Chunked tokens (…-auth-token.0/.1)
    // are included; the PKCE code-verifier cookie is deliberately NOT matched, so
    // an in-progress sign-in isn't broken.
    if (sessionInvalid) {
      const staleAuthCookies = request.cookies
        .getAll()
        .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name));

      if (staleAuthCookies.length > 0) {
        const target = isPublic ? new URL(request.url) : new URL('/login', request.url);
        const response = NextResponse.redirect(target);
        staleAuthCookies.forEach((c) => response.cookies.delete(c.name));
        return response;
      }
    }

    if (!isPublic) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return supabaseResponse;
}

// Only match page routes — API routes handle their own auth
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest)$).*)',
  ],
};
