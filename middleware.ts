// type-only — erased at build time, no CJS wrapper risk
import type { NextRequest } from "next/server";
// Direct ESM path to the class itself — avoids next/server.js (CJS) whose
// Turbopack shim injects __dirname (undefined in Edge Runtime), and avoids
// next/dist/esm/server/web/exports/index.js which re-exports `after` and
// `connection`, pulling in app-render modules that use Import Attributes
// syntax unsupported by Vercel's esbuild.
import { NextResponse } from "next/dist/esm/server/web/spec-extension/response.js";

// Middleware only handles routing — it does NOT enforce security.
// Real auth + role verification happens in server layouts via supabase.auth.getUser().
//
// We intentionally avoid importing @supabase/ssr here because createServerClient
// initialises the Supabase client at module load time, which can crash the Edge
// Runtime before any try/catch has a chance to run (MIDDLEWARE_INVOCATION_FAILED).
// Checking for the session cookie is sufficient for routing decisions.

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected =
    pathname.startsWith("/client") || pathname.startsWith("/speaker");
  const isAuthPage =
    pathname === "/login" || pathname === "/register";

  // Supabase v2 session cookie: sb-<project-ref>-auth-token
  const hasSession = request.cookies
    .getAll()
    .some(
      ({ name }) =>
        name.startsWith("sb-") && name.endsWith("-auth-token")
    );

  if (isProtected && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated users on auth pages → home page handles role routing
  if (isAuthPage && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
