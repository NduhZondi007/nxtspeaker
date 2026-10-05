# NXT Speaker — Design System

South Africa's disruptive speaker-booking platform: event organisers discover speakers, see real
fees in rand, and send a booking request that lands with the **speaker** — no agency, no gatekeeper,
no "contact us for pricing".

The product is a Next.js + Supabase app with three signed-in portals (client, speaker, admin). This
design system is the brand and UI layer extracted from that codebase.

## Sources this system was built from

| Source | What was taken from it |
|---|---|
| GitHub `NduhZondi007/nxtspeaker` (branch `main`) | Ground truth. `src/app/globals.css` (token values), `docs/DESIGN.md` (mandatory design spec), `styling_assets/HANDOFF.md` (colour system handoff), `src/components/**` (component implementations), `src/app/**` (screens) |
| User-uploaded logo pack, Sept 2026 | The current circular **NXT SPEAKER** badge — 4 files: navy-ground JPG, orange-ground JPG, and two transparent PNGs (navy/orange ink and orange/navy ink) |

Do not assume the reader has repo access; `github.md` records the association and the screen map.

**Logo note.** The repo still carries an older mark (`public/logoHoriz_*.png`, `logoMark_*` in
navy / teal / white / orange / lavender). The uploaded 2026 badge **supersedes** it, and this system
ships only the new badge. The new pack contains **no horizontal or stacked lockup file** — where the
app currently uses `logoHoriz_white.png`, `Logo` sets the badge beside a typographic Archivo 900
wordmark. Ask the design owner for real horizontal/stacked lockup files.

---

## Brand positioning

Premium and editorial, never corporate or safe. The chosen direction in `docs/DESIGN.md` is
**Momentum**: navy hero bands, oversized uppercase Archivo, the angular badge used as a rotated
watermark at ≤15% opacity, teal structural rules, and colour used surgically on a light canvas.

---

## CONTENT FUNDAMENTALS

**Tone.** Direct, plain, faintly combative. The product exists because the old way was gatekept, and
the copy says so without slogans. Short sentences. Verbs first. No exclamation marks.

**Person.** Speak to the reader as **you**; the company is **we** only when it must be
("We hold the date for 48 hours"). Never "our platform empowers". The speaker is named, not
"the talent".

**Casing.**
- Headings: Archivo, **UPPERCASE**, tight tracking — `BOOK THE SPEAKER. NOT THE AGENCY.`
- Section eyebrows and labels: Space Mono, UPPERCASE, wide tracking — `HOW IT WORKS`, `PER EVENT`, `CLIENT PORTAL`
- Body: sentence case.
- Buttons: sentence case (`Find a speaker`, `Send request`) — not Title Case, not caps.
- Nav and table headers: sentence case.

**Spelling.** South African English: *organiser*, *decarbonising*, *programme*. Currency is ZAR
formatted with a thin space — `R85 000`, never `R85,000` or `ZAR 85000`. Dates are `12/11/2026`
(en-ZA) or `12 Nov 2026`. Times in SAST.

**Numbers.** Real and specific, never rounded up for effect: "184 verified speakers", "61 events
delivered", "48 hrs median reply". A fee is always a fee, shown with a `per event` caption.

**Status language is fixed** — the six booking statuses render exactly as
Pending · Confirmed · Deposit Paid · Completed · Cancelled · Declined. Never paraphrase them.

**Emoji: never.** Not in UI, not in marketing, not in toasts. Status is carried by a Lucide glyph
and a colour token.

**Examples of the voice**

| Do | Don't |
|---|---|
| "Book the speaker. Not the agency." | "Unlock world-class speaking talent 🚀" |
| "Every profile shows the real fee in rand." | "Transparent pricing solutions" |
| "Thabo replies within 48 hours." | "Our speakers are super responsive!" |
| "No speakers found · Try adjusting your filters" | "Oops! Nothing here 😕" |
| "I accept the hospitality rider and the 25% deposit terms." | "Agree to our T&Cs to continue" |

Empty states are two lines: an Archivo uppercase muted headline, then one sentence telling the user
what to do (`NO BOOKINGS YET` / `Find a speaker to get started`).

---

## VISUAL FOUNDATIONS

### Colour

Five brand colours and four neutrals. Nothing else, ever.

| Token | Hex | Role |
|---|---|---|
| `--color-primary` | `#031E57` | Speaker Navy — headings, body-on-light, dark surfaces, sidebar |
| `--color-secondary` | `#629DAB` | Stage Teal — hairlines, eyebrows, prices, secondary-button borders, scrollbar |
| `--color-tertiary` | `#FFFFFF` | Pure White — default canvas |
| `--color-accent` | `#FF5700` | Signal Orange — **actions only** |
| `--color-support` | `#ECD4F5` | Lavender — category chips, soft fills |
| `--color-ink` | `#46506A` | Body copy |
| `--color-soft` | `#FAFAFB` | Alternating section background |
| `--color-line` | `#ECECF0` | Hairline borders |
| `--color-muted` | `#9AA1B0` | Meta, captions, placeholders |

**The orange rule is the whole system.** Orange appears on primary CTAs, the selected filter chip
(itself a button), the active sidebar row's 2px left border, the warning-toast icon, and the focus
ring. Never on body text, never as a large block, never decorative. If you are unsure, it is not
orange. Semantic colours are only `--color-success #6B9E78` and `--color-danger #C47A6A`.

**Colour vibe of imagery.** Speaker portraits are the only photography: neutral, well-lit,
documentary — no filters, no duotone, no grain. Where no portrait exists the app shows the
speaker's initial in Archivo 900 at `rgba(3,30,87,.2)` on a `rgba(3,30,87,.1)` tile — use that
fallback rather than stock imagery. No illustrations exist in this brand; do not invent any.

### Type

Three families only — Archivo (display), Hanken Grotesk (body/UI), Space Mono (labels/prices).

- H1 44–52px / 900 / uppercase / `-0.02em`; hero can reach 68px
- H2 28–34px / 800; H3 20px / 900 uppercase
- Lead 18px / 600; Body 15–16px / 400 at line-height 1.6 in `--color-ink`
- Label 10–11px Space Mono uppercase, tracking `0.12–0.2em`
- Price: Space Mono bold, teal, with a 9px muted `per event` caption

### Spacing and layout

4px grid: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64. Content max width 1200px with a 24px gutter.
Sidebar is a fixed 256px navy column; the top bar is sticky at 64px. Card padding is 16px, stack
gap 8px, footer rules get 12px of padding above. Marketing sections are 96px tall vertically and
alternate white / `#FAFAFB` with a hairline between.

**Fixed elements.** Sidebar (sticky full height on desktop, off-canvas slide-in under 768px),
TopBar (sticky, `rgba(255,255,255,.9)` + `blur(20px)`), toast stack (fixed bottom-right, 24px
inset, 12px gaps), modal (fixed centred, scroll locked on body).

### Corners, borders, cards

Sharp by design. `2px` / `3px` buttons / `4px` inputs / `8px` cards / `12px` modal panel only /
pill for chips and avatars. Nothing rounder — no 16px+ "soft" cards.

A card is: white, `1px solid #ECECF0`, 8px radius, `0 1px 3px rgba(0,0,0,.06)`. On hover it lifts
`-3px` and switches to the signature **teal glow**:
`0 8px 32px rgba(98,157,171,.20), 0 0 0 1px rgba(98,157,171,.25)`. Dashboard stat cards add a 2px
top rule that is a `linear-gradient(90deg, <stat colour>, transparent)`. There is **no**
coloured-left-border card pattern in this brand.

### Shadows

Navy/teal-tinted, never neutral black: `--shadow-card`, `--shadow-card-hover` (teal glow),
`--shadow-toast`, `--shadow-modal`. No inner shadows anywhere. Depth on dark surfaces is carried
by `rgba(255,255,255,.1)` rules, not shadow.

### Transparency and blur

Three sanctioned uses: the TopBar (90% white + 20px blur), the modal scrim
(`rgba(70,80,106,.6)` + `blur(4px)` — `bg-ink/60 backdrop-blur-sm`), and the location pill over a
speaker photo (`rgba(0,0,0,.4)` + `blur(4px)`). On navy, white is stepped at
`.1 / .12 / .2 / .4 / .6 / .7` for rules, fills and text tiers. Never blur body content.

### Backgrounds

Light-led and flat. No gradient page backgrounds, no photographic hero fills, no repeating
patterns or textures. The one decorative device is the **badge watermark**: the mark oversized,
rotated ±8–12°, at 15% opacity on a navy band (`Hero.jsx`, `LoginPage`). Gradients appear once —
the 2px stat-card top rule.

### Motion

Five named keyframes, shipped in `tokens/motion.css`, copied from the app: `pulse-dot` (2s, live
status), `slide-up` (0.3s, panels), `modal-enter` (0.35s), `toast-enter` (0.3s ease-out),
`logo-roll` (0.7s, brand entrance). The house curve is the overshoot
`cubic-bezier(.34,1.56,.64,1)`; everything else is 150ms ease. No parallax, no scroll-jacking, no
long fades.

### Interaction states

- **Hover** — buttons darken to a fixed token (`#E64E00` orange, `#021540` navy, `#E0C4EF`
  lavender); outline/ghost fill with `--color-soft`; cards lift 3px + teal glow; sidebar rows go
  from `white/60` to `white` text on a `white/10` fill; list rows tint `--color-soft`.
- **Press** — colour only. No scale-down, no translate.
- **Focus** — border switches to orange plus `0 0 0 2px rgba(255,87,0,.2)`. Errors use the same
  ring in danger red.
- **Disabled** — orange CTA becomes `#FFD9C7` with `#B53E00` text; every other variant drops to
  50% opacity with `cursor: not-allowed`.
- **Selected** — orange fill, white text (filter chips, text selection).
- **Loading** — a 2px `border-current` spinner in the button, or `--color-soft` pulse blocks in a
  grid.

---

## ICONOGRAPHY

**One icon set: [Lucide](https://lucide.dev).** The app imports `lucide-react`; this system loads
the same glyphs from the Lucide UMD CDN build, so names map 1:1 with the codebase imports
(`CalendarCheck` → `<Icon name="calendar-check" />`).

```html
<script src="https://unpkg.com/lucide@0.454.0/dist/umd/lucide.min.js"></script>
```

- **Substitution flag:** Lucide is genuinely the product's icon set (a dependency, not a guess) —
  the only substitution is *delivery* (CDN UMD instead of the React package), because the design
  system cannot bundle npm modules.
- Default size 16px in dense UI, 18–20px in headers and toasts, 9–12px for inline meta. Stroke
  width stays at Lucide's default 2. Icons inherit `currentColor`; they are tinted with tokens
  (`--color-muted` resting, `--color-primary` active, `--color-secondary` structural,
  `--color-accent` only when the icon *is* the action).
- Glyphs actually in use: `layout-dashboard`, `search`, `calendar-check`, `user`, `utensils`,
  `dollar-sign`, `users-2`, `shield-check`, `bell`, `menu`, `sliders-horizontal`, `map-pin`,
  `check-circle`, `x-circle`, `alert-circle`, `info`, `log-out`, `x`, `arrow-left`, `loader-2`,
  `trending-up`, `users`.
- **No emoji. No unicode glyphs as icons.** Two literal characters are used as typographic marks,
  not icons: the trailing `→` on ghost links, and the `✓` inside the filter-active dot.
- There is no icon font and no SVG sprite in the repo. `src/app/icon.svg` and
  `icon-mark.svg` are favicon-scale renderings of the *old* mark and were **not** carried over.
- Never hand-draw an SVG icon for this brand.

---

## INDEX

### Root

| File | What it is |
|---|---|
| `README.md` | This guide |
| `SKILL.md` | Agent-Skills front matter for use in Claude Code |
| `github.md` | Repo association, last sync, screen map |
| `styles.css` | Global entry point — `@import` list only |
| `thumbnail.html` | Homepage tile |

### `tokens/`

`fonts.css` · `colors.css` · `typography.css` · `spacing.css` · `radius.css` · `elevation.css` ·
`motion.css` · `base.css`

### `assets/`

The 2026 badge pack: `logo-badge-navy.png`, `logo-badge-orange.png`, `logo-badge-white.png`
(transparent), `logo-badge-on-navy.jpg`, `logo-badge-on-orange.jpg`, plus the four original
uploads as `logo-lockup-*`.

### Components

Grouped by concern; each directory has a `@dsCard` HTML preview.

**`components/ui/`** — `Button`, `Badge` (+ `BookingStatusBadge`), `Input` (+ `Textarea`, `Select`),
`Modal`, `Toast` (+ `ToastStack`), `Icon`

**`components/brand/`** — `Logo`

**`components/speakers/`** — `SpeakerCard`, `SpeakerFilters`

**`components/layout/`** — `Sidebar`, `TopBar`

Every one of these has a counterpart in the repo except the three **intentional additions**:

- `Icon` — a wrapper so the design system can use the app's Lucide set without npm.
- `Logo` — an asset picker; the app inlines `next/image` calls instead.
- `Select` — specced in `docs/DESIGN.md` and present inline in `SpeakerFilters.tsx`, lifted out so
  forms can reuse it.

### `guidelines/`

16 specimen cards: core palette, neutrals, action states, semantic, section grounds, focus &
selection, display / body / mono type, size tokens, 4px grid, spacing in use, radius, elevation,
motion, category chips.

### `ui_kits/`

| Kit | Entry | Notes |
|---|---|---|
| `marketing_site/` | `index.html` | Homepage, speaker directory, speaker profile, booking modal, sign-in. **Spec-derived** — the repo has no marketing site yet |
| `client_portal/` | `index.html` | Dashboard, discovery, speaker sheet, 3-step booking wizard, bookings list. Faithful recreation |

Each kit has its own `README.md` with a screen-to-source table and the abbreviations taken.
