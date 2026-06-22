# Changelog

All notable changes are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Added
- Per-page SEO metadata: static `metadata` on admin/client/speaker portal
  layouts and login/register pages, `generateMetadata` on booking detail and
  chat pages (titles derived from `event_name`/`booking_number`/`full_name`)
- `src/app/opengraph-image.tsx` — generates the OG share image used by
  `openGraph.images` in `layout.tsx`
- Login/register pages split into `LoginForm`/`RegisterForm` client
  components so `page.tsx` can stay a Server Component and export metadata
- `BrandMentionCard` — decorative animated card shown above the chat input
  when a draft message mentions "nxtspeaker"

### Changed
- `src/lib/env.ts#getBaseUrl()` now throws if `NEXT_PUBLIC_APP_URL` is unset,
  replacing the hardcoded `https://nxtspeaker.co.za` fallback previously
  duplicated across `layout.tsx`, `robots.ts`, and `sitemap.ts` — the domain
  is now sourced exclusively from the environment

### Fixed
- `middleware.ts` — replaced cookie-existence check with `createServerClient`
  from `@supabase/ssr` so the middleware validates the JWT and refreshes expired
  access tokens, eliminating the permanent `/login` ↔ `/client/dashboard`
  redirect loop that occurred once the 1-hour Supabase access token expired
- `handle_new_user` and `handle_new_speaker_profile` trigger functions now use
  `SET search_path = ''` and fully-qualified `public.` table names, preventing
  "Database error saving new user" when `supabase_auth_admin` fires triggers
  with its `search_path=auth` session config
- Backfilled `public.profiles` rows for 3 `auth.users` that had no profile
- `createServiceClient` now uses `createClient` from `@supabase/supabase-js`
  directly (with `autoRefreshToken: false, persistSession: false`) instead of
  `createServerClient` from `@supabase/ssr`, which is not designed for admin ops

### Added
- **Admin role** — privileged ADMIN user type with full platform oversight:
  - `supabase/migrations/20260616210049_admin-role.sql` — adds `base_role` column
    to profiles (preserves CLIENT/SPEAKER role on promotion) + RLS policies for
    admin access to all profiles, bookings, messages, and speaker_profiles
  - `src/app/actions/admin.ts` — server actions: `promoteToAdmin`, `revokeAdmin`,
    `adminUpdateBookingStatus`, `adminCreateSpeaker`, `adminToggleSpeakerStatus`,
    `adminSendMessage`, `adminSearchUsers`; all re-verify caller's ADMIN role on
    every request and use service role client for writes
  - `src/app/admin/layout.tsx` — guards route; only ADMIN users can access `/admin/*`
  - `src/app/admin/dashboard/page.tsx` — stats (users, speakers, bookings, revenue),
    "View as" banner for client/speaker portal, recent bookings + users grid
  - `src/app/admin/users/page.tsx` — full user list with role badges, promote/revoke buttons
  - `src/app/admin/users/[id]/page.tsx` — user detail: profile card, role management, booking history
  - `src/app/admin/bookings/page.tsx` — all bookings across all users with status filter tabs
  - `src/app/admin/bookings/[id]/page.tsx` — booking detail with admin action bar
    (Confirm / Mark Completed / Cancel) and full chat access via `adminSendMessage`
  - `src/app/admin/speakers/page.tsx` + `AdminSpeakersClient.tsx` — speaker grid (all statuses),
    activate/deactivate toggle, 2-step "Add Speaker" modal (user search → profile form)
  - `src/components/admin/AddSpeakerModal.tsx` — client component for adding speakers
  - `src/components/layout/Sidebar.tsx` — admin nav (Dashboard, Users, Bookings, Speakers),
    "Back to Admin Portal" link when admin views client/speaker portals
  - Auth login and home redirect now routes ADMIN to `/admin/dashboard`
  - Client and speaker layouts now allow ADMIN through for "view as" functionality
- `src/app/icon.svg` — branded SVG favicon (dark rounded square + gold mic icon)
  matching the app logo mark; declared in root layout metadata
- `src/components/layout/SidebarContext.tsx` — React context for mobile sidebar
  open/close state shared between Sidebar and TopBar

### Changed
- Full responsive redesign across 23 files — app now usable on mobile (375px),
  tablet (768px), and laptop (1024px+):
  - Sidebar collapses to hamburger-triggered slide-over drawer on mobile
  - TopBar gains hamburger menu button on mobile
  - All page content areas: `p-6` → `p-4 sm:p-6`
  - SpeakerFilters: search row stacks on mobile; filter grid is 1/2/3-col responsive
  - SpeakerModal profile detail grid: 1 col mobile, 2 col sm+
  - BookingForm date/format grids: 1 col mobile, 2 col sm+
  - ChatPanel message bubbles: 85% width on mobile, 70% on sm+; break-words added
  - Booking detail pages: chat panel minHeight reduced 500px → 300px
  - Chat full-page: `h-screen` → `h-[100dvh]`
  - Toast container: viewport-relative width on mobile
  - Dashboard pending booking buttons: `flex-wrap` added
  - Earnings summary grid: 1-col mobile → 2-col sm → 3-col lg
- `CLAUDE.md` — project-wide Claude Code configuration covering TDD workflow,
  commit process, error logging, and handover ritual
- `.claude/settings.json` — project-level Claude settings with pre-commit
  reminder hook and end-of-session handover reminder
- `docs/ERRORS.md` — persistent error log; all incidents documented
- `docs/CHANGELOG.md` — this file
- `docs/ERRORLOG.md` — detailed incident log for major errors; full 4-layer
  root cause analysis and runbook for the 2026-06-16 site-down incident

### Docs
- `README.md` — updated Node.js prerequisite (18+ → 22+), removed stale
  `proxy.ts` reference from project structure, added critical Framework Preset
  warning to Deploying to Vercel section, added new "Adding a Custom Domain to
  Vercel" section with DNS verification steps and troubleshooting table,
  updated `NEXT_PUBLIC_APP_URL` description to cover custom domains
- `CLAUDE.md` — added `docs/ERRORLOG.md` to key paths; added mandatory
  Detailed Incident Log section defining when and how to write ERRORLOG entries;
  updated handover checklist to require ERRORLOG entry for major incidents

### Fixed
- `middleware.ts` — import `NextResponse` from `next/dist/esm/server/web/spec-extension/response.js`
  to avoid CJS Turbopack `__dirname` shim crash in Edge Runtime and avoid Import Attributes
  syntax error from `next/dist/esm/server/web/exports/index.js`
- `src/types/next-server-edge.d.ts` — updated module declaration to match new import path
- `middleware.ts` — guard against missing Supabase env vars to prevent
  `MIDDLEWARE_INVOCATION_FAILED` on Vercel Edge Runtime
- `middleware.ts` — wrap `supabase.auth.getUser()` in `try/catch` so auth
  failures fall through gracefully instead of crashing the edge function

### Security
- `supabase/migrations/20260524000001_security-fixes.sql` — read role from
  `raw_app_meta_data` (service-role-only) instead of `raw_user_meta_data`
  (user-controlled) in `handle_new_user()` trigger
- `src/app/actions/bookings.ts` — always fetch `quoted_fee_zar` from DB
  server-side; never trust client-supplied fee value
- `src/app/actions/speakers.ts` — explicit field whitelist in
  `updateSpeakerProfile` to block injection of computed columns
- `src/app/actions/speakers.ts` — validate MIME type and file size in
  `uploadAvatar`; use MIME-derived extension, not client filename

### Changed
- `src/app/actions/bookings.ts` — verify caller role is CLIENT before
  creating a booking; speakers blocked at action layer
- `src/app/actions/bookings.ts` — enforce speaker ownership on
  `updateBookingStatus` at DB layer via `.eq("speaker_id", speakerProfile.id)`

### Database
- `supabase/migrations/20260524000001_security-fixes.sql` — drop duplicate
  `set_hospitality_riders_updated_at2` trigger
- `supabase/migrations/20260524000001_security-fixes.sql` — replace
  `COUNT(*)+1` booking number generation with atomic Postgres sequence
  `booking_number_seq`

---

## [0.1.0] — 2026-05-09

### Added
- Full-stack MVP: auth (login/register), client dashboard, speaker discovery,
  booking flow, booking management, realtime chat, speaker profile editor,
  hospitality rider editor, earnings page
- Supabase Auth with SSR cookie management via `@supabase/ssr`
- Row-Level Security on all tables
- Edge middleware for route protection (client/speaker role separation)
- Realtime messaging via Supabase Realtime channels
- Speaker avatar upload to Supabase Storage
- Vercel deployment

### Removed
- Demo/anonymous login mode (removed in commit `ae3c3c5`)
