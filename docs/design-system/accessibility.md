# 9. Accessibility

Target: **WCAG 2.2 AA** across the site. Contrast numbers are in [colors.md](colors.md).

## Contrast

| Element                                       | Requirement                      | How the system meets it                                                                    |
| --------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| Body and informational text                   | ≥ 4.5 : 1                        | `text.primary` 17–18.6, `text.secondary` 8.6–11.8, `text.muted` 5.1–7.0 on all surfaces    |
| Large text (≥ 24 px, or ≥ 18.66 px bold)      | ≥ 3 : 1                          | All accents ≥ 4.39 on every surface                                                        |
| Text on accent fills                          | ≥ 4.5 : 1                        | Always dark `text.on-accent`: 4.68–10.99. White on accent is forbidden.                    |
| UI component boundaries (controls)            | ≥ 3 : 1                          | `border.control` 3.49–3.95                                                                 |
| Focus indicator                               | ≥ 3 : 1 against adjacent colours | `state.focus` `#F2F5FA`: 13.5–18.6                                                         |
| PCE logo                                      | Legible                          | Always on a light plate (9.0 : 1)                                                          |
| TBA / Coming Soon / Registration Opening Soon | Readable (informational)         | `text.muted` ≥ 5.1, never `text.disabled`                                                  |
| Text over imagery                             | ≥ 4.5 : 1                        | A scrim behind the text area (`bg.overlay`). Artwork never sits directly behind body text. |

## Focus states

- Every interactive element shows a **visible focus ring on `:focus-visible`**: 2 px solid `state.focus`,
  2 px offset, following the element's radius.
- On the light PCE plate, add a 2 px `state.focus-halo` outer ring.
- Focus is never removed (`outline: none` without a replacement is forbidden).
- Focus order follows visual order. The skip link "Skip to content" comes first.
- Sticky header and bottom bars must not hide a focused element (`scroll-padding-top` = nav height + 16;
  `scroll-padding-bottom` = bottom bar height on mobile).

## Reduced motion

- With `prefers-reduced-motion: reduce`:
  - No parallax, translate, scale, auto-scrolling or background motion.
  - Reveals become an instant appearance or a fade of ≤ 150 ms.
  - The logo transition becomes an instant swap.
- No content depends on motion to be understood or reached.
- Details: [motion.md](motion.md).

## Touch targets

- Minimum **44 × 44 px** for every interactive element. This is the WCAG 2.2 enhanced level, chosen for a
  mobile-first student audience. A visual element can be smaller if its hit area is padded.
- At least 8 px between adjacent targets.
- The mobile sticky CTA bar respects the safe area (`env(safe-area-inset-bottom)`).

## Readable text

- Body text 16 px minimum, line height 1.65, max 72 ch.
- Rajdhani only at ≥ 14 px and weight ≥ 500. Running text always uses Inter.
- Uppercase is applied through styling, never typed into the content.
- Text resizes to 200 % without loss of content or horizontal scroll (fluid `clamp` in rem).
- No text embedded in images, except the official logos (which have alt text).

## Disabled and status states

| Case                                                                        | Rule                                                                                                                                          |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| "Coming Soon" status (OD-12)                                                | Non-interactive element with visible text; not in the tab order; screen readers read "Coming Soon". It does not use `role="button"`.          |
| "Registration Opening Soon", "Event PDF Coming Soon", "Registration Closed" | Visible text in `text.muted` (≥ 6.2 : 1). If rendered as a `<button>`, use `aria-disabled="true"` (not `disabled`), so it stays discoverable. |
| Disabled appearance                                                         | Dashed `border.control` + muted text. **Never only reduced opacity.**                                                                         |

## Non-colour cues

- The active nav item has an underline indicator plus `aria-current="page"`.
- Active tab and day have an indicator bar plus `aria-selected`.
- Verticals always show their name and icon.
- Links inside body text are underlined.

## Images and icons

- Logos: `alt="ASHWAMEDH 2026"` (the hero `h1` logo) and `alt="Priyadarshini College of Engineering, Nagpur"`
  (PCE). The sticky-nav Ashwamedh logo link has the accessible name "ASHWAMEDH 2026, home".
- Abstract artwork and decorative icons: `alt=""` / `aria-hidden="true"`.
- Icons that carry meaning (chip icons) are paired with a visible text label. Chip icons reach 6.25–12.06 : 1
  against their tiles (DS-07).
