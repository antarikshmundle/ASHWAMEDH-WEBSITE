# Mobile UX

Covers Phase 2 item **12**. The reference shows desktop compositions only; mobile layouts below keep the same
hierarchy and content order rather than shrinking the desktop (master prompt §15).
Breakpoint values are set in Phase 3; here "mobile" = phone portrait, "tablet" = in between.

## Principles

- Same content, same order as desktop — nothing important is desktop-only.
- Touch targets ≥ 44 × 44 px; no interaction depends on hover.
- Whole cards are tappable.
- Primary action within thumb reach on long pages (event detail).
- No horizontal page scroll; horizontal scrolling is allowed only inside clearly bounded rows (tabs, day tabs).

## Navbar

See [navigation.md §3](navigation.md#3-mobile-navigation): sticky top bar (logo per OD-13 + menu button),
full-screen overlay menu, disabled "Coming Soon" status at the bottom of the overlay (OD-12).

## Homepage

| Section                | Mobile composition                                                                                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hero                   | Logo, sub-line, tagline area, disabled "Coming Soon" CTA and "Scroll to explore" stacked and centred. Left/right word stacks collapse into one subtle line or are omitted visually (decorative only). Fits within the first screen. |
| Events overview        | Four cards in a single column (2 × 2 on tablet), fixed order. Each card fully tappable.                                                                                                                                             |
| Schedule preview       | Category rows stacked; time and venue on a second line. No day tabs (OD-04).                                                                                                                                                        |
| Cultural Night preview | Day 1 / Day 2 cards side by side (they are short).                                                                                                                                                                                  |
| Venue preview          | Abstract map + link; no pins, labels or legend (OD-06).                                                                                                                                                                             |
| Footer                 | Stacked blocks (see [navigation.md §14](navigation.md#14-footer-a-reference-panel-09)); social icons hidden (OD-08).                                                                                                                |

## Event listing

- Sidebar is replaced by a **"Jump to event"** control at the top of the list (opens a sheet with the event
  names) — keeps the reference's quick-jump function without a long sidebar.
- Cards: one column on phones, two on tablets. Image, name, **department** (OD-16; omitted for Sports),
  meta line, "View Details".

## Event detail

```
← Back to Technomedh
[ event image ]
HACKATHON
Information Technology
[Participation] [Team Size]
[Date & Time]   [Venue]
[Fee]           [Prize Pool]
[ Download Event PDF ]            ← secondary, inline
About | Rules | Eligibility | Prizes | Venue | Coordinator   ← horizontally scrollable tab bar
tab content
─────────────────────────────────
[ Registration Opening Soon ]     ← sticky bottom bar (primary CTA)
```

- Chips in a 2-column grid.
- **Primary CTA in a sticky bottom bar**, always visible while reading rules; it shows the same state as on
  desktop (Opening Soon / Register Now / Closed).
- Tab bar scrolls horizontally with the active tab kept in view; tab content below.

## Cultural Night

- Hero, Day 1 / Day 2 cards, then "What's On" as a simple stacked list (OD-14). No registration bar.

## Schedule

- Day tabs only once the official day count is confirmed (OD-04); then they scroll horizontally.
- Rows stacked: icon + title on line 1, time and venue on line 2.

## Registration flow on mobile

- "Register Now" opens the Google Form in a new tab; returning to the site keeps the user on the same event.
- No intermediate confirmation screen on the site.

## Touch interactions

- Card hover effects from desktop become pressed states on touch.
- Disabled elements ("Coming Soon", "Registration Opening Soon") have no pressed state.
- No swipe-only navigation; carousels are not used for core content.
- Respect reduced-motion settings (detailed in Phase 8).
