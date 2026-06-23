# NXT Speaker — Design System

> **MANDATORY READ.** Before making any UI change, adding a component, or implementing any feature with a visual surface — read this file in full. Design decisions that contradict this spec must be discussed and this file updated before code is written.

---

## Brand positioning

Disruptive speakers platform where audiences meet and book speakers directly — no gatekeepers, no agencies. The visual language must feel premium and editorial, never corporate or safe.

**Design direction: Momentum** (chosen direction)
- Navy hero band, oversized uppercase Archivo headings
- Logo mark used as oversized rotated watermark (~15% opacity)
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

---

## Logo assets

All assets live in `styling_assets/assets/`. Copy required variants into `public/` before use.

### Horizontal lockup (mark + "NXT SPEAKER")

| File | Colour | Use on |
|------|--------|--------|
| `logoHoriz_navy.png` | Navy | Light/white backgrounds — default nav, footers |
| `logoHoriz_white.png` | White | Dark/navy backgrounds |
| `logoHoriz_teal.png` | Teal | Teal-band contexts only |
| `logoHoriz_orange.png` | Orange | Avoid — provided for completeness only |

### Stacked lockup (mark above wordmark)

| File | Use on |
|------|--------|
| `logoStack_navy.png` | Light backgrounds, print, square format contexts |
| `logoStack_teal.png` | Teal-band contexts |
| `logoStack_white.png` | Dark/navy backgrounds |

### Mark only (graphic device / favicon)

| File | Use case |
|------|---------|
| `logoMark_navy.png` | Favicon, small icon on light bg |
| `logoMark_teal.png` | Decorative, teal-surface contexts |
| `logoMark_white.png` | Small icon on dark bg |
| `logoMark_orange.png` | Avoid for decoration — orange is actions-only |
| `logoMark_lavender.png` | Oversized watermark at 15% opacity on dark bands |

### Logo usage rules

- **Light background → navy logo** (`logoHoriz_navy.png`)
- **Dark/navy background → white logo** (`logoHoriz_white.png`)
- The angular mark may be used oversized and rotated at **≤15% opacity** as a background graphic on dark hero sections
- Never stretch, recolour, or apply effects to logo files
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

---

## Pre-implementation checklist

Before writing any UI code for a new component or page:

- [ ] Checked colour usage against the table above
- [ ] Orange is used only for clickable actions
- [ ] Font families match the three-typeface system
- [ ] Spacing follows the 4px grid
- [ ] Logo variant matches background colour
- [ ] Component spec matches the table above (buttons, cards, chips, search)
- [ ] No new colours introduced without updating this file

---

*Source: `styling_assets/HANDOFF.md` and `styling_assets/assets/`. Last reviewed: 2026-06-23.*
