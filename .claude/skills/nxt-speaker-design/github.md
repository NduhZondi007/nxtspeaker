repo: NduhZondi007/nxtspeaker
branch: main

## Last sync

date: 2026-09-07T21:40:20Z
<!-- No commit sha recorded: the tools resolve a tree hash (980dacbd6852), not a commit. -->

### Updated in this project

- Pulled upstream changes: only `src/app/client/dashboard/page.tsx` moved (8672 → 8950 bytes).
- That change is data-layer only — speakers are now filtered through `isSpeakerListable()` and "Speakers Available" is derived from the filtered list instead of a separate `head: true` count. No markup, token or styling change upstream.
- No screens rebuilt: the dashboard's visual structure is unchanged, and our stat cards were intentionally redesigned in this project (teal Space Mono label, icon tile, Archivo 900 value) at the user's request — that divergence is deliberate and kept.
- Verified all other mapped files are byte-identical to the previous sync (globals.css, DESIGN.md, HANDOFF.md, ui/*, speakers/*, layout/*, bookings/*).

## Divergences from upstream (intentional)

- `ui_kits/client_portal` stat cards: redesign now shipped as `src/components/ui/StatCard.tsx`. One deliberate difference: "Total Spent" stays in Space Mono in the app (DESIGN.md → Financial surfaces).
- Brand mark: this system ships the 2026 circular badge; applied to the app repo on branch `feat/2026-brand-refresh` (2026-10-05), so the repo now carries the badge too.

## Screen map

| Project screen | Repo files |
|---|---|
| ui_kits/client_portal — Dashboard | src/app/client/dashboard/page.tsx |
| ui_kits/client_portal — Find Speakers | src/app/client/discover/DiscoverClient.tsx, src/components/speakers/SpeakerFilters.tsx, src/components/speakers/SpeakerCard.tsx |
| ui_kits/client_portal — Speaker sheet | src/components/speakers/SpeakerModal.tsx |
| ui_kits/client_portal — Booking wizard | src/components/bookings/BookingForm.tsx, src/components/ui/Modal.tsx |
| ui_kits/client_portal — My Bookings | src/app/client/bookings/page.tsx, src/components/ui/Badge.tsx |
| ui_kits/client_portal — Shell | src/components/layout/Sidebar.tsx, src/components/layout/TopBar.tsx |
| ui_kits/marketing_site — all pages | docs/DESIGN.md, styling_assets/HANDOFF.md (no marketing code in repo; src/app/page.tsx is a role redirect) |
| components/ui/* | src/components/ui/Button.tsx, Badge.tsx, Input.tsx, Modal.tsx, Toast.tsx |
| components/layout/* | src/components/layout/Sidebar.tsx, TopBar.tsx |
| components/speakers/* | src/components/speakers/SpeakerCard.tsx, SpeakerFilters.tsx |
| assets/logo-* (badge pack) | public/logoHoriz_*, logoStack_*, logoMark_*, src/app/icon.png, src/app/apple-icon.png |
| tokens/* | src/app/globals.css, docs/DESIGN.md, styling_assets/HANDOFF.md |

## Sync history

### 2026-09-07T20:14:00Z

- Rebuilt all design tokens from `src/app/globals.css` and `docs/DESIGN.md` (navy / teal / orange / lavender, Archivo + Hanken Grotesk + Space Mono, 4px grid, 2–8px radii).
- Ported the app's UI primitives as design-system components: Button, Badge, Input, Modal, Toast, SpeakerCard, SpeakerFilters, Sidebar, TopBar.
- Replaced the brand mark with the 2026 circular NXT SPEAKER badge pack the user uploaded (navy / orange / white / on-navy / on-orange).
- Added two UI kits: the client portal (recreation) and the marketing website (built from the written "Momentum" spec, which has no code yet).
