# 1. Colour System

All values are **dark-theme only**. The reference is fully dark, and there is no light mode in scope.
Contrast ratios are WCAG 2.x values, computed against the listed background.

## Provenance

Values were measured from the locked reference image (region averages and peak-chroma sampling,
2026-10-06). Tokens round the measured values to clean steps and adjust them only where accessibility
requires it.

| Reference sample                          | Measured                        | Token                        |
| ----------------------------------------- | ------------------------------- | ---------------------------- |
| Page gutter / footer / panel backgrounds  | `#03050A` – `#040E1A`           | `bg.base`, `bg.raised`       |
| Event card body, schedule rows            | `#041322`, `#070F17`            | `bg.surface`                 |
| Inactive schedule day                     | `#0B171F`                       | `bg.surface-2`               |
| Active schedule day / sidebar active item | `#152C3E`                       | `bg.surface-3`               |
| Headings, schedule titles                 | `#DCE3F0` – `#F9F8F5`           | `text.primary`               |
| Body copy                                 | `#BFC4CF`                       | `text.secondary`             |
| Metadata, "TBA – TBA", footer links       | `#8A97A9` – `#9DACC0`           | `text.muted`                 |
| Technomedh card                           | `#52BBEB`                       | `vertical.technomedh`        |
| Register Now fill                         | `#17A6FC`                       | `vertical.technomedh-strong` |
| Cultural card                             | `#EFAC49`                       | `vertical.cultural`          |
| Sports card                               | `#3BD5B5`                       | `vertical.sports`            |
| Cultural Night card / icon                | `#C05ECA`, `#B95DCD`            | `vertical.cultural-night`    |
| Hero CTA ring, overview title, nav CTA    | `#B75933`, `#EA9E37`, `#A0693E` | `accent.brand` (ember)       |

**The Ashwamedh logo was not used as a colour source.** The ember brand accent comes from the reference UI
(hero CTA and section title). It is one replaceable, **provisional** token (DS-02), and the rest of the
palette does not depend on it.

## Background and surfaces

| Token                | Value             | Use                                                                |
| -------------------- | ----------------- | ------------------------------------------------------------------ |
| `color.bg.base`      | `#03060B`         | Page canvas, footer                                                |
| `color.bg.raised`    | `#060C15`         | Sticky navbar base (with blur), alternating section band if needed |
| `color.bg.surface`   | `#08121D`         | Cards, panels, event detail header block                           |
| `color.bg.surface-2` | `#0C1824`         | Schedule rows, inactive tabs/days, chips, disabled controls        |
| `color.bg.surface-3` | `#142A3C`         | Selected/active states (active day, active sidebar item)           |
| `color.bg.overlay`   | `#03060B` at 72 % | Mobile menu overlay, image scrims (end stop)                       |
| `color.bg.plate`     | `#F2F5FA`         | Light plate behind the PCE logo only ([logos.md](logos.md))        |

## Borders

| Token                  | Value     | Contrast vs base             | Use                                                                                                                               |
| ---------------------- | --------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `color.border.subtle`  | `#16222F` | 1.26                         | Dividers, panel edges (decorative)                                                                                                |
| `color.border.default` | `#243446` | 1.60                         | Card and row outlines (decorative; the card is identified by its content)                                                         |
| `color.border.strong`  | `#3A4D63` | 2.34                         | Emphasised separators, tab bar baseline                                                                                           |
| `color.border.control` | `#56708C` | **3.95** (3.49 on surface-2) | Outlines that **identify** an interactive or disabled control (secondary buttons, disabled CTAs, menu button). Meets WCAG 1.4.11. |

## Text

| Token                  | Value     | on base | on surface | on surface-3 | Use                                                                                                    |
| ---------------------- | --------- | ------- | ---------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| `color.text.primary`   | `#F2F5FA` | 18.57   | 17.24      | 13.47        | Headings, titles, button labels, chip values                                                           |
| `color.text.secondary` | `#BEC6D3` | 11.80   | 10.95      | 8.56         | Body copy, nav items (idle)                                                                            |
| `color.text.muted`     | `#8D99AB` | 7.03    | 6.53       | 5.10         | Metadata, chip labels, footer links, **all TBA / Coming Soon / Registration Opening Soon text**        |
| `color.text.disabled`  | `#5E6A7C` | 3.70    | 3.43       | 2.68         | Decorative / non-informative only (e.g. inactive glyphs). **Never for text that carries information.** |
| `color.text.on-accent` | `#03060B` | —       | —          | —            | Text and icons on any accent fill                                                                      |

## Accent system

### Context accent (what components use)

| Token                 | Global (brand)        | Inside a vertical                                 |
| --------------------- | --------------------- | ------------------------------------------------- |
| `color.accent.base`   | `accent.brand`        | `vertical.<name>`                                 |
| `color.accent.strong` | `accent.brand-strong` | `vertical.<name>-strong`                          |
| `color.accent.soft`   | brand at 12 %         | vertical at 12 % (tinted backgrounds, icon tiles) |
| `color.accent.line`   | brand at 55 %         | vertical at 55 % (card borders, outlined buttons) |
| `color.accent.glow`   | brand at 28 %         | vertical at 28 % (glow shadows only)              |

### Brand accent: ember (PROVISIONAL, DS-02)

> Ember `#F08A3C` is a **provisional, reference-derived** accent. It is **not** the official ASHWAMEDH brand
> colour. When official 2026 branding is provided, only these token values change; the system needs no
> redesign.

| Token                       | Value     | on base | Dark text on fill | White text on fill |
| --------------------------- | --------- | ------- | ----------------- | ------------------ |
| `color.accent.brand`        | `#F08A3C` | 8.12    | 8.12              | 2.50 ✗             |
| `color.accent.brand-strong` | `#E2672A` | 6.00    | 6.00              | 3.38 ✗             |

The brand accent is used for global UI only: the active nav underline, the "Coming Soon" status rings,
homepage section titles and focusable global CTAs (later). On vertical pages it appears **only** in the
navbar, so it never competes with the vertical accent.

### Four vertical accents (functional, DS-03)

> These are **locked as functional accents**: they exist so each vertical can be told apart. They may be
> **superseded by the official 2026 branding system** when it is provided. If that happens, only the token
> values change, and components stay untouched.

| Vertical       | `base`    | `strong`  | on base      | Dark text on fill | Note                                                       |
| -------------- | --------- | --------- | ------------ | ----------------- | ---------------------------------------------------------- |
| Technomedh     | `#4FB8EC` | `#17A6FC` | 9.08 / 7.63  | 9.08 / 7.63       | Cool sky-cyan                                              |
| Cultural       | `#F2B347` | `#E89A2C` | 10.93 / 8.78 | 10.93 / 8.78      | Saffron-gold. More yellow than ember (hue ≈ 38° vs ≈ 26°). |
| Sports         | `#3BD5B5` | `#1FBF9C` | 10.99 / 8.69 | 10.99 / 8.69      | Teal-green                                                 |
| Cultural Night | `#C964D4` | `#B44FC2` | 6.05 / 4.68  | 6.05 / 4.68       | Magenta-violet                                             |

**Rule:** text on any accent fill is **always `text.on-accent` (dark)**. White on accent fails contrast for
every accent (1.85 – 3.38).

**Brand vs Cultural.** Ember and saffron-gold are close (1.35:1 to each other). They are separated by hue
and by context: Cultural pages use gold, global UI uses ember, and both never appear as adjacent fills.
Both values are provisional/functional (DS-02, DS-03), so official branding may resolve this.

## Chip palette (DS-07)

The event-detail chips follow the reference: **differentiated, multi-colour icons**. Each field has a fixed
tone, and that tone is the **same in every vertical**. In the reference, a Technomedh event (Hackathon)
shows gold and indigo chips, not the blue vertical accent. Chips therefore **do not** use the context
accent.

Values were measured from the reference chips (icon / tile) and adjusted for contrast.

| Token group         | Icon      | Tile      | Icon on tile | Icon on surface | Chips                           |
| ------------------- | --------- | --------- | ------------ | --------------- | ------------------------------- |
| `color.chip.warm`   | `#F2B347` | `#3A2208` | 8.01         | 10.15           | Participation, Registration Fee |
| `color.chip.field`  | `#E6CF5C` | `#1C2A14` | 9.67         | 12.06           | Date & Time, Venue              |
| `color.chip.people` | `#A99BFF` | `#1E1D63` | 6.25         | 7.91            | Team Size                       |

- Only these three tones exist. No other chip colours may be introduced.
- Tiles are decorative (≈ 1.25 : 1 against the surface). The icon is always paired with a visible label.
- `chip.warm` shares its icon value with the Cultural accent, but it is a separate token. If official
  branding changes the Cultural accent, chips are unaffected (and vice versa).
- The reference shows the Venue icon with almost no tile. That treatment is kept: Venue uses
  `chip.field` with the tile at 40 % (see [components.md](components.md#chips)).

## CTA colours

| CTA                                                                                        | Background      | Border                                        | Label            | Hover / focus                  |
| ------------------------------------------------------------------------------------------ | --------------- | --------------------------------------------- | ---------------- | ------------------------------ |
| Primary (e.g. Register Now)                                                                | `accent.strong` | none                                          | `text.on-accent` | `accent.base` fill + `glow.sm` |
| Secondary (e.g. View Guidelines PDF)                                                       | transparent     | `border.control` → `accent.line` on hover     | `text.primary`   | border `accent.base`           |
| Tertiary (text links with arrow)                                                           | none            | none                                          | `accent.base`    | underline + arrow shift        |
| Status: "Coming Soon" (OD-12)                                                              | transparent     | `accent.line` (brand) + `glow.sm` (hero only) | `text.primary`   | **none** (non-interactive)     |
| Disabled: "Registration Opening Soon", "Guidelines PDF Coming Soon", "Registration Closed" | `bg.surface-2`  | `border.control` (dashed)                     | `text.muted`     | **none**                       |

## States

| Token                         | Value                                    | Use                                                                               |
| ----------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| `color.state.focus`           | `#F2F5FA`                                | Focus ring: 2 px solid, 2 px offset. 18.6:1 on base. Identical in every vertical. |
| `color.state.focus-halo`      | `#03060B`                                | Outer halo when the focus ring sits on the light PCE plate                        |
| `color.state.hover-overlay`   | `#FFFFFF` at 4 %                         | Hover tint on rows and list items                                                 |
| `color.state.pressed-overlay` | `#FFFFFF` at 8 %                         | Pressed tint (touch)                                                              |
| `color.state.selected`        | `bg.surface-3` + `accent.base` indicator | Active tab, active day, active sidebar item                                       |

No success, error or warning palette is defined. The site has no forms or transactional feedback
(registration happens on Google Forms). Add one only when a real requirement appears.

## Accessibility summary

- All informational text meets **AA (≥ 4.5:1)** on every surface. Primary and secondary text also meet **AAA (≥ 7:1)**.
- Accent colours used as text or icons meet ≥ 4.5:1 on `base` and `surface`. On `surface-3`, Cultural Night
  (4.39) is used only for icons or large text (≥ 3:1).
- Control boundaries use `border.control` (≥ 3:1).
- Colour is never the only signal. Verticals always carry their name and icon, and active states add an
  indicator bar plus `aria-current` / `aria-selected`.
