# NXT Speaker — Website Colour System (handoff)

**Context:** Disruptive speakers platform where audiences meet and book speakers directly (no gatekeepers / agencies). Restyle the existing site with the brand identity below. **Light-led**: white / near-white backgrounds, navy text, teal as structure, **orange strictly for actions only**.

---

## Design tokens

```css
/* Core palette */
--color-primary:    #031E57;  /* Speaker Navy  — text, headers, primary surfaces */
--color-secondary:  #629DAB;  /* Stage Teal    — borders, labels, structure, secondary CTAs */
--color-tertiary:   #FFFFFF;  /* Pure White    — dominant background / canvas */
--color-accent:     #FF5700;  /* Signal Orange — ACTIONS ONLY (primary CTA, key highlights) */
--color-support:    #ECD4F5;  /* Lavender      — soft tints, category chips, gentle fills */

/* Neutrals */
--color-ink:        #46506A;  /* body copy */
--color-bg-soft:    #FAFAFB;  /* off-white section bg */
--color-line:       #ECECF0;  /* hairline borders */
--color-muted:      #9AA1B0;  /* meta / captions */

/* Accent states */
--accent-hover:     #E64E00;  /* accent darkened ~8% L */
--accent-disabled:  #FFD9C7;  /* accent tint; text #B53E00 */

/* Radius */
--radius-sm: 2px;  --radius-md: 4px;  --radius-lg: 8px;  --radius-pill: 999px;

/* Spacing — 4px base */
/* 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 */
```

### Usage rules
- **Orange is for action and nothing else** — primary buttons and the single key highlight per view. Never large orange blocks, never body text, never decoration.
- **Navy** is the workhorse for text and dark surfaces; **white** is the default canvas.
- **Teal** organises: thin rules, eyebrow labels, secondary-button borders, category tags.
- **Lavender** is a soft accent only (chips, subtle fills) — never a primary action.
- Selection highlight: orange background, white text.

---

## Typography

- **Display / headings — Archivo** (Google Fonts), weights 800–900, usually `text-transform:uppercase`, `letter-spacing:-0.02em`. Echoes the logo wordmark.
- **Body / UI — Hanken Grotesk** (Google Fonts), 400 / 500 / 600.
- **Mono — Space Mono** for labels, hex values, eyebrows and tags. Uppercase, `letter-spacing:0.12–0.2em`.

```
H1     44–52px / 900 / uppercase / -0.02em
H2     28–34px / 800
Lead   18px / 600
Body   15–16px / 400 / line-height 1.6 / color ink
Label  11px / Space Mono / uppercase / tracked
```

Google Fonts import:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Hanken+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

---

## Components

| Component | Spec |
|---|---|
| **Primary button** | bg `--color-accent`, white text, 600, radius 3px, padding ~12×22px. Hover `--accent-hover`. Disabled `--accent-disabled` / text `#B53E00`. |
| **Navy button** | bg navy, white text — secondary actions ("View profile"). |
| **Outline button** | white bg, navy text, 1.5px teal border. |
| **Soft button** | lavender bg, navy text. |
| **Ghost link** | teal text, 600, trailing `→`. |
| **Nav bar** | white, navy logo left, navy links, one orange "Book a speaker" CTA right. |
| **Speaker card** *(hero component)* | image top → category chip (lavender/teal) → name in Archivo 800 navy → one-line topic in ink → footer row with mono price (teal) + small orange "Book" button. |
| **Category chips** | pill radius; lavender/navy, teal/white, or outlined variants. |
| **Search field** | 1.5px teal border, navy text, orange caret accent. |

---

## Logo assets

Transparent PNGs in `assets/`:

```
assets/logoHoriz_{navy,white,teal,orange}.png   horizontal lockup (mark + "NXT SPEAKER")
assets/logoStack_{navy,white,teal}.png          stacked lockup (mark over wordmark)
assets/logoMark_{navy,teal,white,orange,lavender}.png   mark only (graphic device / favicon)
```

- On light backgrounds → **navy** logo. On navy backgrounds → **white** logo.
- The angular mark can be used oversized / rotated at low opacity (~15%) as a background graphic.

---

## Three directions (pick one)

- **01 Clarity** — airy editorial: lots of white, thin teal hairlines, navy text, orange only on one CTA. Calm, premium, high-trust.
- **02 Momentum** — disruptive energy: navy hero band, oversized uppercase Archivo, logo mark as a rotated watermark, a teal feature band, angular feature cards. Most "disruptive" in tone.
- **03 System** — token / handoff aesthetic: swatch token cards, spacing & radius scales, full button-state matrix. Most directly implementable.

---

*Logo and colours extracted from the NXT Speaker brand guide. Reference design: `NXT Speaker Colour System.dc.html`.*
