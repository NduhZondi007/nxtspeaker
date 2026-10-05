# NXT Speaker — Design System

> **MANDATORY READ.** Before making any UI change, adding a component, or implementing any feature with a visual surface — read this file in full. Design decisions that contradict this spec must be discussed and this file updated before code is written.

---

## Brand positioning

Disruptive speakers platform where audiences meet and book speakers directly — no gatekeepers, no agencies. The visual language must feel premium and editorial, never corporate or safe.

**Design direction: Momentum** (chosen direction)
- Navy hero band, oversized uppercase Archivo headings
- Badge used as oversized rotated watermark (~15% opacity)
- Teal feature band for structural separation
- Angular, high-contrast feature cards
- Light-led overall: white/near-white canvas, colour used surgically

---

## Colour tokens

These tokens are the single source of truth. Use the CSS custom property names everywhere — never hardcode hex values in component code.

```css
/* Core palette */
--color-primary:    #031E57;  /* Speaker Navy  — text, headers, primary surfaces */
--color-secondary:  #629DAB;  /* Stage Teal    — borders, labels, structure, secondary CTAs */
--color-tertiary:   #FFFFFF;  /* Pure White    — dominant background / canvas */
--color-accent:     #FF5700;  /* Signal Orange — ACTIONS ONLY */
--color-support:    #ECD4F5;  /* Lavender      — chips, gentle fills, soft tints */

/* Neutrals */
--color-ink:        #46506A;  /* body copy */
--color-bg-soft:    #FAFAFB;  /* off-white section background */
--color-line:       #ECECF0;  /* hairline borders, dividers */
--color-muted:      #9AA1B0;  /* meta text, captions, timestamps */

/* Accent states */
--accent-hover:     #E64E00;  /* accent darkened ~8% — button hover */
--accent-disabled:  #FFD9C7;  /* accent tint — disabled button bg */
/* disabled button text: #B53E00 */

/* Radius scale */
--radius-sm:   2px;
--radius-md:   4px;
--radius-lg:   8px;
--radius-pill: 999px;

/* Spacing — 4px base grid */
/* 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 */
```

### Colour usage rules — enforced, no exceptions

| Colour | Allowed uses | Forbidden uses |
|--------|-------------|----------------|
| **Orange** `#FF5700` | Primary CTA buttons, one key highlight per view, selection state (orange bg / white text) | Body text, decoration, large blocks, borders, icons, background fills |
| **Navy** `#031E57` | Headings, body-text on light, dark-surface backgrounds, logo on light bg | — |
| **White** `#FFFFFF` | Default page canvas, cards, modals | — |
| **Teal** `#629DAB` | Thin rules, eyebrow labels, secondary-button borders, category tags, search borders, ghost link text | Primary CTAs, large fills, body copy |
| **Lavender** `#ECD4F5` | Category chips, subtle card fills, soft tints | Any action state, primary colour, text |
| **Ink** `#46506A` | Body copy, secondary text | Headings (use navy), CTAs |

**Key rule:** If you are unsure whether orange is appropriate for a use case — it is not. Orange is only for things users click to take an action.

---

## Typography

Three typefaces only. Do not introduce additional fonts.

| Role | Family | Weights | Notes |
|------|--------|---------|-------|
| Display / Headings | **Archivo** | 800, 900 | Uppercase, `letter-spacing: -0.02em`. Echoes the wordmark. |
| Body / UI | **Hanken Grotesk** | 400, 500, 600, 700 | Default for all body copy, labels, inputs, nav |
| Mono / Labels | **Space Mono** | 400, 700 | Eyebrow labels, price display, hex values, tags. Uppercase, `letter-spacing: 0.12–0.2em` |

### Type scale

| Token | Size | Weight | Family | Transform | Tracking |
|-------|------|--------|--------|-----------|---------|
| H1 | 44–52px | 900 | Archivo | uppercase | -0.02em |
| H2 | 28–34px | 800 | Archivo | — | — |
| Lead | 18px | 600 | Hanken Grotesk | — | — |
| Body | 15–16px | 400 | Hanken Grotesk | — | — (line-height 1.6) |
| Label | 11px | 400/700 | Space Mono | uppercase | 0.12–0.2em |

### Google Fonts import (place in `src/app/layout.tsx`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Hanken+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

---

## Component specs

### Buttons

| Variant | Background | Text | Border | Radius | Padding | Hover | Disabled |
|---------|-----------|------|--------|--------|---------|-------|---------|
| **Primary (CTA)** | `--color-accent` | white / 600 | — | 3px | 12×22px | `--accent-hover` | bg `--accent-disabled`, text `#B53E00` |
| **Navy** | `--color-primary` | white / 600 | — | 3px | 12×22px | navy darkened | — |
| **Outline** | white | navy / 600 | 1.5px `--color-secondary` | 3px | 12×22px | light teal fill | — |
| **Soft** | `--color-support` | navy / 600 | — | 3px | 12×22px | lavender darkened | — |
| **Ghost link** | transparent | `--color-secondary` / 600 | — | — | — | underline | — |

Ghost links always trail `→`.

### Navigation bar

- Background: white
- Logo: navy horizontal lockup (`logoHoriz_navy.png`), left-aligned
- Nav links: navy, Hanken Grotesk 500
- Single CTA right: orange primary button — "Book a speaker"
- On dark/navy backgrounds: switch to white logo (`logoHoriz_white.png`)

### Speaker card (hero component)

Vertical layout, angular/sharp corners (`--radius-md` max):

1. **Image** — full-width top, 4:3 or 3:4 ratio
2. **Category chip** — lavender bg / navy text, pill radius, Space Mono label
3. **Name** — Archivo 800, navy, 20–22px
4. **Topic** — one line, Hanken Grotesk 400, ink colour
5. **Footer row** — left: price in Space Mono, teal; right: small orange "Book" button

### Category chips

Three variants, all pill radius (`--radius-pill`):
- Lavender bg / navy text
- Teal bg / white text
- Outlined: transparent bg, navy text, 1px teal border

### Search field

- Border: 1.5px `--color-secondary` (teal)
- Text: navy
- Caret / focus ring: orange accent
- Placeholder: `--color-muted`
- Radius: `--radius-md`

### Section backgrounds

Alternate between `--color-tertiary` (white) and `--color-bg-soft` (off-white `#FAFAFB`) for visual separation. Use navy dark bands sparingly for hero moments only.

### Financial surfaces

Money is the one place where a wrong colour reads as a wrong number. These rules
cover payments, payouts, commission breakdowns and reconciliation views.

**Money values** — always Space Mono, always via `formatZAR` / `formatZARCents`
(`src/lib/utils/currency.ts`). Never hand-format an amount, and never use
`toLocaleString`: the en-ZA separator is engine-dependent and causes hydration
mismatches.

| Role | Colour | Weight | Use |
|------|--------|--------|-----|
| **Gross / headline amount** | `--color-ink` | 700 | The full fee a client pays |
| **Deduction** (commission, fee) | `--color-muted` | 400, prefixed `−` | Anything subtracted |
| **Net / payable** | `--color-secondary` | 700 | What a speaker actually receives |
| **Reversal / refund** | `--color-danger` | 700, prefixed `−` | Money going back out |
| **Settled / paid out** | `--color-success` | 700 | Confirmed complete |

**Orange is never used on a money value** — not on a total, not on a net figure, not
on a "Platform Revenue" tile. Orange marks only the button a user presses to move
money ("Pay now", "Mark as paid", "Approve refund"). One such button per view section.

**Breakdown rows** show the full arithmetic, never just the net — a speaker must never
discover the 15% by subtraction:

```
Gross          R 10,000
Platform 15%   − R 1,500
────────────────────────
You receive    R 8,500
```

The rule line is `border-t border-line`; the label column is Hanken Grotesk, the value
column Space Mono, right-aligned, tabular.

**Ledger and queue lists** use the same row-list pattern as every other list surface in
the app — `divide-y divide-line` inside a `bg-white border border-line` card — not an
HTML `<table>`. Each row: description left, amount right, status badge under the amount.

**Status badges** reuse the `Badge` / `BookingStatusBadge` conventions: pill radius,
Space Mono uppercase, tinted `bg/15` + `text` + `border/30` of the semantic token above.

**Exceptions** (amount mismatch, failed webhook, stuck refund) render in a distinct card
with a `--color-danger` hairline at the top and must never be silently collapsed into a
normal row — an unreconciled payment should be visually impossible to miss.

**Sensitive values.** Bank account numbers are masked to the last 4 digits everywhere
except the speaker's own banking form (`••••  ••••  1234`). Never render a full account
number in an admin list or an export preview.

---

## Logo assets

All assets live in `styling_assets/assets/`. Copy required variants into `public/` before use.

The brand mark is the **2026 circular NXT SPEAKER badge**: navy `#031E57` "N" and "T", an orange
`#FF5700` "X" topped by a megaphone, and a "— SPEAKER —" sub-line inside a thin navy ring. It is a
fixed two-colour mark. The earlier angular mark and its teal / lavender colourways are retired.
There is no vector master yet, so every asset is a transparent PNG.

### Horizontal lockup (badge + "NXT SPEAKER") — 1472×432, ≈3.4:1

| File | Colour | Use on |
|------|--------|--------|
| `logoHoriz_navy.png` | Navy | Light/white backgrounds — default nav, footers |
| `logoHoriz_white.png` | White | Dark/navy backgrounds (sidebar: `width={140} height={41}`) |
| `logoHoriz_orange.png` | Orange | Avoid — provided for completeness only |

### Stacked lockup (badge above wordmark) — 848×800

| File | Use on |
|------|--------|
| `logoStack_navy.png` | Light backgrounds, print, square format contexts (login / register) |
| `logoStack_white.png` | Dark/navy backgrounds |

### Badge only (graphic device / favicon) — 512×512

| File | Use case |
|------|---------|
| `logoMark_navy.png` | Small icon on light bg; also `src/app/icon.png` (favicon) and the PWA manifest icon |
| `logoMark_white.png` | Small icon on dark bg; oversized watermark at 15% opacity on dark bands |
| `logoMark_orange.png` | Avoid for decoration — orange is actions-only |
| `apple-touch-icon.png` | 180×180, navy ground baked in (iOS ignores alpha) — served as `src/app/apple-icon.png` |

Favicons use Next.js file conventions (`src/app/icon.png`, `src/app/apple-icon.png`); do not
reintroduce `icon.svg` until a vector of the badge exists, or browsers will prefer the stale SVG.

### Logo usage rules

- **Light background → navy logo** (`logoHoriz_navy.png`)
- **Dark/navy background → white logo** (`logoHoriz_white.png`)
- The badge may be used oversized and rotated at **≤15% opacity** as a background graphic on dark hero sections (`logoMark_white.png`)
- Never stretch, recolour, or apply effects to logo files — size by the file's own aspect ratio
- Never recreate teal or lavender versions of the badge
- Never use the orange logo as a decorative element

---

## Do's and Don'ts

### Do
- Use white or `--color-bg-soft` as the page canvas
- Make all primary CTAs orange
- Use Archivo in uppercase with tight tracking for all headings
- Use Space Mono for prices, labels, tags, eyebrows
- Use teal for borders, dividers, and structural accents
- Keep lavender to chips and gentle background fills only

### Don't
- Use orange for anything that is not a user action
- Use more than one primary CTA per view section
- Mix Archivo with other display fonts
- Use rounded corners beyond `--radius-lg` (8px) except for pills and avatars
- Put large blocks of orange anywhere on the page
- Introduce new colours outside the token set without updating this file first
- Colour a money value orange — see Financial surfaces
- Render a full bank account number outside the speaker's own banking form

---

## Pre-implementation checklist

Before writing any UI code for a new component or page:

- [ ] Checked colour usage against the table above
- [ ] Orange is used only for clickable actions
- [ ] Font families match the three-typeface system
- [ ] Spacing follows the 4px grid
- [ ] Logo variant matches background colour
- [ ] Component spec matches the table above (buttons, cards, chips, search)
- [ ] Money values follow Financial surfaces (Space Mono, `formatZAR`, never orange)
- [ ] No new colours introduced without updating this file

---

*Source: `styling_assets/HANDOFF.md` and `styling_assets/assets/`. Last reviewed: 2026-10-05.*
