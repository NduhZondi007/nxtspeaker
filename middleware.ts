// type-only — erased at build time, no CJS wrapper risk
import type { NextRequest } from "next/server";
// Direct ESM path to the class itself — avoids next/server.js (CJS) whose
// Turbopack shim injects __dirname (undefined in Edge Runtime), and avoids
// next/dist/esm/server/web/exports/index.js which re-exports `after` and
// `connection`, pulling in app-render modules that use Import Attributes
// syntax unsupported by Vercel's esbuild. See docs/ERRORS.md (2026-06-16).
import { NextResponse } from "next/dist/esm/server/web/spec-extension/response.js";
import { createServerClient } from "@supabase/ssr";
import { createLogger } from "@/lib/logger";

const log = createLogger("middleware");

export async function middleware(request: NextRequest) {
  // Build a mutable response so refreshed session cookies can be attached.
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // A missing variable must not crash the Edge function for every request
  // (MIDDLEWARE_INVOCATION_FAILED, docs/ERRORS.md 2026-05-24). Pages still
  // enforce auth themselves through the server client.
  if (!supabaseUrl || !supabaseAnonKey) {
    log.error("Supabase env vars missing; skipping session refresh");
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write refreshed tokens into the request so downstream Server
        // Components see them within this same request cycle.
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Rebuild the response with the updated request, then write the
        // cookies to the response so the browser receives the new tokens.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // getClaims() reads the session from the cookies — refreshing an expired
  // access token through getSession() and writing it back via setAll() above,
  // exactly as getUser() did — and then verifies the JWT signature locally
  // against the project's cached JWKS. getUser() instead made a round trip to
  // the Auth server on every matched request. (With a legacy symmetric JWT
  // secret, getClaims falls back to that same round trip, so it is never
  // slower than before.) Middleware is the only layer that can write
  // cookies, so this remains the one place token refresh happens.
  let isSignedIn = false;
  try {
    const { data } = await supabase.auth.getClaims();
    isSignedIn = Boolean(data?.claims?.sub);
  } catch (err) {
    // An invalid/expired token or a JWKS fetch failure: treat as signed out.
    // The protected-route redirect below is the safe outcome, and /login
    // never redirects a signed-out user, so this cannot loop.
    log.warn("session verification failed", { cause: err });
  }

  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/client") ||
    pathname.startsWith("/speaker") ||
    pathname.startsWith("/admin");
  const isAuthPage = pathname === "/login" || pathname === "/register";

  if (isProtected && !isSignedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated users on auth pages → home page handles role routing.
  if (isAuthPage && isSignedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Return the response with any refreshed session cookies attached.
  return response;
}

export const config = {
  // Only the routes that read the session server-side or route on it. The
  // previous catch-all also ran the session check for every image, RSC
  // prefetch of public pages, robots.txt, sitemap.xml, the web manifest and
  // the OG image. Everything that renders with the user's session lives
  // under these paths, including the Server Actions they post to.
  // `api/webhooks` stays excluded: a provider webhook carries no cookies and
  // authenticates by signature. `/auth/callback` is a route handler that
  // sets its own cookies after the code exchange.
  matcher: [
    "/",
    "/login",
    "/register",
    "/client/:path*",
    "/speaker/:path*",
    "/admin/:path*",
  ],
};
