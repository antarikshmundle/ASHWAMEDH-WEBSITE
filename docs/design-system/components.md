# 4. Component Design Tokens

Each component lists its anatomy, tokens and states. `accent.*` always means the **context accent**: brand
globally, the vertical accent inside a vertical ([colors.md](colors.md#accent-system)). The content and
behaviour of each component come from the Phase 2 UX docs; this file defines only the visual rules.

## Navbar

| Part       | Hero state (homepage top)                                                                                                          | Sticky state (scrolled, all inner pages)                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Height     | 80 px desktop · 64 px mobile                                                                                                       | 72 px desktop · 64 px mobile                                               |
| Background | Transparent, over a top-down scrim (`bg.base` 60 % → 0)                                                                            | `bg.raised` at 82 % + `backdrop-blur(12px)` + bottom `border.subtle`       |
| Logo block | PCE logo on a light plate + "PRIYADARSHINI COLLEGE OF ENGG. / NAGPUR" (`text.label`, `text.primary`)                               | Ashwamedh logo + "PCE's flagship annual fest" (`text.micro`, `text.muted`) |
| Items      | `text.nav`, `text.secondary`; hover `text.primary`; active `text.primary` + 2 px `accent.brand` underline (24 px wide, centred)    | Same                                                                       |
| CTA        | "Coming Soon" status: `radius.md`, 1 px `accent.line` (brand), `text.button`, `text.primary`, no glow, **non-interactive** (OD-12) | Same                                                                       |
| Mobile     | Logo + menu button (44 × 44, 1 px `border.control`, `radius.md`)                                                                   | Same                                                                       |

The navbar always uses the **brand** accent, even on vertical pages.

## Hero

| Part         | Token / rule                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Canvas       | Full bleed, `100svh` (min 560 mobile / 720 desktop). Abstract campus-silhouette + ember atmosphere artwork (D5), with a radial vignette to `bg.base`.                                            |
| Logo         | Ashwamedh logo, centred ([logos.md](logos.md) for size limits); `h1` accessible name "ASHWAMEDH 2026"                                                                                            |
| Sub-line     | `text.label-lg`, `text.primary`                                                                                                                                                                  |
| Tagline area | `text.label` styling for a placeholder copy area (OD-07)                                                                                                                                         |
| Word stacks  | Left: vertical names, `text.h3` at 40 % opacity of `text.secondary`, slight italic skew ≤ 6° (decorative, `aria-hidden`). Right: placeholder copy area (OD-07). Hidden < `md`.                   |
| Status CTA   | "COMING SOON →", `text.button-hero`, height 56, width ≈ 320 desktop / 100 % (max 320) mobile, `radius.md`, 1 px `accent.brand`, `glow.sm` (brand), transparent fill, **non-interactive** (OD-12) |
| Scroll cue   | 40 px circle (`radius.full`, 1 px `border.control`) + "SCROLL TO EXPLORE" (`text.micro`, `text.secondary`); interactive, 44 × 44 hit area, focus ring                                            |

## Buttons and CTA states

| Variant             | Idle                                                                                                                  | Hover (pointer)                       | Focus-visible                                                       | Pressed                          | Notes                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Primary**         | Fill `accent.strong`, label `text.on-accent`, `radius.md`, height 48                                                  | Fill `accent.base`, `glow.sm`         | Focus ring (`state.focus` 2 px, offset 2)                           | Fill `accent.strong`, scale 0.98 | One per view (Register Now)                                                                               |
| **Secondary**       | Transparent, 1 px `border.control`, label `text.primary`                                                              | Border `accent.line`, label unchanged | Focus ring                                                          | `state.pressed-overlay`          | Download Event PDF                                                                                        |
| **Tertiary / link** | Label `accent.base`, `text.button`, trailing arrow                                                                    | Underline 1 px, arrow moves 4 px      | Focus ring around the text                                          | —                                | Explore Events →, View Details →, ← Back                                                                  |
| **Status**          | As defined per placement (navbar / hero)                                                                              | **No change**                         | **Not focusable**                                                   | **No change**                    | "Coming Soon" (OD-12). Rendered as a non-interactive element, `cursor: default`. The arrow is decorative. |
| **Disabled**        | Fill `bg.surface-2`, 1 px **dashed** `border.control`, label `text.muted`, optional leading clock icon (`text.muted`) | **No change**                         | Not focusable (status text is in the accessible name of the region) | **No change**                    | Registration Opening Soon · Event PDF Coming Soon · Registration Closed                                   |

All buttons: min 44 × 44 touch target, `text.button`, icon 18 px, gap 10.

## Vertical cards (overview, panel 03)

| Part          | Rule                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Shape         | Aspect ratio ≈ 3 : 4.4 (desktop), `radius.lg`, 1 px `accent.line`, `glow.sm` at idle                  |
| Artwork       | Top ~62 %. Abstract per-vertical artwork ([verticals.md](verticals.md)), bottom scrim to `bg.surface` |
| Title         | `text.h3`, colour `accent.base`                                                                       |
| Tagline area  | `text.label`, `text.muted` (placeholder copy area, OD-07)                                             |
| Divider       | 1 px `border.subtle`                                                                                  |
| Footer row    | Link label (`text.meta` 500, `accent.base`) + arrow · vertical icon 28 px `accent.base` right-aligned |
| Hover         | Lift −4 px, `glow.md`, artwork scale 1.03 (inside the clip)                                           |
| Focus-visible | Focus ring around the whole card (`radius.lg` + 2)                                                    |
| Whole card    | One link                                                                                              |

## Event cards (listing, panel 04)

| Part       | Rule                                                                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shape      | `radius.lg`, `bg.surface`, 1 px `border.default`                                                                                                                       |
| Image      | 16 : 9, abstract vertical placeholder (D5), `radius.lg` top corners                                                                                                    |
| Name       | `text.title`, `text.primary`                                                                                                                                           |
| Department | `text.meta`, `text.secondary` (OD-16; omitted for Sports)                                                                                                              |
| Meta       | `text.meta`, `text.muted`: "{participation} · {date}" → "TBA · TBA"                                                                                                    |
| Action     | Small secondary-style label "View Details →" (`accent.base` text, 1 px `accent.line` border, height 36 visual / 44 hit area). Visual only; the whole card is the link. |
| Hover      | Lift −2 px, border `accent.line`, `shadow.card`                                                                                                                        |

## Listing sidebar

`bg.surface` panel, `radius.lg`. Title `text.h3` `accent.base`. Items: `text.body-sm` 500, `text.secondary`,
height 44, icon 18. Active item ("All Events"): `bg.surface-3`, 1 px `accent.line`, `text.primary`.

## Event detail header block (panel 05)

| Part            | Rule                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Container       | `size.container-wide`, `radius.xl`, `bg.surface`, 1 px `border.default`, `shadow.panel`               |
| Back link       | Tertiary link "← Back to {Vertical}", `text.meta`                                                     |
| Title           | `text.h1`, `text.primary`                                                                             |
| Department line | `text.label`, `text.muted` (OD-07/OD-16)                                                              |
| Image           | Right column (desktop), fades left into the surface via a horizontal scrim; abstract placeholder (D5) |
| Chips           | 3 × 2 grid ([Chips](#chips))                                                                          |
| CTA row         | Primary + Secondary, gap 16; wraps on narrow widths                                                   |

## Chips

Chips follow the reference (DS-07): **differentiated, multi-colour icons**. Each field has a fixed tone that
is identical in every vertical. Chips do **not** use the context accent. Colours come only from the chip
palette in [colors.md](colors.md#chip-palette-ds-07).

| Chip             | Icon (Lucide)  | Tone          | Tile                                               |
| ---------------- | -------------- | ------------- | -------------------------------------------------- |
| Participation    | `Users`        | `chip.warm`   | Yes                                                |
| Registration Fee | `Ticket`       | `chip.warm`   | Yes                                                |
| Prize Pool       | `Award`        | `chip.warm`   | Yes                                                |
| Date & Time      | `CalendarDays` | `chip.field`  | Yes                                                |
| Venue            | `MapPin`       | `chip.field`  | Tile at 40 % (near-invisible, as in the reference) |
| Team Size        | `UserRound`    | `chip.people` | Yes                                                |

| Part       | Rule                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Layout     | Icon tile (40 × 40, `radius.sm`, the tone's tile colour), icon 20 px in the tone's icon colour, then the text stack |
| Value      | `text.chip-value`, `text.primary` (real data) / `text.muted` (TBA)                                                  |
| Label      | `text.chip-label`, `text.muted`                                                                                     |
| Container  | No border, no background (sits on the header surface), min height 48                                                |
| Order      | Desktop 3 × 2 in the reference order: Participation · Fee · Prize / Date & Time · Venue · Team Size                 |
| Constraint | No new chip tones. Any new chip type reuses one of the three tones.                                                 |

## Tabs

| Part      | Rule                                                                                        |
| --------- | ------------------------------------------------------------------------------------------- |
| Bar       | 1 px `border.strong` baseline; tabs height 48, padding 16                                   |
| Tab label | `text.nav` (Rajdhani 600, 16), idle `text.muted`, hover `text.secondary`                    |
| Active    | `text.primary` + 2 px `accent.base` indicator on the baseline                               |
| Focus     | Focus ring inside the tab (`radius.md`)                                                     |
| Panel     | `text.body`, `text.secondary`, max `size.measure`, padding-top 24                           |
| Mobile    | Horizontal scroll, 24 px edge fade (`bg.base` → transparent), active tab scrolled into view |

## Schedule blocks (panel 06)

| Part                           | Rule                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Header                         | `text.display` title, flanked by thin decorative arrows (`border.strong`); status line `text.label`, `text.muted` with "COMING SOON" in `accent.brand` |
| Day tiles (future, OD-04)      | `radius.md`, `bg.surface-2`, 1 px `border.default`; active `bg.surface-3` + 1 px `accent.line`; label `text.nav`, value `text.chip-value`              |
| Row                            | `radius.lg`, `bg.surface-2`, 1 px `border.subtle`, height ≥ 64                                                                                         |
| Row icon tile                  | 40 × 40, `radius.sm`, tinted with the **row's own vertical** `soft` colour and icon in its `base` colour (inauguration and global rows use brand)      |
| Row text                       | Time `text.meta` tabular `text.muted` · Title `text.title` `text.primary` · Venue `text.meta` `text.muted`                                             |
| Hover (rows link to verticals) | `state.hover-overlay`, border `border.strong`                                                                                                          |

## Cultural Night blocks (panel 07)

| Part              | Rule                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hero band         | Full bleed, abstract stage-light artwork (magenta/violet beams), vignette; `text.display` title in `text.primary` with a subtle `vertical.cultural-night` glow (text-shadow ≤ 16 px, 30 %) |
| Day cards         | `radius.xl`, `bg.surface` at 70 % over the band, 1 px `accent.line`; "Day 1" `text.h3` in `accent.base`; value `text.chip-value` "TBA"                                                     |
| What's On (OD-14) | Simple list of 4 items: icon tile (`accent.soft`) + `text.title`. No images, no times.                                                                                                     |

## Venue / map container (panel 08)

| Part               | Rule                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Container          | `radius.xl`, `bg.surface`, 1 px `border.default`, aspect 16 : 9 desktop / 4 : 3 mobile                                      |
| Map art            | Abstract isometric/line campus treatment in `border.strong` / `text.disabled` tones. **No pins, labels or legend** (OD-06). |
| Status             | `text.body-sm`, `text.muted`: "Venue details coming soon."                                                                  |
| Future legend slot | Right column (desktop) / below (mobile); reserved, not rendered until official                                              |

## Footer (panel 09)

| Part            | Rule                                                                                                      |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| Container       | `bg.base`, top 1 px `border.subtle`, padding `space.section-tight`                                        |
| Brand column    | Ashwamedh logo (width 160–200), sub-line `text.label` `text.muted`, description area (placeholder, OD-07) |
| Column headings | `text.nav`, `text.primary`                                                                                |
| Links           | `text.body-sm`, `text.muted` → hover `text.primary`; row height ≥ 32 desktop, 44 touch                    |
| Contact rows    | Icon 18 `text.muted` + "TBA" `text.body-sm` `text.muted`                                                  |
| College block   | PCE logo on light plate + name (`text.label`, `text.secondary`), bottom-right                             |
| Social icons    | Hidden (OD-08). Reserved: 40 × 40 round buttons, `border.control`.                                        |

## Placeholder states

| State                               | Visual rule                                                                                                                                                                                                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **TBA** (short fact)                | Shown in the normal value slot, `text.muted`, same type style as the real value. No italics, no badge.                                                                                                                                                           |
| **Coming Soon** (content block)     | Sentence in `text.body` / `text.body-sm`, `text.muted`, inside the normal content slot. Optional 18 px clock icon (`text.muted`) before it. The block keeps its real-content min height.                                                                         |
| **Coming Soon** (status CTA, OD-12) | See _Status_ button.                                                                                                                                                                                                                                             |
| **Registration Opening Soon**       | _Disabled_ button variant in the primary CTA slot (same width/height as "Register Now").                                                                                                                                                                         |
| **Placeholder copy area** (OD-07)   | Space is reserved at the real copy's size. Phase 4 chooses between (a) a subtle 1 px `border.subtle` line of the expected width, or (b) the words "Coming Soon" in `text.label` `text.muted`. When the neighbouring element already says "Coming Soon", use (a). |
| **Image placeholder** (D5)          | Abstract per-vertical artwork ([verticals.md](verticals.md)); never a grey box, never stock photography.                                                                                                                                                         |

## Disabled states (general)

- Visual: `bg.surface-2`, dashed `border.control`, `text.muted` (≥ 6.2:1). Information stays readable.
- No hover, no pressed effect, `cursor: default`.
- Semantics: rendered as a non-interactive element with visible text. If a `<button>` is ever needed, use
  `aria-disabled="true"` and keep it in the tab order, so screen-reader users can discover why it is
  disabled.
- Never reduce opacity below 100 % for disabled text that carries information.
