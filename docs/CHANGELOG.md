# Changelog

All notable changes are documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Fixed
- `handle_new_user` and `handle_new_speaker_profile` trigger functions now use
  `SET search_path = ''` and fully-qualified `public.` table names, preventing
  "Database error saving new user" when `supabase_auth_admin` fires triggers
  with its `search_path=auth` session config
- Backfilled `public.profiles` rows for 3 `auth.users` that had no profile
- `createServiceClient` now uses `createClient` from `@supabase/supabase-js`
  directly (with `autoRefreshToken: false, persistSession: false`) instead of
  `createServerClient` from `@supabase/ssr`, which is not designed for admin ops

### Added
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
