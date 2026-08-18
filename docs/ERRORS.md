# Error Log

All non-trivial errors, bugs, and incidents are documented here.
Append entries in reverse-chronological order (newest first).

## 2026-08-18 · infrastructure · Supabase Preview branching failing on every PR

**Type:** infrastructure
**Affected:** `supabase/seed.sql`
**Severity:** medium

**What happened:**
Discovered while investigating an unrelated PR: the "Supabase Preview" GitHub
check failed with `insert or update on table "profiles" violates foreign key
constraint "profiles_id_fkey" (SQLSTATE 23503)`. Not caused by that PR's
actual changes — cross-checked and this check had only ever shown
`"skipped"` on prior PRs ("This git branch is not associated with any
Supabase Branch"), meaning preview branching had never actually executed
successfully on this repo before.

**Root cause:**
`supabase/seed.sql` inserts demo `profiles` rows with hardcoded placeholder
UUIDs (its own header comment admitted: "Auth users must be created via
Supabase Dashboard or Auth API first"). `profiles.id` has a foreign key to
`auth.users.id`; a fresh preview branch doesn't inherit `auth.users` data,
so the very first seed insert fails immediately.

**Fix:**
Added a STEP 0 to `seed.sql` inserting matching `auth.users` rows before the
`profiles` inserts, satisfying the FK. Deliberately omits `role` from
`raw_user_meta_data` so the `on_auth_user_created` trigger creates a default
`'CLIENT'` profiles row; the existing `profiles` inserts then use
`ON CONFLICT (id) DO UPDATE` (not a fresh `INSERT`) to promote speakers to
`SPEAKER`, so `on_speaker_profile_created` (`AFTER INSERT ON profiles`)
never re-fires and creates duplicate junk `speaker_profiles`/
`hospitality_riders` rows alongside the curated ones the file inserts
explicitly. Also made the rest of the file idempotent (`ON CONFLICT DO
NOTHING` / `WHERE NOT EXISTS`) since preview branches re-run the seed on
every push. Not verified against a real Postgres instance (no Docker in
this environment) — verified by hand against the actual trigger/constraint
definitions in `20260309221803_new-migration.sql`; the next PR push's
"Supabase Preview" check is the real validation.

**Prevention:**
Any table with a foreign key to `auth.users.id` needs matching `auth.users`
rows in the seed file, in insert order, for preview/local branches to seed
successfully — `auth.users` is never auto-populated by CLI tooling for
non-production databases. When re-touching `seed.sql`, keep every insert
idempotent (`ON CONFLICT` or `WHERE NOT EXISTS`); Supabase branching re-runs
this file on every push to a PR, not just once.

## 2026-08-18 · bug · "Request Booking" drops clients back to the speaker grid on their first booking with a speaker

**Type:** bug
**Affected:** `src/app/client/discover/DiscoverClient.tsx`, `src/components/speakers/SpeakerModal.tsx`, `hospitality_riders` RLS policy
**Severity:** high

**What happened:**
After `af87b36` (which fixed the *post-submit* redirect) merged to `main`,
the user reported the exact same symptom persisting: pressing "Request
Booking" on a speaker's profile modal dropped straight back to the bare
speaker grid with zero feedback — no toast, success or error. Repro details
(production URL, fresh incognito, no toast at all) ruled out a stale bundle
and ruled out `handleSubmitBooking` (which always shows a toast on either
path) — pointing to an earlier step in the flow that `af87b36` never touched.

**Root cause:**
Two compounding bugs in `handleBook()`, fired the instant "Request Booking"
is clicked (before the multi-step booking wizard is even shown):
1. `setSelectedSpeaker(null)` ran synchronously *before* `await`ing the
   `hospitality_riders` fetch, closing the profile modal immediately with no
   loading state — the user stared at the bare grid until the fetch resolved
   and the booking wizard finally opened.
2. The only RLS SELECT policy on `hospitality_riders` available to a client
   required a `bookings` row for that exact client+speaker pair to already
   exist — circular, since the rider needs to be reviewed *during* booking
   creation. On a client's first-ever attempt to book a given speaker, RLS
   blocked the read, `.single()` turned the resulting 0 rows into a
   PostgREST error, and `const { data: rider } = await ...` discarded that
   error silently — so `BookingForm` fell back to "No hospitality rider has
   been configured," even when the speaker had real requirements set. Any
   client re-booking a speaker they'd already booked once satisfied the old
   policy, which is why this wasn't caught by repeat-tester testing.

**Fix:**
`handleBook()` now keeps the profile modal open (with a loading spinner on
the "Request Booking" button, via a new `bookingLoading` prop reusing
`Button`'s existing `loading` state) until the fetch resolves and the
booking wizard is ready to replace it — `setBookingRider`/`setBookingSpeaker`/
`setSelectedSpeaker(null)` now happen together in one batch. Swapped
`.single()` for `.maybeSingle()` and log (rather than discard) a real fetch
error. New migration `20260818190000_hospitality-riders-preview-select.sql`
adds an RLS policy letting any authenticated user view an active speaker's
`hospitality_riders` row (mirroring the existing `speaker_profiles`
"Anyone authenticated can view active speakers" policy) and drops the old
circular one.

**Prevention:**
Added `describe("DiscoverClient / handleBook")` in
`src/__tests__/app/client/discover/DiscoverClient.test.tsx` — asserts a
loading indicator is visible while the fetch is in flight (catches the
"drops to blank grid" regression directly), that the wizard opens on both
success and fetch-error, and that a fetch error is surfaced via
`console.error` rather than silently discarded. General lesson (recurring
theme across `c263003`, `8087258`, and this bug): never destructure `data`
out of a Supabase query without also capturing `error` — RLS blocks are
indistinguishable from "no rows" unless the error is checked.

## 2026-08-17 · config · Every Vercel Preview deployment failing to build since 2026-08-11

**Type:** config
**Affected:** `src/lib/env.ts`, `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`
**Severity:** medium

**What happened:**
User asked why the latest push (`af87b36`, "give organisers persistent
feedback on booking status") wasn't deploying on Vercel. Cross-checking
GitHub commit statuses and the Vercel deployment (`dpl_AZ2dgApqoJoZZvyCWWtKwyWuGnCD`)
showed the build failing with `Command "npm run build" exited with 1`.
Walking the history further showed this wasn't new: every deployment on
`fix/discover-speakers-auth-race` had failed since `8087258` (2026-08-11),
while every `main`/production deployment in the same window stayed green.

**Root cause:**
The build log's actual error was `NEXT_PUBLIC_APP_URL is not set`, thrown
by `getBaseUrl()` in `src/lib/env.ts`. `src/app/layout.tsx` calls
`getBaseUrl()` at module scope (`const baseUrl = getBaseUrl()`), and as
the root layout it's evaluated during page-data collection for every
route, so the missing var failed the entire build rather than one page.
`NEXT_PUBLIC_APP_URL` was configured for the Vercel project's Production
environment but never added to Preview, so any deploy triggered by a
branch push or PR (not a merge to `main`) failed while production
deploys — which only ever run in the Production environment — kept
succeeding. Local builds also succeeded throughout because `.env.local`
always had the var set, masking the gap.

**Fix:**
`getBaseUrl()` now falls back to Vercel's auto-injected `VERCEL_URL`
(present on every deployment — production, preview, and branch — with
no manual configuration) before throwing. Local/CI builds with neither
`NEXT_PUBLIC_APP_URL` nor `VERCEL_URL` set still throw, preserving the
intent of `b52379a` (no silent fallback to the wrong domain). Verified
by building locally with `NEXT_PUBLIC_APP_URL` unset and `VERCEL_URL`
set to the actual failing preview's hostname — build passed where it
previously failed with the identical error.

**Prevention:**
Added `src/__tests__/lib/env.test.ts` covering all four branches of
`getBaseUrl()` (explicit var set, both set, fallback-only, neither set).
Worth a follow-up: also set `NEXT_PUBLIC_APP_URL` explicitly for the
Preview environment in Vercel project settings so previews resolve to
the production domain rather than their own preview hostname, if that's
the desired behaviour for OG/canonical URLs on preview links.

## 2026-08-13 · bug · No organiser feedback on booking status after submit or speaker response

**Type:** bug
**Affected:** `src/app/client/discover/DiscoverClient.tsx`, `src/app/actions/bookings.ts`, booking status feedback loop overall
**Severity:** medium

**What happened:**
Reported by the user as "when I press request book it immediately goes back to
speaker menu" — after submitting a booking request, the client landed back on
the "Find Speakers" grid with no persistent confirmation. Investigating the
wider flow (two Explore agents + direct file review) also confirmed a second,
related gap: once a booking is `PENDING`, there was no way for the organiser
to learn that the speaker later accepted (`CONFIRMED`) or declined
(`DECLINED`) short of manually reloading `/client/bookings` or the booking
detail page. The `TopBar` notification bell is decorative (no handler, no
data source), and `updateBookingStatus` only updates the DB row and calls
`revalidatePath`, which has no effect on an already-open browser tab.

**Root cause:**
`handleSubmitBooking` in `DiscoverClient.tsx` called `setBookingSpeaker(null)`
on success, closing the booking modal and returning to the underlying grid;
the only feedback was a `useToast()` toast that auto-dismisses after 4s. No
redirect to a confirmation view existed. Separately, no realtime subscription,
polling, or notification mechanism (email/toast/inbox) existed anywhere for
the `bookings` table — `useRealtimeMessages` only covers chat `messages`.

**Fix:**
- `DiscoverClient.tsx` now redirects to `/client/bookings/[id]` (the new
  booking's detail page, already showing the `Pending` badge and full
  details) via `useRouter().push()` after a successful `createBooking()`
  call, in addition to the existing toast.
- Added `useRealtimeBookingStatus` (mirrors `useRealtimeMessages`'s pattern)
  subscribed to `bookings` `UPDATE` events filtered by `client_id`, mounted
  for every client-area page via `BookingStatusWatcher` in
  `src/app/client/layout.tsx`. On a status change it fires a toast and calls
  `router.refresh()` so the current page's server-rendered data (badge,
  chat-lock state) updates without a manual reload.
- Added migration `20260813090000_bookings-realtime-publication.sql` to
  ensure `bookings` is on the `supabase_realtime` publication.

**Prevention:**
Added `src/__tests__/app/client/discover/DiscoverClient.test.tsx` (asserts
the redirect fires on success and not on error) and
`src/__tests__/lib/hooks/useRealtimeBookingStatus.test.tsx` (asserts the
realtime subscription is registered with the correct filter and that
`router.refresh()`/toast fire only when `status` actually changes).

## 2026-08-11 · bug · Discover page slow + speakers require refresh (recurrence)

**Type:** bug
**Affected:** `src/app/client/discover/page.tsx`
**Severity:** medium

**What happened:**
The `/client/discover` speaker listing took over a second to render and
sometimes rendered "No speakers found" on first load, self-resolving only
after a manual page refresh. This is the same symptom fixed once before in
`c263003` ("fix logout and speaker discover auth race condition") — the
earlier fix reduced but did not eliminate the race.

**Root cause:**
The page fetched speakers entirely client-side, gated behind `AuthProvider`'s
client-side auth state (`getSession()` + a `profiles` select). That auth
state is itself populated via a round trip that races the same browser
Supabase client's internal JWT attachment. `speaker_profiles`/`profiles` RLS
policies require `auth.uid() IS NOT NULL`; if the query fires before the JWT
is attached, Postgres RLS returns `{ data: [], error: null }` — no error, so
the empty result renders as a permanent "No speakers found" with no retry.
Separately, the request waterfall (middleware `getUser()` → `ClientLayout`
server `getUser()` + profile select → `AuthProvider`'s redundant client-side
`getSession()` + profile select → the page's own fetch, always delayed by an
unconditional 300ms debounce) accounted for the >1s load time even when the
race wasn't lost.

**Fix:**
Converted `/client/discover` to a Server Component that fetches the default
speaker list using the cookie-authenticated server Supabase client (the same
one `ClientLayout` already uses to guard the route — no race is possible,
since an unauthenticated request never reaches this far) and hands the
result to a new `DiscoverClient` Client Component as initial state. The
query-building logic (`speaker_profiles` filters/sort + search) was
extracted into a shared repository function, `getSpeakers()` in
`src/lib/data/speakers.ts`, used by both the server-side initial fetch and
the client-side filter-change refetch — one definition instead of two
copies that can drift apart. Unit tests added:
`src/__tests__/lib/data/speakers.test.ts`.

**Prevention:**
For any authenticated Supabase read that backs a page's initial render,
fetch it in a Server Component using the cookie-authenticated server client
rather than in a `useEffect` gated on client-side auth state — the server
client can't race the session because the route is already guarded before
the page renders. Reserve client-side Supabase calls for data that changes
after user interaction (filters, search), and centralize the query-building
logic in a shared function so the initial (server) and interactive (client)
fetches can't diverge. Follow-up not yet addressed: `AuthProvider`
(`src/components/layout/AuthProvider.tsx`) still re-derives `user`/`profile`
client-side on every protected page via its own `getSession()` + `profiles`
select, duplicating work `ClientLayout` already did server-side — a related
latency source across all protected pages, out of scope for this fix.

---

## 2026-06-23 · bug · Profile picture upload times out / silently fails

**Type:** bug
**Affected:** `src/app/actions/speakers.ts`, `src/app/speaker/profile/page.tsx`
**Severity:** high

**What happened:**
Profile picture and portfolio photo uploads appeared to hang indefinitely and never saved. The UI showed a loading state but never resolved.

**Root cause:**
`File` objects passed to Next.js Server Actions are serialized through the HTTP request body. Next.js enforces a default `serverActions.bodySizeLimit` of 1 MB. Most device photos exceed this limit, causing the request to be silently dropped. Additionally, the `uploadAvatar` action was missing an error check on the `profiles` table update — the function could return a URL even when the DB save failed.

**Fix:**
Moved storage upload to the client side using the existing Supabase browser client (`supabase.storage.from(...).upload()`). The server actions (`saveAvatarUrl`, `saveSpeakerPhotoUrl`) now only receive a URL string and perform the DB update + cache revalidation. File validation (MIME type, size) moved to the client before the upload attempt. Rollback on DB failure preserved.

**Prevention:**
Never pass `File` or `Blob` objects to Next.js Server Actions — route them through the Supabase browser client directly. Only send lightweight payloads (URLs, IDs, strings) to server actions.

---

## 2026-06-22 · bug · Infinite recursion in profiles RLS policy breaks every authenticated user

**Type:** bug
**Affected:** `supabase/migrations/20260616210049_admin-role.sql` — RLS policies on `public.profiles` and `public.speaker_profiles`
**Severity:** critical (every authenticated user session broken — profile unreachable → redirect to /login)

**What happened:**
Every newly registered (and existing) user was redirected to `/login` after sign-in. Session cookies were valid and `getUser()` succeeded, but the ClientLayout's profile query threw PostgreSQL error `42P17: infinite recursion detected in policy for relation "profiles"`, causing `profile` to be null and triggering the `if (!profile) redirect("/login")` guard.

**Root cause:**
The admin role migration (`20260616210049_admin-role.sql`) added two circular chains in RLS policies:

1. **Direct loop on `profiles`:** "Admins can view all profiles" (FOR SELECT on `profiles`) contained `EXISTS (SELECT 1 FROM public.profiles WHERE ...)` — a self-referential subquery that PostgreSQL catches as infinite recursion.

2. **Indirect loop via `speaker_profiles`:** "Admins can manage all speaker profiles" (FOR ALL on `speaker_profiles`) queried `profiles` to check admin status. A `profiles` SELECT policy ("Authenticated users can view speaker profiles") queries `speaker_profiles`, completing the cycle: `profiles → speaker_profiles → profiles`.

**Fix:**
Migration `20260622194851_fix-profiles-rls-recursion.sql` — replaced both offending EXISTS subqueries with `(auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMIN'`. Reading from the JWT claim requires no table query, making recursion impossible.

**Prevention:**
Never write an RLS policy on table X that queries table X (direct recursion). Also watch for indirect chains: if table A's policy queries table B, and table B's policy queries table A, the same error occurs on any SELECT involving either table. Always use JWT claims (`auth.jwt()`) for role checks inside RLS policies — never query the same or a cross-referencing table.

---

## 2026-06-22 · bug · Permanent /login ↔ /client/dashboard redirect loop after token expiry

**Type:** bug
**Affected:** `middleware.ts`
**Severity:** critical

**What happened:**
Production site at nxtspeaker.co.za entered an infinite redirect loop cycling between `/login` and `/client/dashboard` roughly every second. Vercel runtime logs confirmed the pattern: `/login` (307) → `/` (200) → `/client/dashboard` (200) → back to `/login`.

**Root cause:**
The middleware only checked for the existence of the Supabase session cookie (`name.endsWith("-auth-token")`), not whether the access token inside it was still valid. When the Supabase JWT expired (default 1-hour TTL), the cookie remained but the token was stale. Server Components (`ClientLayout`, `dashboard/page.tsx`) called `supabase.auth.getUser()` which attempted to refresh the token via the refresh token, but Server Components cannot write cookies — the `setAll()` in `server.ts` is wrapped in a `try/catch` that silently ignores the cookie-write. The refresh failed, `getUser()` returned `null`, and each server component redirected to `/login`. The middleware then saw the old cookie and redirected back to `/`, creating the permanent loop.

**Fix:**
Rewrote `middleware.ts` to import `createServerClient` from `@supabase/ssr` and call `supabase.auth.getUser()`. Middleware can write cookies, so when the access token is expired, the client refreshes it via the refresh token and writes the new tokens to the response. Routing decisions now use the actual `user` object instead of cookie existence. The `NextResponse` ESM import workaround for the prior `__dirname` issue was preserved.

**Prevention:**
The `@supabase/ssr` middleware pattern (validate + refresh in middleware, read-only in Server Components) is now correctly implemented. Any future auth middleware must follow this pattern — never route on cookie existence alone.

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
