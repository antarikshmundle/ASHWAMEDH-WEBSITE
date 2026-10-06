# 6. Logo System

Two logos are in use. Both are used **exactly as supplied**: no recolouring, cropping into the artwork,
distortion, redrawing, effects on the artwork, or re-typesetting.

| Logo      | File                              | Canvas                 | Visible artwork                     | Status                                                   |
| --------- | --------------------------------- | ---------------------- | ----------------------------------- | -------------------------------------------------------- |
| ASHWAMEDH | `public/logos/ashwamedh-logo.png` | 450 × 450, transparent | **406 × 196** (x 25–430, y 148–343) | Reference asset; colours are **not** the website palette |
| PCE       | `public/logos/pce-logo.png`       | 506 × 353, transparent | 495 × 347                           | Official college logo                                    |

Measured 2026-10-06 from the PNG alpha channel.

## Placement by state (OD-13)

| State                                                       | Navbar logo block                                                             | Elsewhere                                                         |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Homepage hero** (top, before scroll)                      | PCE logo on a light plate + typeset "PRIYADARSHINI COLLEGE OF ENGG. / NAGPUR" | Large Ashwamedh logo, centred in the hero                         |
| **Sticky navbar** (after the hero logo leaves the viewport) | Ashwamedh logo + "PCE's flagship annual fest"                                 | —                                                                 |
| **Inner pages**                                             | Ashwamedh logo (sticky state from load)                                       | PCE logo in the footer                                            |
| **Footer** (every page)                                     | —                                                                             | Ashwamedh logo (brand column) + PCE logo on plate (college block) |

Transition: a crossfade between the two logo blocks ([motion.md](motion.md)). Both logos never appear
together in the navbar.

## PCE logo treatment

- The logo is deep blue (`#004090`), which reaches only **2.06 : 1** on `bg.base` and is unreadable on dark.
  It is therefore **always placed on a light plate** (`color.bg.plate` `#F2F5FA`, giving 9.0 : 1).
  **Locked (DS-04):** the plate is approved, and the PCE logo itself stays **completely unmodified**.
- Plate: `radius.md`, padding ≥ 8 % of the logo width (min 4 px), no border, no shadow, no tint. The plate is a
  container; the logo artwork itself is untouched.
- Sizes: navbar hero state height **44 px** desktop / **36 px** mobile; footer **56 px**. **Minimum 32 px**
  height. Below that the gear and book detail break down. The typeset college name beside it carries
  legibility at small sizes.
- Clear space: ≥ 25 % of the logo height on all sides of the plate.

## ASHWAMEDH logo treatment

- Shown directly on dark backgrounds, with **no plate**. The fire colours read well on `bg.base`; the black
  outline strokes in the artwork merge into the dark background, and the reference shows the same.
- Sizes (artwork width, not canvas width):
  - Navbar sticky: **150 px** desktop / **120 px** mobile (minimum 112 px; below that the wordmark breaks).
  - Footer: **160 – 200 px**.
  - Hero: requires the high-resolution asset (DS-06, below).
- Clear space: ≥ 25 % of the artwork height.
- No glow, drop shadow, outline or animation **applied to the artwork**. Atmosphere (embers, light) belongs to the
  background behind it.

### Resolution requirement (DS-06)

**Status: REQUIRED DEPENDENCY for the final large hero logo, not yet provided.** Phase 4 development is **not** blocked (owner clarification, 2026-10-06).

The current artwork is only **406 px** wide. A 2× (retina) display shows it sharply only up to **≈ 203 CSS px**.
The reference hero shows the logo at ≈ 45 % of the hero width (≈ 600 CSS px on a 1440 px screen). That would
need ≈ 1200 px of artwork, about 3× the current file.

| Rule                          | Detail                                                                                                                                                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Required asset                | An **official high-resolution Ashwamedh logo**: **SVG preferred**, otherwise a PNG wide enough for the largest display size at 2× (≥ 2000 px artwork width recommended). It must be supplied by the owner/organisers; it must not be redrawn by us.                                                     |
| Blocks                        | **Only the final large hero logo treatment.** The hero must not ship to production with the current file at reference size. All other Phase 4 work proceeds.                                                                                                                                            |
| Forbidden                     | Upscaling the current file (image editors, AI upscalers, vectorising/tracing), or using any artificially enlarged version as a production asset.                                                                                                                                                        |
| Allowed with current file     | Any use **within its native sharpness limit**: rendered width × device pixel ratio ≤ 406 px, designed for 2× screens as **≤ 203 CSS px**. This covers the navbar sticky (120–150 px) and footer (160–200 px), which are final-quality with the existing asset.                                          |
| Hero before the asset arrives | Phase 4 builds the hero normally. The logo renders at **≤ 203 CSS px** (within native sharpness), and the layout reserves the reference size so the official file drops in without layout change. The large hero logo is marked **pending** until the asset arrives; the hero is otherwise not blocked. |

### Transparent whitespace (DS-05, approved)

The canvas has 254 px of empty transparent space above and below the artwork. Used as-is, a 48 px-tall navbar
logo would render the artwork only ≈ 21 px tall.

- **Approved:** a layout copy trimmed to the **fully transparent** margins only (450 × 450 → 406 × 196).
  This is **not** cropping. No artwork pixel is altered, recoloured, distorted or removed.
- The original file stays untouched in `public/logos/`. The trimmed copy is created in Phase 5 alongside it
  (e.g. `ashwamedh-logo-trimmed.png`), and the trim is verified by an alpha-channel check: only pixels with
  alpha = 0 may be removed.
- The same rule applies to the future high-resolution file if it also has empty margins.

## Never

- Recolour (including making a mono/white version) without an official variant.
- Crop into, stretch, skew, rotate or rearrange the horse and the wordmark.
- Place the PCE logo directly on dark backgrounds.
- Place either logo over busy imagery without a scrim.
- Typeset "ashwamedh" in a font to imitate the wordmark.
- Use the reference image's rendering of the logos as source files.
- Upscale, AI-enlarge, trace or vectorise the current Ashwamedh logo, or display it beyond its native sharpness limit (DS-06).
- Trim anything other than fully transparent pixels (DS-05).
