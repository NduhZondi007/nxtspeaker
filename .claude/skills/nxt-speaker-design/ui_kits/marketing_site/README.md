# UI kit — NXT Speaker marketing website

Interactive recreation of the public website. Open `index.html`.

## Status of the source

The repository (`NduhZondi007/nxtspeaker`) has **no marketing site yet** — `src/app/page.tsx` is a
role redirect straight into the portals. So this kit is built from the *written* spec in
`docs/DESIGN.md` ("Momentum" direction: navy hero band, oversized uppercase Archivo, badge used as a
≤15%-opacity rotated watermark, teal structural rules, alternating white / #FAFAFB sections, one
orange CTA per view) plus the component specs in `styling_assets/HANDOFF.md`. It is **spec-derived,
not a screenshot recreation** — treat it as the reference build for that direction.

Everything reused from the app itself (SpeakerCard, SpeakerFilters, Button, Modal, Input, Toast,
Badge) is a faithful port of the real code.

## Screens

| Screen | Route in kit | Built from |
|---|---|---|
| Homepage | `home` | docs/DESIGN.md "Momentum" + HANDOFF.md nav/section specs |
| Speaker directory | `speakers` | src/components/speakers/SpeakerFilters.tsx, SpeakerCard.tsx |
| Speaker profile | `profile` | src/components/speakers/SpeakerModal.tsx (public-page adaptation) |
| Booking request modal | modal | src/components/bookings/BookingForm.tsx, ui/Modal.tsx |
| Sign in | `login` | src/app/(auth)/login/LoginForm.tsx |

## Files

- `Nav.jsx` — sticky white nav, navy lockup left, single orange CTA right
- `Hero.jsx` — navy hero band with the rotated badge watermark and proof figures
- `Sections.jsx` — Featured speakers, How it works, For speakers, Footer, and the shared `SPEAKERS` fixture
- `Pages.jsx` — directory, profile, booking modal, sign-in

Speaker photography is intentionally absent: no real portraits were supplied, so cards fall back to
the navy-initial treatment the app already ships. Drop real images into `assets/` and pass `photo`.
