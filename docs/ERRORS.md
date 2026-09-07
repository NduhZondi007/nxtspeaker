# Error Log

All non-trivial errors, bugs, and incidents are documented here.
Append entries in reverse-chronological order (newest first).

## 2026-09-07 · bug · Booking creation was failing in production on a duplicate booking_number

**Type:** bug
**Affected:** `public.generate_booking_number()`, `booking_number_seq`
**Severity:** critical

**What happened:**
Found while verifying the RLS migration against the live database: inserting a
booking as a real client failed with

```
duplicate key value violates unique constraint "bookings_booking_number_key"
```

This was not caused by the migration — it was pre-existing and live. Creating a
booking, the platform's core action, was broken for every user.

**Root cause:**
`20260524000001_security-fixes` replaced the racy `COUNT(*)+1` booking-number
generator with `booking_number_seq`, but created the sequence with `START 1`
and never advanced it past the numbers the old implementation had already
issued. Three bookings already held `NXT-2026-00001..00003` while the sequence
sat at `last_value = 1`, so `nextval()` returned 2, then 3 — both taken. The
migration changed the generator without backfilling the state the previous
generator had produced, turning the race condition it was fixing into an
off-by-N that failed deterministically.

It went unnoticed because the failure only appears on the *next* booking after
the change, and the affected rows were seed/test data nobody re-exercised.

**Fix:**
`20260907182217_fix-booking-number-sequence.sql`: `setval()` the sequence past
the highest number ever issued, and make `generate_booking_number()` retry on
collision instead of letting the insert fail. The retry probe is
`SECURITY DEFINER` because under RLS the inserting client can only see their
own bookings and would miss a clash with another user's row.

**Prevention:**
Any migration that replaces a value generator must backfill the new generator's
state from the existing data in the same migration. Booking creation is now
covered by a live end-to-end check (insert → transition → cancel, rolled back)
run as part of applying schema changes.

---

## 2026-09-07 · security · Every trigger function was exposed as a public RPC endpoint

**Type:** security
**Affected:** all `public.*` trigger functions
**Severity:** low

**What happened:**
The Supabase database linter (lints 0028/0029) reported that every trigger
function in `public` — including the new `enforce_*` guards — was callable by
the `anon` role at `/rest/v1/rpc/<name>`.

**Root cause:**
Postgres grants `EXECUTE` on a new function to `PUBLIC` by default, and
PostgREST publishes everything executable in the exposed schema. Nothing in the
schema had ever revoked it.

**Fix:**
`20260907182321_revoke-execute-on-trigger-functions.sql` revokes `EXECUTE` from
`PUBLIC`/`anon`/`authenticated` on every trigger function. Trigger functions are
invoked by the table operation and are not privilege-checked against the calling
role, so this removes the endpoint without affecting trigger firing — confirmed
by re-running the live insert/transition/`updated_at` checks afterwards.
`shares_booking_with` keeps `EXECUTE` for `authenticated` only, because an RLS
policy on `profiles` calls it. Also pins `search_path` on `handle_updated_at`
(lint 0011), the one trigger function 20260616195246 missed.

**Prevention:**
`get_advisors` is now run after every schema change, and new trigger functions
must ship with a matching `REVOKE`.

---

## 2026-09-07 · security · Registration accepted any role, including ADMIN

**Type:** security
**Affected:** `src/app/actions/auth.ts` (`registerUser`)
**Severity:** critical

**What happened:**
Found during a full-codebase defect audit. `registerUser` read the role
straight off the submitted form — `formData.get("role") as "SPEAKER" | "CLIENT"` —
and wrote it to both `app_metadata.role` (via the service-role admin API) and
`profiles.role`. A crafted POST to the register action with `role=ADMIN`
therefore created a fully-provisioned platform administrator, with no existing
admin involved. The `as` cast that appeared to constrain it is a TypeScript
annotation and is erased at build time.

**Root cause:**
Type annotations were mistaken for runtime validation on a trust boundary.
Server Action arguments and `FormData` values are untrusted input; nothing in
the action checked the value before it reached the two places the platform
reads roles from.

**Fix:**
Validate the whole registration payload with Zod, with `role` restricted to
`z.enum(["SPEAKER", "CLIENT"])`. ADMIN is now reachable only through
`promoteToAdmin`, which itself requires an existing admin. Email, password
length and field lengths are validated in the same schema; `loginUser` gained
an equivalent one.

**Prevention:**
Every Server Action that writes a privileged column now parses its input with
Zod rather than relying on the parameter type.

---

## 2026-09-07 · security · Any authenticated user could promote themselves to ADMIN

**Type:** security
**Affected:** `supabase/migrations/*` (profiles RLS), `src/app/actions/admin.ts`
**Severity:** critical

**What happened:**
Both UPDATE policies on `profiles` ("Users can update own profile",
"Admins can update any profile") were written with a `USING` clause and no
`WITH CHECK`. Postgres then reuses `USING` as the `WITH CHECK`, which answers
"may this row be updated?" but never "is the *new* row acceptable?". A plain
`PATCH /rest/v1/profiles?id=eq.<self>` with `{"role":"ADMIN"}` and the public
anon key satisfied `auth.uid() = id` in both directions and succeeded.

**Root cause:**
The same missing-`WITH CHECK` pattern across the whole schema. It escalated to
a full compromise because the two layers disagree about where the role lives:
RLS reads it from the JWT `app_metadata` claim (service-role-only, so RLS
itself was not directly bypassed), but `assertAdmin()` authorises the entire
admin portal off `profiles.role` — and that portal then acts with the
service-role key.

**Fix:**
Migration `20260907120000_rls-integrity-fixes.sql` adds a
`BEFORE UPDATE` trigger on `profiles` that rejects any change to `role`,
`base_role` or `id` unless the caller is the service role (`auth.uid() IS NULL`)
or carries the ADMIN JWT claim. Equivalent triggers were added to `bookings`
and `speaker_profiles`, whose UPDATE policies had the same gap.

**Prevention:**
Column-level immutability is now enforced by triggers rather than by hoping
callers go through the Server Actions. Any new UPDATE policy must either carry
an explicit `WITH CHECK` or be paired with such a trigger.

---

## 2026-09-07 · security · Booking status, fee and parties were writable by either side

**Type:** security
**Affected:** `supabase/migrations/*` (bookings RLS), `src/app/actions/bookings.ts`
**Severity:** critical

**What happened:**
"Clients and speakers can update their bookings" had no `WITH CHECK`, so a
client could PATCH their own booking to `status = 'CONFIRMED'` or
`'COMPLETED'`, rewrite `quoted_fee_zar` to any amount, or repoint
`speaker_id` — none of which goes near the Server Actions that were supposed
to gate those changes. Separately, `updateBookingStatus(bookingId, status)`
accepted any string as the status and any transition from any state: a speaker
could cancel on the client's behalf, mark an event completed before it
happened, or re-open a declined request.

**Root cause:**
The booking state machine existed only as an implicit convention in the UI
(which button renders for which status). Neither the action nor the database
encoded it.

**Fix:**
The state machine is now explicit in `src/lib/utils/booking.ts`
(`isBookingStatus`, `canSpeakerTransition`, `canClientCancel`), enforced in
`updateBookingStatus`/`cancelBooking`, and enforced again by the
`enforce_booking_update_rules` trigger, which also pins `booking_number`,
`client_id`, `speaker_id`, `quoted_fee_zar` and `created_at`, and stops a
speaker editing the organiser's event brief.

**Prevention:**
18 unit tests over the transition table plus action-level tests asserting that
a rejected transition performs no write.

---

## 2026-09-07 · security · A review could be attributed to any speaker

**Type:** security
**Affected:** `src/app/actions/reviews.ts`, reviews RLS policy
**Severity:** high

**What happened:**
`submitReview` verified that the booking was COMPLETED and belonged to the
caller, then inserted `speaker_id: input.speakerId` — the client's own value.
The RLS INSERT policy checked the same three things and likewise never
compared `reviews.speaker_id` to the booking's speaker. A client could
therefore post a genuine, `verified: true`, 1-star review against any speaker
on the platform, and the `update_speaker_rating` trigger folded it into that
speaker's public `avg_rating`. The rating itself was also unvalidated in the
action.

**Fix:**
The speaker is read off the booking row and the caller's `speakerId` is
ignored (kept in the interface only for call-site readability, and documented
as ignored). Rating is validated as an integer 1–5. The RLS policy now also
requires `b.speaker_id = reviews.speaker_id`.

**Prevention:**
Action test asserts that passing a different speaker's id still records the
booking's speaker.

---

## 2026-09-07 · bug · Speakers never saw who booked them

**Type:** bug
**Affected:** profiles RLS, `src/app/speaker/**`
**Severity:** high

**What happened:**
Every speaker-side surface showed the literal fallback text instead of the
organiser: the bookings list read "Client — ", the booking detail page showed
"Client" for the client and company, the earnings history showed "Client", and
the chat thread labelled every incoming message "Participant".

**Root cause:**
The three SELECT policies on `profiles` cover your own row, any *active
speaker's* row, and (for admins) everything. A speaker reading a *client's*
profile matched none of them, so the embedded `profiles(*)` join silently
returned NULL and each `?? "Client"` fallback rendered. Nothing errored, which
is why it looked like intended copy.

**Fix:**
New policy "Booking counterparties can view each other", scoped to an existing
`bookings` row so nothing is exposed before a booking exists. The lookup lives
in a `SECURITY DEFINER` helper (`shares_booking_with`) because `bookings` has a
policy that queries `profiles` — an inline subquery would have closed the same
recursion cycle that caused the 42P17 outage fixed in `20260622194851`.

**Prevention:**
Documented in the migration: any new `profiles` policy that needs to consult
`bookings` or `speaker_profiles` must go through a definer function.

---

## 2026-09-07 · bug · Promoting a user to admin did not actually grant admin access

**Type:** bug
**Affected:** `src/app/actions/admin.ts` (`promoteToAdmin`, `revokeAdmin`)
**Severity:** high

**What happened:**
A user promoted through the admin UI could open the admin portal but saw
almost nothing in it — `/admin/users` listed only themselves, and the user
search in "Add Speaker" returned no one.

**Root cause:**
`promoteToAdmin` updated `profiles.role` only. Since `20260622194851` every
admin RLS policy authorises against the `app_metadata.role` JWT claim instead
of the table (to break an infinite-recursion cycle), so the promoted user's
queries still ran with ordinary-user visibility. The portal's own guard,
`assertAdmin()`, reads `profiles.role` — hence "in the portal but blind".

**Fix:**
`syncRoleClaim()` writes `app_metadata.role` via the service-role admin API
whenever the table role changes (`promoteToAdmin`, `revokeAdmin`,
`adminCreateSpeaker`), rolling the table change back if the claim write fails
so the two sources cannot disagree. Note the claim is baked into the JWT at
sign-in, so the promoted user must re-authenticate for it to take effect.

**Prevention:**
The two sources of truth and their relationship are documented at
`syncRoleClaim`.

---

## 2026-09-07 · bug · Fees rendered as "R 1 000 000", and could differ between server and browser

**Type:** bug
**Affected:** `src/lib/utils/currency.ts`
**Severity:** medium

**What happened:**
Three pre-existing tests in `currency.test.ts` were failing on `main`:
`formatZAR(1000000)` returned `R 1 000 000`, not the documented `R 1,000,000`.

**Root cause:**
`toLocaleString("en-ZA")` — the en-ZA CLDR group separator is a (non-breaking)
space, not a comma. Worse, exactly which character you get depends on the ICU
data compiled into the running engine, so the server and the browser could
disagree, which surfaces as a React hydration mismatch on every page that
renders a fee.

**Fix:**
Explicit grouping with a regex, no locale data involved. `formatZAR` also now
coerces numeric strings (Postgres `NUMERIC` can arrive as a string) and returns
`R 0` for null/NaN instead of `R NaN`.

**Prevention:**
The five existing tests now pass and pin the format.

---

## 2026-09-07 · bug · Failed chat messages were silently discarded

**Type:** bug
**Affected:** `src/components/chat/ChatInput.tsx` and the four chat surfaces
**Severity:** medium

**What happened:**
If `sendMessage` failed — RLS rejection, chat locked, network error — the
message vanished: the textarea was cleared, nothing appeared in the thread, and
no toast was shown.

**Root cause:**
Each page's `"use server"` wrapper did `await sendMessage(...)` and dropped the
returned `{ error }` on the floor, so `ChatInput` saw a resolved promise and
cleared its input unconditionally.

**Fix:**
The wrappers return the error, `ChatInput.onSend` is typed to resolve with
`{ error? }`, and the input keeps the user's text and raises an error toast
when the send fails. `sendMessage` now also returns readable errors ("Chat is
not available for this booking") instead of a raw policy-violation string, and
applies the same `canChat` rule the UI uses — RLS alone still accepted messages
on a CANCELLED booking whose thread the UI showed as locked.

**Prevention:**
The error-returning contract is in the `ChatInputProps` type, so a wrapper that
drops the error no longer type-checks as a valid `onSend`.

---

## 2026-09-07 · bug · Client dashboard under-reported completed events and total spend

**Type:** bug
**Affected:** `src/app/client/dashboard/page.tsx`
**Severity:** medium

**What happened:**
"Events Completed" and "Total Spent" were computed from the same query that
feeds the "Recent Bookings" list — which is `.limit(5)`. Any client with more
than five bookings saw figures covering only their five most recent ones.

**Fix:**
A separate unlimited `select("status, quoted_fee_zar")` backs the stats; the
display list keeps its limit. "Speakers Explored" (which reported the length of
a 4-row preview query) is now a real `count: "exact"` and relabelled "Speakers
Available". The hardcoded "Good morning" greeting is now time-based, pinned to
`Africa/Johannesburg` rather than the deploy region's clock.

---

## 2026-09-07 · bug · Assorted defects found in the same audit

**Type:** bug
**Affected:** several
**Severity:** low–medium

- **Modal could not be dismissed by clicking outside** (`src/components/ui/Modal.tsx`) —
  the overlay compared the click target against its own ref, but the backdrop
  div covers the overlay edge to edge, so the target was always the backdrop
  and the comparison never matched. The backdrop now owns the dismiss handler.
- **Empty-string UUIDs** (5 pages) — `.eq("speaker_id", sp?.id ?? "")` sends
  `""` to a `uuid` column, which Postgres rejects with 22P02 rather than
  matching no rows; the error was then swallowed and rendered as "no bookings",
  masking the real cause. Each call site now guards on the missing profile, and
  the rider lookups key off `booking.speaker_id` (always present) instead of
  the embedded join (which RLS can null out).
- **Speaker profile page span an infinite skeleton** — a failed or empty
  `speaker_profiles` fetch left `sp` null forever with no error path. It now
  distinguishes loading from failed and shows the reason.
- **Removing a portfolio photo could leave a dead URL** — the DB stores the
  canonical URL (query string stripped) but the filter compared the raw URL, so
  a cache-busted URL deleted the storage object while leaving the row's URL in
  place: a permanently broken image on the public profile.
- **Storage URL validation was a substring check** — `url.includes("/speaker-photos/<uid>/")`
  is satisfied by `https://attacker.example/speaker-photos/<uid>/x.png`. URLs
  are now parsed and pinned to this project's Supabase origin, bucket and the
  caller's own folder.
- **File size/MIME limits were browser-only** — enforced in the upload handler
  but not on the bucket, so a direct storage API call bypassed them entirely.
  Now declared on `storage.buckets`.
- **PostgREST filter injection in admin user search** — the search term was
  interpolated raw into `.or()`, so `x,role.eq.ADMIN` rewrote the query's
  logic. The term is now wildcard-escaped and quoted.
- **`adminUpdateBookingStatus` erased the cancellation reason** on every status
  change, because it always wrote `cancelled_reason: reason ?? null`.
- **`total_events` counted reviews, not events** — a speaker with twenty
  completed events and two reviews was shown to clients as "2 events". It now
  counts COMPLETED bookings, and both stats recompute on review update/delete
  and on booking completion (previously only on review insert).
- **Admins were routed to the client dashboard** after an OAuth/magic-link
  callback, unlike every other role-routing path.
- **`/admin` was not in the middleware matcher**, relying solely on the guard
  inside `AdminLayout`.
- **Chat thread went stale between bookings** — `useRealtimeMessages` seeded
  state from `initialMessages` on first render only, so navigating from one
  booking's thread to another kept showing the previous one.
- **Booking form cleared every validation error on any keystroke**, so the
  other messages on the step vanished as soon as the user fixed the first; it
  also had no client-side check for past dates, reversed date ranges, or
  out-of-range durations, all of which the server rejects.

---

## 2026-08-18 · bug · "Request Booking" button spins forever, wizard never opens (regression in the same-day fix)

**Type:** bug
**Affected:** `src/app/client/discover/DiscoverClient.tsx`
**Severity:** high

**What happened:**
Immediately after deploying the `handleBook` blank-grid fix (this same day)
and applying its companion RLS migration, the user reported "Request
Booking" now shows a loading spinner that never resolves — the button
never returns to normal and the booking wizard never opens.

**Root cause:**
The blank-grid fix added a loading state around the `hospitality_riders`
fetch, but only handled the case where the query *resolves* with an error
(`{ data, error }`) — there was no `try/catch` around the `await` itself.
If the call *throws* instead of resolving (network failure, CORS issue, or
any unexpected client-side exception) the `async` function exits via an
unhandled promise rejection, and execution never reaches the final
`setBookingLoading(false)` — leaving the button permanently spinning with
no console or network trace to explain why. Confirmed via Supabase edge
logs and Vercel runtime logs: no server-side errors, no recent
`hospitality_riders` request at all — consistent with the failure
happening client-side, before or during the fetch, not on the server.

**Fix:**
Wrapped the fetch in `try/catch/finally` — `finally` unconditionally clears
`bookingLoading` and opens the wizard (with `rider: null` on any failure,
same graceful fallback `BookingForm` already had), so a thrown exception
can no longer leave the flow stuck. `catch` logs the exception the same
way the existing `if (riderError)` branch already logged a resolved error.

**Prevention:**
Added a test simulating `.maybeSingle()` rejecting (not just resolving
with an error) and asserting the loading state still clears and the
wizard still opens — the resolved-error case alone didn't catch this.
General lesson: any `setXLoading(true)` must be paired with a `finally`
that clears it, not just a handler for the expected error shape — a
same-day lesson learned the hard way on this very fix.

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
