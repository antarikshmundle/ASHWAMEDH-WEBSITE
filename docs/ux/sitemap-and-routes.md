# Sitemap and URL Structure

Covers Phase 2 items **1 (sitemap)** and **9 (URL / route structure)**.
Tags: **[A]** derived from reference · **[B]** confirmed · **[C]** TBA · **[OD-xx]** locked owner decision ([owner-decisions.md](owner-decisions.md)).

## 1. Sitemap

```
Home  /
│
├── Events  /events                       Four-vertical overview (reference panel 03)
│   ├── Technomedh  /technomedh           Vertical listing (panel 04) — 14 events
│   ├── Cultural    /cultural             Vertical listing — 15 events
│   ├── Sports      /sports               Vertical listing — 11 events
│   └── Event detail  /events/[slug]      One reusable template (panel 05) — 40 pages
│
├── Cultural Night  /cultural-night       Panel 07 — showcase + What's On; no registration (OD-14)
├── Schedule        /schedule             Panel 06 — "Schedule Releasing Soon"
├── Gallery         /gallery              In navbar; Coming Soon page (OD-09)
├── Team            /team                 Organising committee; Coming Soon page (OD-09)
├── About           /about                About Ashwamedh + PCE
├── Contact         /contact              Contact details (all TBA)
└── Venue / Campus  /venue                Panel 08 — access point for venue info; not in nav (OD-10)
```

| Page                | Purpose                                                              | Basis                                     |
| ------------------- | -------------------------------------------------------------------- | ----------------------------------------- |
| Home                | WOW → UNDERSTAND → EXPLORE entry                                     | [A] panels 01–03                          |
| Events overview     | Choose a vertical                                                    | [A] panel 03; target of nav item "Events" |
| Vertical listing ×3 | Browse all events of one vertical                                    | [A] panel 04                              |
| Event detail        | Everything about one event + registration                            | [A] panel 05                              |
| Cultural Night      | Two-night showcase; no per-performance pages or registration (OD-14) | [A] panel 07, [B] 2 nights                |
| Schedule            | Festival timetable                                                   | [A] panel 06, [C] all content             |
| Venue / Campus      | Find locations on campus                                             | [A] panel 08, [C] all locations           |
| Gallery             | Festival imagery                                                     | [A] nav, [C] no imagery yet, OD-09        |
| Team                | Organising committee                                                 | [A] nav, [C] committee on hold, OD-09     |
| About               | What Ashwamedh is; PCE                                               | Master prompt §10                         |
| Contact             | Official contacts                                                    | Master prompt §10, [C] all details        |
| 404                 | Recover from bad links → Home / Events                               | Standard                                  |

**Not included** (no requirement or reference basis): Featured Events page, Sponsors page, Register page,
Login, FAQ, Blog. Sponsors may be added only when official sponsors exist.

"About / Organizing Committee" from the Phase 2 brief maps to two reference nav items: **About** (festival)
and **Team** (committee).

## 9. URL / route structure

| Route                         | Page                    | Notes                                         |
| ----------------------------- | ----------------------- | --------------------------------------------- |
| `/`                           | Home                    |                                               |
| `/events`                     | Events overview         | Target of the plain "Events" nav link (OD-15) |
| `/technomedh`                 | Technomedh listing      |                                               |
| `/cultural`                   | Cultural Events listing |                                               |
| `/sports`                     | Sports listing          |                                               |
| `/events/[slug]`              | Event detail            | All verticals share one template              |
| `/cultural-night`             | Cultural Night          |                                               |
| `/schedule`                   | Schedule                |                                               |
| `/venue`                      | Venue / campus map      |                                               |
| `/gallery`                    | Gallery                 | Coming Soon state (OD-09)                     |
| `/team`                       | Organising committee    | Coming Soon state (OD-09)                     |
| `/about`                      | About                   |                                               |
| `/contact`                    | Contact                 |                                               |
| `/sitemap.xml`, `/robots.txt` | SEO                     | Phase 12                                      |

### Decisions

1. **Vertical pages at root** (`/technomedh`, not `/events/technomedh`) — short, memorable, matches the
   festival's own vocabulary on posters and social media.
2. **Event detail under `/events/[slug]`, without the vertical in the path** — event URLs stay stable
   even if an event is re-categorised; shorter links for WhatsApp sharing. The parent vertical comes from
   data and drives the "Back to Technomedh" link and nav active state.
3. **Slug rule** — lowercase kebab-case of the **official** event name; text in parentheses dropped;
   `&` → `and`. Slugs must be unique across all verticals (the current inventory has no collisions).
   If an official name changes, the old slug keeps redirecting.
4. **Registration is never a route** — "Register Now" links out to the event's official Google Form.
5. **No query-string state for core pages** — every page is statically generated and shareable.
6. This supersedes the provisional `/events/[vertical]/[slug]` route in
   [../architecture/overview.md](../architecture/overview.md).
