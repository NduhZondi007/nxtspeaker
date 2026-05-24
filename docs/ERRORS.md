# Error Log

All non-trivial errors, bugs, and incidents are documented here.
Append entries in reverse-chronological order (newest first).

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
