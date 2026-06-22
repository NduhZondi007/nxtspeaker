// type-only — erased at build time, no CJS wrapper risk
import type { NextRequest } from "next/server";
// Direct ESM path to the class itself — avoids next/server.js (CJS) whose
// Turbopack shim injects __dirname (undefined in Edge Runtime), and avoids
// next/dist/esm/server/web/exports/index.js which re-exports `after` and
// `connection`, pulling in app-render modules that use Import Attributes
// syntax unsupported by Vercel's esbuild.
import { NextResponse } from "next/dist/esm/server/web/spec-extension/response.js";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // Build a mutable response so refreshed session cookies can be attached.
  let response = NextResponse.next({ request });

  // createServerClient from @supabase/ssr is fully Edge-compatible.
  // The prior MIDDLEWARE_INVOCATION_FAILED error was caused by next/server
  // (CJS __dirname), which is already fixed via the ESM import above.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed tokens into the request so downstream Server
          // Components see them within this same request cycle.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Rebuild the response with the updated request, then write the
          // cookies to the response so the browser receives the new tokens.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT and, when the access token is expired,
  // uses the refresh token to obtain a new one — writing it back via
  // setAll() above. Middleware is the only layer that can write cookies,
  // so this is the correct and only place to handle token refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/client") || pathname.startsWith("/speaker");
  const isAuthPage =
    pathname === "/login" || pathname === "/register";

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated users on auth pages → home page handles role routing.
  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Return the response with any refreshed session cookies attached.
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
