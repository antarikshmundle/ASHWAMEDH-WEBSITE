# 7. Four Vertical Visual Personalities

**One brand, four personalities.** All four verticals share the same canvas, typography, spacing, radius,
components and layouts. Only these **five things** change per vertical:

1. Accent colour (`color.accent.*` via `data-vertical`)
2. Icon
3. Abstract artwork motif (placeholders, headers, card art)
4. Motif texture in page headers (≤ 8 % opacity)
5. Motion character: small differences in easing and hover (within the shared [motion rules](motion.md))

Nothing else may vary. There are no per-vertical fonts, layouts, radii or component shapes.

## Matrix

|                              | **Technomedh**                                          | **Cultural**                                  | **Sports**                                       | **Cultural Night**                              |
| ---------------------------- | ------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| Personality                  | Futuristic · technical · intelligent · competitive      | Artistic · expressive · creative              | Energetic · competitive · dynamic                | Cinematic · nightlife · stage performance       |
| `data-vertical`              | `technomedh`                                            | `cultural`                                    | `sports`                                         | `cultural-night`                                |
| Accent `base` / `strong`     | `#4FB8EC` / `#17A6FC` (sky-cyan)                        | `#F2B347` / `#E89A2C` (saffron-gold)          | `#3BD5B5` / `#1FBF9C` (teal-green)               | `#C964D4` / `#B44FC2` (magenta-violet)          |
| Icon (Lucide, 1.5 px stroke) | `Settings` / `Cpu` (gear, as in the reference)          | `Palette`                                     | `Trophy`                                         | `Music`                                         |
| Artwork motif                | Circuit traces, fine grid, node points, blueprint lines | Brush strokes, ink washes, paper-grain fibres | Diagonal speed streaks, track lines, motion arcs | Stage light beams, haze, bokeh, spotlight cones |
| Composition energy           | Orthogonal, precise, symmetrical                        | Organic, flowing curves                       | Diagonal (≈ 20–30°), forward-leaning             | Vertical beams from top, deep vignette          |
| Header texture               | Grid at 4 %                                             | Paper grain at 6 %                            | Diagonal hatch at 4 %                            | Soft beams at 8 %                               |
| Hover character              | Crisp: 150 ms, linear-out glow                          | Soft: 240 ms, gentle ease                     | Snappy: 150 ms, slight overshoot (≤ 2 %)         | Slow bloom: 320 ms glow fade-in                 |

> **Functional accents (DS-03):** the four vertical colours are locked for functional differentiation. They may be
> superseded by the official 2026 branding system; only token values would change.

## Where the vertical theme applies

| Surface                                                                 | Theme                                                                                 |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Homepage vertical cards                                                 | Each card carries its own vertical theme                                              |
| `/technomedh`, `/cultural`, `/sports` + their event detail pages        | Whole page content area (`data-vertical` on `<main>`)                                 |
| `/cultural-night`                                                       | Cultural Night theme                                                                  |
| Schedule rows                                                           | Each row carries its own vertical's icon tile colour                                  |
| Event-detail chips                                                      | **Not themed.** Chips use the fixed chip palette (DS-07), identical in every vertical |
| Navbar, footer, homepage hero, Schedule/Venue/About/Contact page chrome | **Brand** accent (global)                                                             |

## Artwork placeholders (D5)

Until official imagery exists, every image slot shows **abstract, generated-in-code or vector artwork**
built from the vertical's motif and accent on `bg.base`/`bg.surface`:

- No people, faces, crowds, robots, rockets, stages or venues. These would read as real Ashwamedh photos.
- No stock photography, and no AI-photoreal images.
- Per vertical: one card artwork, one header band, one generic event-image placeholder. Event cards in a
  vertical may vary the placeholder by offset or rotation of the same motif, so the grid does not look
  identical.
- Artwork is decorative (`alt=""` / `aria-hidden`).
- Production of the artwork happens in Phase 4. Phase 3 only defines these rules.

## Coherence checks (every vertical page must pass)

- Same navbar and footer, in brand colours.
- Same type styles and sizes.
- Accent used only through `accent.*` tokens. No hard-coded vertical hex values in components.
- Glow and gradient limits from the [visual language](README.md#5-visual-language-proposed-lock).
- The vertical is identifiable by name and icon without relying on colour.
