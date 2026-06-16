# Error Log

All non-trivial errors, bugs, and incidents are documented here.
Append entries in reverse-chronological order (newest first).

---

## 2026-06-16 · bug · SECURITY DEFINER trigger fails with "Database error saving new user"

**Type:** bug
**Affected:** `supabase/migrations/` — `handle_new_user()` and `handle_new_speaker_profile()` triggers, `src/lib/supabase/server.ts`
**Severity:** critical (every new user registration fails)

**What happened:**
Every call to `auth.admin.createUser()` returned "Database error saving new user". New users could not register at all. 16 `auth.users` rows existed but only 13 had a corresponding `public.profiles` row — 3 users had no profile.

**Root cause:**
`supabase_auth_admin` (the role GoTrue uses) has `search_path=auth` set in its `rolconfig`. Both SECURITY DEFINER trigger functions (`handle_new_user`, `handle_new_speaker_profile`) had `proconfig=NULL` — no explicit `search_path`. PostgreSQL SECURITY DEFINER functions with no explicit `search_path` inherit the **calling session's** `search_path`, not the function owner's. So the functions ran with `search_path=auth`, and the bare table reference `profiles` resolved to `auth.profiles` (which does not exist), crashing the trigger and rolling back the `auth.users` INSERT. The 3 orphaned users were created before the trigger was set up.

**Fix:**
- Migration `20260616195246_fix-trigger-search-path.sql`: recreated both functions with `SET search_path = ''` and fully-qualified `public.` table names.
- Same migration backfills profiles for the 3 orphaned users.
- `src/lib/supabase/server.ts`: replaced `createServerClient` (from `@supabase/ssr`) with `createClient` (from `@supabase/supabase-js`) for the service role client. SSR client is not intended for admin operations and uses cookie overhead unnecessarily.

**Prevention:**
All SECURITY DEFINER functions must include `SET search_path = ''` and use fully-qualified schema.table names. Run `supabase db advisors` after any function change — it flags SECURITY DEFINER functions without explicit search_path.

---

## 2026-06-16 · infrastructure · Vercel build failure — Import Attributes syntax in Next.js ESM tree

**Type:** infrastructure / config
**Affected:** `middleware.ts`, `src/types/next-server-edge.d.ts`, Vercel production build
**Severity:** critical (build failing; site deployed at old broken version)

**What happened:**
After changing `middleware.ts` to import from `next/dist/esm/server/web/exports/index.js`
(to avoid the CJS `__dirname` crash), the Vercel production build failed with three
esbuild syntax errors in Next.js internal files:

```
next/dist/esm/server/app-render/after-task-async-storage.external.js:2:109:
  ERROR: Expected ";" but found "with"
```

**Root cause:**
`next/dist/esm/server/web/exports/index.js` re-exports `after` and `connection` in
addition to `NextResponse`. The `after` export imports from `../../after`, which
transitively pulls in `app-render` async-storage modules. Those modules use
Import Attributes syntax (`import ... with { type: 'commonjs' }`), a newer JS feature
that Vercel's esbuild-based edge bundler does not support.

**Fix:**
Changed import to `next/dist/esm/server/web/spec-extension/response.js` — the file
that directly defines `NextResponse`. Its transitive dependencies are only cookies,
URL parsing, and response utilities; zero `app-render` or Import Attributes syntax.
Updated `src/types/next-server-edge.d.ts` to declare the new module path. Both
`npm run type-check` and `npm run build` pass cleanly.

**Prevention:**
When importing deep into Next.js internal paths, target the narrowest file that
exports only what you need. Index files (like `exports/index.js`) often re-export
server-only modules with incompatible syntax for the Edge Runtime bundler.

---

## 2026-06-16 · infrastructure · MIDDLEWARE_INVOCATION_FAILED — ReferenceError: __dirname

**Type:** infrastructure / config
**Affected:** `middleware.ts`, Vercel production deployment (all requests)
**Severity:** critical (site completely down — every request returned 500)

**What happened:**
Every request to `imvunulo.co.za` returned HTTP 500 with error code
`MIDDLEWARE_INVOCATION_FAILED`. The Edge Runtime crashed on every hit due to
`ReferenceError: __dirname is not defined`.

**Root cause:**
`next/server` (the module imported by `middleware.ts`) resolves to
`node_modules/next/server.js`, which is CommonJS (`module.exports = ...`).
On Vercel's Linux/Node 24 Turbopack production build, CJS modules are wrapped in a
Node.js-style module shim that injects `__dirname`. The Edge Runtime is a V8 isolate
and does not provide `__dirname`, so the shim throws on module load. The issue does
not reproduce on Windows (local dev) because Turbopack's native binary handles
CJS-to-Edge wrapping differently per platform.

A previous fix attempt used `turbopack.resolveAlias` in `next.config.ts` to redirect
`next/server` to the ESM path. This silently failed: the `turbopack.*` config key
only affects the Turbopack **dev server**, not production builds.

**Fix:**
Changed import in `middleware.ts` from `next/server` to
`next/dist/esm/server/web/spec-extension/response.js` (pure ESM, no CJS wrapper,
no `app-render` transitive dependencies). Kept `NextRequest` as a `type`-only import
from `"next/server"` since type imports are erased at build time and generate no
runtime code. Added `src/types/next-server-edge.d.ts` to provide TypeScript
declarations for the ESM path.

**Prevention:**
When importing from `next/*` in Edge Middleware, always verify the resolved file is
ESM, not CJS. `import type` is always safe. Runtime value imports need an ESM entry.

---

## 2026-05-24 · infrastructure · MIDDLEWARE_INVOCATION_FAILED on Vercel

**Type:** infrastructure / config
**Affected:** `middleware.ts`, Vercel production deployment
**Severity:** critical (site completely down — every request returned 500)

**What happened:**
Every request to `nxtspeaker.vercel.app` returned HTTP 500 with error code
`MIDDLEWARE_INVOCATION_FAILED`. The Vercel runtime log showed the middleware
executing for 26ms in the Edge Runtime (lhr1) before crashing, with no
recoverable error output.

**Root cause:**
Two combined issues:
1. Supabase environment variables (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`) were not confirmed to be set in the
   Vercel project's Environment Variables dashboard for the Production
   environment. Passing `undefined` to `createServerClient` causes an
   unrecoverable crash in the V8 Edge Runtime.
2. The middleware had no `try/catch` around `supabase.auth.getUser()` and
   no guard for missing env vars, so any initialisation failure became a
   fatal `MIDDLEWARE_INVOCATION_FAILED` instead of a graceful fallback.

**Fix:**
- Added an early env var guard in `middleware.ts`: if either Supabase
  variable is absent the middleware skips gracefully and logs an error
  rather than crashing.
- Wrapped `supabase.auth.getUser()` in a `try/catch`; auth failures now
  fall through as unauthenticated rather than crashing the edge function.
- Removed TypeScript `!` non-null assertions on env var reads in middleware
  (they suppress compile-time warnings but do not prevent runtime crashes).
- **Action required:** Verify all four env vars are set in Vercel dashboard
  and redeploy.

**Prevention:**
- Middleware must never crash the Edge Runtime. All Supabase calls in
  middleware are now wrapped in error boundaries.
- Added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to
  deployment checklist in `CLAUDE.md`.

---

## 2026-05-24 · security · Role read from user-controlled metadata

**Type:** security
**Affected:** `supabase/migrations/` — `handle_new_user()` trigger
**Severity:** high

**What happened:**
The `handle_new_user` database trigger was reading the user's role from
`raw_user_meta_data`, which can be set by anyone during Supabase Auth
signup via the public API.

**Root cause:**
`raw_user_meta_data` is writable by the client. A malicious user could
register with `{ role: "SPEAKER" }` in their metadata and be assigned a
SPEAKER profile without going through the intended registration flow.

**Fix:**
Migration `20260524000001_security-fixes.sql` updated `handle_new_user()`
to read role from `raw_app_meta_data`, which is only writable by the
service role key.

**Prevention:**
- Never read auth claims from `raw_user_meta_data` for security-sensitive
  fields.
- Added rule to `CLAUDE.md` code standards section.

---

## 2026-05-24 · bug · Duplicate booking numbers under concurrent load

**Type:** bug (race condition)
**Affected:** `supabase/migrations/` — `generate_booking_number()` trigger
**Severity:** medium

**What happened:**
Two concurrent booking inserts could both read the same `COUNT(*)+1` value
and receive identical booking numbers (e.g. `NXT-2026-00042` assigned twice).

**Root cause:**
`COUNT(*)+1` is not atomic. Under concurrent writes, two transactions can
read the same count before either has committed.

**Fix:**
Migration `20260524000001_security-fixes.sql` replaced the counter with a
Postgres sequence (`booking_number_seq`). `nextval()` is atomic and
guaranteed unique under any concurrency level.

**Prevention:**
Never use `COUNT(*)+1` as an ID or sequence generator. Use Postgres
sequences or `gen_random_uuid()`.
