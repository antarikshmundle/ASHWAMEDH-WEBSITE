# 10. Motion Principles

**Principles only.** No animation is implemented in Phase 3. Implementation is Phase 8, or Phase 5 for
basic hover and focus. Motion must be smooth, cinematic, purposeful, lightweight and responsive
(master prompt §16).

## Principles

1. **Purpose first.** Every animation explains something: entering content, a state change, or a spatial
   relationship. If it explains nothing, remove it.
2. **Never block.** No animation delays navigation, scrolling or input. There is no intro/loading screen.
   The hero is usable on first paint.
3. **One moment of cinema.** The hero entrance is the only "cinematic" sequence (≤ 1.2 s total, plays once per
   page load). Everything else is quiet.
4. **No constant movement.** No looping ambient animation, particle systems, auto-playing carousels or
   marquee text in v1. Any ambient effect needs owner approval in Phase 8, must pause when off-screen, and is
   disabled under reduced motion.
5. **Cheap to render.** Animate only `transform` and `opacity` (plus `box-shadow` on hover for glow, limited to
   a few elements). No layout-affecting properties, and no animated blur on large areas.
6. **Reduced motion is a first-class mode**, not an afterthought.

## Tokens

| Token                       | Value                           | Use                                                       |
| --------------------------- | ------------------------------- | --------------------------------------------------------- |
| `motion.duration.instant`   | 100 ms                          | Pressed states, colour changes                            |
| `motion.duration.fast`      | 150 ms                          | Hover, focus, small UI feedback                           |
| `motion.duration.base`      | 240 ms                          | Logo crossfade, tab indicator, menu items                 |
| `motion.duration.slow`      | 400 ms                          | Section reveals, mobile menu open/close                   |
| `motion.duration.cinematic` | 700 ms                          | Hero entrance elements (staggered, total ≤ 1.2 s)         |
| `motion.ease.standard`      | `cubic-bezier(0.2, 0, 0, 1)`    | Default                                                   |
| `motion.ease.out`           | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances, reveals                                        |
| `motion.ease.in`            | `cubic-bezier(0.4, 0, 1, 1)`    | Exits                                                     |
| `motion.stagger`            | 60 ms                           | Between sibling items in a reveal (max 6 items staggered) |
| `motion.distance.sm` / `md` | 8 px / 20 px                    | Hover lift / reveal travel                                |

## Patterns (to implement later)

| Pattern                    | Behaviour                                                                                                        | Reduced motion            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Hero entrance              | Logo fades and rises 20 px → sub-line → status CTA, staggered, once                                              | Instant                   |
| Scroll reveals             | Sections fade and rise 20 px once when 15 % visible; never re-hide                                               | Instant, or 150 ms fade   |
| Logo transition (OD-13)    | Crossfade between the PCE block and the Ashwamedh block, `base` duration, when the hero logo leaves the viewport | Instant swap              |
| Navbar state               | Background and blur fade in with the sticky state                                                                | Instant                   |
| Card hover                 | Lift 2–4 px + glow tier change, `fast`                                                                           | Glow change only, no lift |
| Tabs                       | Indicator slides between tabs, `base`                                                                            | Indicator jumps           |
| Mobile menu                | Overlay fade + items fade in, `slow`                                                                             | Fade ≤ 150 ms             |
| Page transitions           | Optional ≤ 200 ms fade; never delays route change                                                                | None                      |
| Parallax                   | At most one subtle layer in the hero/Cultural Night background (≤ 10 % speed difference), desktop only           | None                      |
| Status / disabled elements | **No motion** (no pulsing "Coming Soon")                                                                         | —                         |

Per-vertical hover character is defined in [verticals.md](verticals.md#matrix). It always stays within these
tokens.

## Implementation (Phase 8)

CSS only — no animation library, no scroll listeners, no `requestAnimationFrame`, no timers. Easings live in
`src/styles/tokens.css`; transitions without an explicit easing default to `ease.standard`. Durations use
the token values directly (`duration-150` = fast, `duration-240` = base, 400 ms = slow, 700 ms =
cinematic).

| Pattern                 | Implemented behaviour                                                                                                             | Reduced motion                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Hero entrance           | `enter-rise` / `enter-fade`: logo → fest line → tagline → status, 120 ms steps; side stacks + cue at 480 ms; ≈ 1.2 s              | Not run — final state immediately               |
| Logo transition (OD-13) | 240 ms opacity crossfade                                                                                                          | Instant swap                                    |
| Navbar state            | Background, border and blur change over 240 ms                                                                                    | Instant                                         |
| Card hover              | Vertical: 4 px lift + glow tier + art `scale(1.03)`; event: 2 px lift + border + shadow; 150 ms                                   | Glow / border / shadow only — no lift, no scale |
| Keyboard focus          | Cards, schedule rows and buttons get their hover glow / border on `:focus-visible` (never the lift), plus the 2 px focus ring     | Same                                            |
| Press                   | Primary button `scale(0.98)`                                                                                                      | No scale                                        |
| Arrow / chevron nudges  | 2–4 px on hover, 150 ms                                                                                                           | None                                            |
| Tabs                    | Indicator crossfade (240 ms) — approved; no sliding indicator                                                                     | Instant                                         |
| Mobile menu             | Overlay fade 400 ms on a solid background (blur removed); items rise 8 px over 240 ms, 60 ms stagger capped at 5 steps (≤ 540 ms) | Not run — items shown immediately               |

- Hover styles apply only on devices that can hover (Tailwind wraps `hover:` in `@media (hover: hover)`);
  touch devices get no sticky hover.
- Every hover / press / focus transform is written `motion-safe:…`; `tests/unit/motion.test.tsx` fails if
  one is added without it, and checks that every entrance utility is switched off under reduced motion.
- Vertical-card art zoom: kept after an A/B frame measurement (Phase 8.2, 1440 / 1024 / 768 px, 4× and 6×
  CPU) showed no consistent cost over the variant without it; no `will-change` added.

Intentional exceptions (not continuous motion):

1. **Header compact state** — from 1280 px the bar goes from 80 px to 72 px tall over 240 ms when the hero
   logo scrolls away (a height transition on one fixed element, once per crossing), with the background /
   blur fade above.
2. **Hero entrance** — the one cinematic sequence. It plays once per page load and again when the homepage is
   re-entered through client-side navigation; it never blocks input or scrolling.

Deferred to a later Advanced Interaction Pass (not rejected): scroll reveals, scroll-linked effects,
parallax, cursor-follow / ambient cursor light, magnetic buttons, card tilt / 3D hover, page transitions.
A cursor or ambient effect should be added as one isolated client layer (e.g. a decorative overlay driven by
CSS custom properties) so existing components do not need rewriting.

## Performance budget

- Motion library code is loaded only where needed, using lazy/feature bundles in Phase 5/8.
- No animation runs during initial paint other than the hero entrance.
- Target 60 fps on a mid-range Android phone. Anything that drops frames is removed, not optimised later.
