# 3. Spacing, Layout, Radius, Borders · 8. Responsive Tokens

## Spacing scale (4 px base)

| Token     | px  | Token      | px  |
| --------- | --- | ---------- | --- |
| `space.0` | 0   | `space.8`  | 32  |
| `space.1` | 4   | `space.10` | 40  |
| `space.2` | 8   | `space.12` | 48  |
| `space.3` | 12  | `space.16` | 64  |
| `space.4` | 16  | `space.20` | 80  |
| `space.5` | 20  | `space.24` | 96  |
| `space.6` | 24  | `space.32` | 128 |

Only these values are used. Any one-off value needs a token.

## Breakpoints

Aligned with the Tailwind defaults, so no custom configuration is needed.

| Token    | Min width | Name used in docs                                            |
| -------- | --------- | ------------------------------------------------------------ |
| —        | 0         | Mobile (phone portrait, designed at 360 px)                  |
| `bp.sm`  | 640 px    | Large phone / small tablet                                   |
| `bp.md`  | 768 px    | Tablet                                                       |
| `bp.lg`  | 1024 px   | Laptop                                                       |
| `bp.xl`  | 1280 px   | Desktop: full desktop navbar appears (Phase 4 visual review) |
| `bp.2xl` | 1536 px   | Large screens                                                |

## Containers and widths

| Token                 | Value   | Use                                                                                         |
| --------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `size.container`      | 1280 px | Max content width (nav, sections, footer)                                                   |
| `size.container-wide` | 1440 px | Event-detail header block and listing (sidebar + grid)                                      |
| `size.measure`        | 72 ch   | Max line length for body text                                                               |
| Full bleed            | 100 vw  | Hero and Cultural Night backgrounds only. Their content still sits inside `size.container`. |

### Page gutters (side padding)

| Viewport  | Gutter          |
| --------- | --------------- |
| Mobile    | `space.4` (16)  |
| `sm`–`md` | `space.6` (24)  |
| `lg`      | `space.8` (32)  |
| `xl`+     | `space.10` (40) |

No horizontal page scroll at any width.

## Grid

| Viewport        | Columns | Column gap | Layout notes                                                                      |
| --------------- | ------- | ---------- | --------------------------------------------------------------------------------- |
| Mobile          | 4       | 16         | Single-column content; cards full width                                           |
| Tablet (`md`)   | 8       | 20         | Vertical cards 2 × 2; event cards 2 per row                                       |
| Desktop (`lg`+) | 12      | 24         | Vertical cards 4 × 1; listing = sidebar (3 cols) + grid (9 cols, 3 cards per row) |

| Pattern                   | Mobile                   | Tablet                   | Desktop                    |
| ------------------------- | ------------------------ | ------------------------ | -------------------------- |
| Vertical cards (overview) | 1 col                    | 2 col                    | 4 col                      |
| Event cards (listing)     | 1 col                    | 2 col                    | 3 col (beside the sidebar) |
| Event detail header       | Image on top, info below | Image on top, info below | Info 7 cols / image 5 cols |
| Detail chips              | 2 col                    | 3 col                    | 3 col × 2 rows             |
| Schedule rows             | Stacked 2-line           | 1 line                   | 1 line, 4 fields           |
| Cultural Night day cards  | 2 col                    | 2 col                    | 2 col                      |
| Footer                    | Stacked                  | 2 × 2                    | 4 col                      |

## Section spacing

| Token                 | Mobile | Tablet | Desktop | Use                                                        |
| --------------------- | ------ | ------ | ------- | ---------------------------------------------------------- |
| `space.section`       | 64     | 80     | 112     | Vertical padding between homepage sections and page blocks |
| `space.section-tight` | 40     | 48     | 64      | Between a page header and its content                      |
| `space.stack-lg`      | 24     | 32     | 40      | Heading → content inside a section                         |
| `space.stack`         | 16     | 16     | 24      | Between related elements                                   |
| `space.stack-sm`      | 8      | 8      | 12      | Label → value, title → meta                                |

## Card gaps and internal spacing

| Element                            | Gap / padding                                         |
| ---------------------------------- | ----------------------------------------------------- |
| Card grid gap                      | 16 mobile · 20 tablet · 24 desktop (same as grid gap) |
| Vertical card padding (text block) | 20 mobile · 24 desktop                                |
| Event card body padding            | 16 mobile · 20 desktop                                |
| Detail header block padding        | 20 mobile · 32 tablet · 40 desktop                    |
| Chip padding                       | 12 × 12; icon tile 40 × 40; icon-to-text gap 12       |
| Button padding                     | Height 48 (min 44); horizontal 24; icon gap 10        |
| Schedule row                       | Height ≥ 64 desktop; padding 16 × 20; icon tile 40    |
| Tab                                | Height 48; horizontal padding 16; indicator 2 px      |

## Radius

| Token         | Value   | Use                                                                        |
| ------------- | ------- | -------------------------------------------------------------------------- |
| `radius.sm`   | 6 px    | Chips' icon tiles, small tags                                              |
| `radius.md`   | 8 px    | Buttons, tabs (top), inputs (future), schedule day tiles                   |
| `radius.lg`   | 12 px   | Event cards, vertical cards, schedule rows, chips                          |
| `radius.xl`   | 16 px   | Large panels: detail header block, map container, Cultural Night day cards |
| `radius.full` | 9999 px | Scroll-cue circle, round icon buttons                                      |

The reference uses moderately rounded corners. **No clipped or angled corners.**

## Borders

| Token                    | Value                                                    | Use                                          |
| ------------------------ | -------------------------------------------------------- | -------------------------------------------- |
| `border.width.hairline`  | 1 px                                                     | All card, panel and row outlines             |
| `border.width.indicator` | 2 px                                                     | Active nav underline, active tab, focus ring |
| Card outline             | 1 px `border.default`; vertical cards 1 px `accent.line` |                                              |
| Control outline          | 1 px `border.control`                                    | Secondary buttons, disabled CTAs (dashed)    |

## Elevation and glow

| Token                             | Value                                         | Use                                                          |
| --------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `shadow.card`                     | `0 8px 24px rgba(0,0,0,.45)`                  | Cards on hover (lift)                                        |
| `shadow.panel`                    | `0 16px 48px rgba(0,0,0,.55)`                 | Detail header block, mobile menu sheet                       |
| `glow.sm`                         | `0 0 0 1px accent.line, 0 0 16px accent.glow` | Vertical card idle edge, hero status ring, primary CTA hover |
| `glow.md`                         | `0 0 0 1px accent.base, 0 0 32px accent.glow` | Vertical card hover only                                     |
| `z.nav` / `z.overlay` / `z.sheet` | 40 / 50 / 60                                  | Stacking order                                               |

## 8. Responsive behaviour summary

| Area                   | Mobile (< 768)                                                                          | Tablet (768–1023)                           | Desktop (≥ 1024)                                                                                                                                                                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Navbar                 | Top bar (64 px): logo + menu button; full-screen overlay menu                           | Same as mobile (menu button up to 1279 px)  | From 1280 px: full bar (80 px over the hero, 72 px when sticky): logo, 8 items, status CTA                                                                                                                                                                |
| Hero                   | Height `100svh`, min 560; logo width `min(78vw, 360px)`; **word stacks hidden** (DS-08) | Logo up to 440 px; word stacks at the sides | Logo at reference size (≈ 45 % of hero width, max 640 px); word stacks at left/right. Final hero logo sizes require the official high-resolution asset; until then the logo stays ≤ 203 CSS px ([logos.md](logos.md#resolution-requirement-ds-06), DS-06) |
| Type                   | Lower clamp bound                                                                       | Interpolated                                | Upper clamp bound                                                                                                                                                                                                                                         |
| Listing sidebar        | Replaced by a "Jump to event" control                                                   | Same as mobile                              | Sticky sidebar (top = nav height + 24)                                                                                                                                                                                                                    |
| Detail primary CTA     | Sticky bottom bar (72 px, safe-area padding)                                            | Sticky bottom bar                           | Inline in the header block                                                                                                                                                                                                                                |
| Tabs                   | Horizontally scrollable, edge fade                                                      | Full width                                  | Full width                                                                                                                                                                                                                                                |
| Hover effects          | None (pressed states only)                                                              | Pressed + hover if a pointer is present     | Hover + focus                                                                                                                                                                                                                                             |
| Large screens (≥ 1536) | —                                                                                       | —                                           | Content stays at `size.container`; backgrounds extend; no type growth beyond the clamp max                                                                                                                                                                |

Media queries for hover use `@media (hover: hover) and (pointer: fine)`. Touch devices never depend on hover.
