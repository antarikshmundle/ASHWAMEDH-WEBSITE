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

## Performance budget

- Motion library code is loaded only where needed, using lazy/feature bundles in Phase 5/8.
- No animation runs during initial paint other than the hero entrance.
- Target 60 fps on a mid-range Android phone. Anything that drops frames is removed, not optimised later.
