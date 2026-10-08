# 2. Typography

## Families (LOCKED, DS-01)

| Token          | Family       | Weights       | Role                                                           | Why                                                                                                                                                                                                                                                         |
| -------------- | ------------ | ------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `font.display` | **Rajdhani** | 500, 600, 700 | Display, headings, nav, buttons, chips (values), spaced labels | Matches the reference's squared, semi-condensed uppercase titles ("TECHNOMEDH", "EVENT SCHEDULE", "HACKATHON"). It has a technical feel without looking like a gaming font. Designed by the Indian Type Foundry; Latin + Devanagari; SIL Open Font License. |
| `font.body`    | **Inter**    | 400, 500, 600 | Body copy, metadata, tab content, chip labels, footer          | Highly legible at small sizes, with tabular numerals for times. Neutral, so the display face carries the personality. SIL Open Font License.                                                                                                                |

- Both are loaded through `next/font` (self-hosted, `display: swap`, Latin subset; add Devanagari only if
  needed). Only the listed weights are loaded.
- **Rajdhani is never used for running text.** It has a small x-height and thin strokes at small sizes.
  Its minimum size is 14 px, at weight ≥ 500.
- The Ashwamedh wordmark is **always the logo image**, never typeset ([logos.md](logos.md)).
- Fallbacks: `font.display`: `"Rajdhani", "Arial Narrow", system-ui, sans-serif` · `font.body`:
  `"Inter", system-ui, -apple-system, "Segoe UI", sans-serif`.

## Type scale

Fluid sizes use `clamp(min, preferred, max)` between the 360 px and 1440 px viewports. 1 rem = 16 px.

| Style token        | Family / weight | Size (mobile → desktop)                                | Line height | Tracking | Case           | Used for                                                                                                    |
| ------------------ | --------------- | ------------------------------------------------------ | ----------- | -------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| `text.display`     | Rajdhani 700    | `clamp(2.25rem, 1.6rem + 2.8vw, 4rem)` (36 → 64)       | 1.0         | 0.16em   | UPPER          | Section display titles: "ASHWAMEDH" (overview), "EVENT SCHEDULE", "CULTURAL NIGHT", "CAMPUS MAP"            |
| `text.h1`          | Rajdhani 700    | `clamp(2rem, 1.5rem + 2vw, 3.25rem)` (32 → 52)         | 1.05        | 0.04em   | UPPER          | Page titles: vertical name on listing, event name on detail                                                 |
| `text.h2`          | Rajdhani 700    | `clamp(1.5rem, 1.25rem + 1.1vw, 2.25rem)` (24 → 36)    | 1.1         | 0.04em   | UPPER or Title | Sub-section headings (e.g. "What's On")                                                                     |
| `text.h3`          | Rajdhani 700    | `clamp(1.25rem, 1.15rem + 0.5vw, 1.625rem)` (20 → 26)  | 1.15        | 0.03em   | UPPER          | Vertical card titles                                                                                        |
| `text.title`       | Rajdhani 600    | 1.125rem → 1.25rem (18 → 20)                           | 1.2         | 0.01em   | Title          | Event card names, schedule row titles                                                                       |
| `text.body-lg`     | Inter 400       | 1.0625rem → 1.125rem (17 → 18)                         | 1.65        | 0        | Sentence       | Intro paragraphs (About)                                                                                    |
| `text.body`        | Inter 400       | 1rem (16)                                              | 1.65        | 0        | Sentence       | Tab content, page copy                                                                                      |
| `text.body-sm`     | Inter 400       | 0.875rem (14)                                          | 1.55        | 0        | Sentence       | Secondary copy, footer text                                                                                 |
| `text.meta`        | Inter 500       | 0.8125rem (13)                                         | 1.45        | 0.01em   | Sentence       | Card meta ("Team · TBA"), department line on cards, schedule times (tabular nums)                           |
| `text.label-lg`    | Rajdhani 600    | `clamp(0.875rem, 0.8rem + 0.35vw, 1.125rem)` (14 → 18) | 1.3         | 0.3em    | UPPER          | Hero sub-line "PCE'S FLAGSHIP ANNUAL FEST", "SCROLL TO EXPLORE"                                             |
| `text.label`       | Rajdhani 600    | 0.875rem (14)                                          | 1.3         | 0.18em   | UPPER          | Eyebrows, card tagline areas, "FULL SCHEDULE COMING SOON"                                                   |
| `text.micro`       | Inter 600       | 0.75rem (12)                                           | 1.3         | 0.2em    | UPPER          | Tiny spaced labels below 14 px where Rajdhani would be illegible: sticky-logo sub-line, "SCROLL TO EXPLORE" |
| `text.nav`         | Rajdhani 600    | 1rem (16)                                              | 1           | 0.02em   | Title          | Navbar items, footer column headings                                                                        |
| `text.button`      | Rajdhani 700    | 1rem (16)                                              | 1           | 0.04em   | Title          | Buttons ("Register Now", "View Guidelines PDF", "View Details")                                             |
| `text.button-hero` | Rajdhani 700    | 1rem → 1.125rem (16 → 18)                              | 1           | 0.22em   | UPPER          | Hero "COMING SOON" status                                                                                   |
| `text.chip-value`  | Rajdhani 700    | 1rem (16)                                              | 1.1         | 0.02em   | As data        | Chip values ("TBA", later "₹ …")                                                                            |
| `text.chip-label`  | Inter 500       | 0.75rem (12)                                           | 1.3         | 0.01em   | Sentence       | Chip labels ("Registration Fee", "Venue")                                                                   |

- **Minimum text size:** 12 px (Inter `chip-label` and `micro` only), 14 px for anything in Rajdhani, and 16 px for body.
- **Line length:** body text max 72 ch (`size.measure`).
- **Numerals:** `font-variant-numeric: tabular-nums` for times, dates and fees.
- **Uppercase** is a style, not the content. Source text keeps its normal case, so screen readers and
  copy/paste read naturally.

## Weights

| Token                  | Value | Use                                                            |
| ---------------------- | ----- | -------------------------------------------------------------- |
| `font.weight.regular`  | 400   | Body (Inter)                                                   |
| `font.weight.medium`   | 500   | Meta, chip labels (Inter); minimum for Rajdhani                |
| `font.weight.semibold` | 600   | Nav, labels, event titles (Rajdhani); emphasis in body (Inter) |
| `font.weight.bold`     | 700   | Display, H1–H3, buttons, chip values (Rajdhani)                |

## Line heights

| Token             | Value | Use                          |
| ----------------- | ----- | ---------------------------- |
| `leading.none`    | 1.0   | Display, single-line buttons |
| `leading.tight`   | 1.1   | H1–H3                        |
| `leading.snug`    | 1.3   | Labels, chip labels          |
| `leading.normal`  | 1.55  | Small body                   |
| `leading.relaxed` | 1.65  | Body                         |

## Heading hierarchy (from Phase 2)

| Page                              | `h1`                                                 | `h2`                                             | `h3`                             |
| --------------------------------- | ---------------------------------------------------- | ------------------------------------------------ | -------------------------------- |
| Home                              | "ASHWAMEDH 2026" (logo image alt; visually the logo) | Section titles (`text.display`)                  | Vertical card titles (`text.h3`) |
| Vertical listing                  | Vertical name (`text.h1`)                            | —                                                | Event card names (`text.title`)  |
| Event detail                      | Event name (`text.h1`)                               | Tab panel heading (visually hidden or `text.h2`) | —                                |
| Schedule / Cultural Night / Venue | `text.display` styled as `h1`                        | `text.h2`                                        | —                                |

A semantic level never changes because of size. When a visual style differs from the semantic level,
apply the style token to the correct heading element.
