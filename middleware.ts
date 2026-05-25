import { NextResponse, type NextRequest } from "next/server";

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
