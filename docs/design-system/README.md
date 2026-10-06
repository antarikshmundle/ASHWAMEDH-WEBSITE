# Phase 3 — Design System

Status: **Phase 3 LOCKED** (2026-10-06). DS-01 … DS-08 approved; see [owner-review.md](owner-review.md).

This folder defines the visual system of the ASHWAMEDH 2026 website. It is **documentation only**: no CSS,
components or animation exist yet. In Phase 5, these tokens become one central file
(`src/styles/tokens.css`, Tailwind v4 `@theme`). That keeps any branding change a one-file edit.

## Inputs

| Input                                                                              | Used for                                                                       |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| [Locked UI/UX reference](../ux/reference/ashwamedh-final-ui-reference.jpg)         | Visual direction, hierarchy, colour sampling, type character, component shapes |
| [Phase 2 UX docs](../ux/README.md) and [owner decisions](../ux/owner-decisions.md) | What each component must show, and its states                                  |
| [Official logos](../../public/logos/)                                              | Logo system                                                                    |
| [Master prompt](../requirements/master-prompt-v1.md) §3, §16–§18, §20              | Design philosophy, motion, performance, accessibility, central tokens          |

Colours were **measured from the reference image** (region sampling, see [colors.md](colors.md#provenance)).
They were not invented, and they were not taken from the Ashwamedh logo.

## Documents

| #    | Topic                                               | Document                             |
| ---- | --------------------------------------------------- | ------------------------------------ |
| 1    | Colour system                                       | [colors.md](colors.md)               |
| 2    | Typography                                          | [typography.md](typography.md)       |
| 3, 8 | Spacing, layout, radius, borders, responsive tokens | [layout.md](layout.md)               |
| 4    | Component design tokens and states                  | [components.md](components.md)       |
| 5    | Visual language (below)                             | this file                            |
| 6    | Logo system                                         | [logos.md](logos.md)                 |
| 7    | Four vertical personalities                         | [verticals.md](verticals.md)         |
| 9    | Accessibility                                       | [accessibility.md](accessibility.md) |
| 10   | Motion principles                                   | [motion.md](motion.md)               |

## 5. Visual language (proposed lock)

**Cinematic + Clean UX + Futuristic Event Cards**

| Pillar                     | What it means in practice                                                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cinematic**              | Deep navy-black canvas. Light only comes from content: logo fire, card artwork, accents. The hero and Cultural Night use full-bleed atmosphere with vignettes and scrims. Large, widely tracked display type.                                   |
| **Clean UX**               | One focal point per section. Generous spacing. Body text in a plain, highly readable sans. Every page follows the same predictable structure: heading, then content, then action. Colour is used for meaning (vertical, state), not decoration. |
| **Futuristic event cards** | Crisp 1 px accent borders. Restrained edge glow. Squared-geometric uppercase titles. Icon + label rows. Dark glass-free surfaces with artwork that fades into the card body.                                                                    |

### Allowed (with limits)

| Effect          | Allowed where                                                                                         | Limit                                                                          |
| --------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Glow            | Vertical cards (border), hero "Coming Soon" ring, active nav underline, primary CTA hover/focus       | Only one glow tier (`glow.sm`/`glow.md`). Never on body text, chips or footer. |
| Gradient        | Image scrims (artwork → surface), hero/Cultural Night vignettes, subtle vertical colour wash on cards | No gradient text, no gradient buttons, no multi-hue rainbow gradients.         |
| Blur / glass    | **Sticky navbar only** (backdrop blur over scrolling content)                                         | No other glassmorphism.                                                        |
| Texture / motif | Faint per-vertical motif in card artwork and page headers ([verticals.md](verticals.md))              | ≤ 8 % opacity and never behind running text.                                   |

### Not allowed

- Visual clutter: decorative elements without a purpose, stacked badges, ornamental dividers everywhere.
- Excessive gradients, random glassmorphism, neon overload, glow on everything.
- Generic SaaS styling: pastel cards, white backgrounds, rounded-blob illustrations, dashboard widgets.
- Gaming-UI tropes: HUD frames, angular clipped corners on every element, scan-line overlays.
- Stock photography presented as Ashwamedh (D5). Reference photos are design reference only.
- Unrelated patterns: confetti, emoji decorations, mascot art.

## Token naming

```
color.bg.*         canvas and surfaces           color.text.*      text roles
color.border.*     hairlines and controls        color.accent.*    context accent (brand or vertical)
color.vertical.*   four vertical palettes        color.state.*     focus, disabled, overlay
font.*  text.*     families and type styles      space.*  size.*   spacing and layout
radius.*           corner radii                  shadow.*  glow.*  elevation and glow
motion.duration.*  motion.ease.*                 bp.*              breakpoints
```

**Context accent:** components never reference a vertical colour directly. They use `color.accent.*`,
which resolves to the **brand accent** globally, or to the **vertical accent** inside a vertical
(`data-vertical="technomedh" | "cultural" | "sports" | "cultural-night"`). One component therefore serves
all four verticals ([verticals.md](verticals.md)).

## Provisional and functional elements

The owner's official 2026 branding has not been released (master prompt §20). These tokens are swapped
centrally when it arrives, with no redesign:

- `color.accent.brand` (ember): **provisional** and reference-derived; **not** the official brand colour (DS-02).
- `color.vertical.*`: **locked as functional accents** for differentiation; they may be superseded by official
  branding (DS-03).
- Font families: **locked** (DS-01).

## Reference over consistency

The approved reference image remains the primary visual source of truth. A reference treatment is **not**
simplified for system consistency when the reference clearly uses intentional variation. Example: the
multi-colour event-detail chips (DS-07).

## Owner decisions

DS-01 … DS-08 are recorded in [owner-review.md](owner-review.md).
