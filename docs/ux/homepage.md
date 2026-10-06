# Homepage Information Hierarchy

Covers Phase 2 item **4**. Philosophy: **WOW → UNDERSTAND → EXPLORE**.
Tags: **[A]** reference · **[B]** confirmed · **[C]** TBA · **[OD-xx]** locked owner decision
([owner-decisions.md](owner-decisions.md)).

## Section order (locked: OD-11)

| #   | Section                         | Reference          | Role                                                     | Status     |
| --- | ------------------------------- | ------------------ | -------------------------------------------------------- | ---------- |
| H1  | Cinematic hero                  | Panel 01           | **WOW**: identity, atmosphere                            | [A]        |
| H2  | Events overview, four verticals | Panel 03           | **UNDERSTAND** what Ashwamedh contains, then **EXPLORE** | [A]        |
| H3  | Schedule preview                | Panel 06 (compact) | Where/when; currently "Schedule Releasing Soon"          | [A], OD-11 |
| H4  | Cultural Night preview          | Panel 07 (compact) | The two-night headline experience                        | [A], OD-11 |
| H5  | Venue / campus preview          | Panel 08 (compact) | Orientation on campus                                    | [A], OD-11 |
| —   | Footer                          | Panel 09           | Wayfinding and college branding                          | [A]        |

**Not on the homepage:**

- **"Featured Events" / "Upcoming Events"**: there is no reference panel for it, and nothing is "upcoming"
  without dates (D4, OD-11).
- Sponsors, gallery strip, team, stats/counters, countdown: none of these are in the reference.

## H1 — Cinematic hero (panel 01)

| Element               | Content                                                                                                                                                                          | Status                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Navbar (hero state)   | PCE logo + name, nav items, disabled "Coming Soon" CTA                                                                                                                           | [A], OD-12, OD-13            |
| Main mark             | Ashwamedh logo, large, centred, unaltered                                                                                                                                        | [B] asset, OD-13             |
| Page heading (`h1`)   | Accessible name **"ASHWAMEDH 2026"**. The logo carries it visually. "2026" must still be present for SEO and screen readers, even though the reference artwork does not show it. | [B]; presentation in Phase 3 |
| Sub-line              | "PCE's Flagship Annual Fest"                                                                                                                                                     | [B]                          |
| Tagline area          | Placeholder copy area (reference text not used)                                                                                                                                  | OD-07                        |
| Left word stack       | Technomedh · Cultural · Sports · Cultural Night. A decorative echo of the verticals, hidden from screen readers; the real links are in H2.                                       | [B] names, [A] decorative    |
| Right word stack area | Placeholder copy area (reference text not used)                                                                                                                                  | OD-07                        |
| Hero CTA              | "Coming Soon →", **disabled and non-clickable**                                                                                                                                  | OD-12                        |
| Scroll cue            | "Scroll to explore", jumps to H2. This is the active action in the hero.                                                                                                         | [A]                          |
| Background            | Campus silhouette, fire/ember atmosphere, crowd. Design reference only: abstract/graphic treatment until official imagery exists.                                                | D5                           |

## H2 — Events overview (panel 03)

| Element        | Content                                                            | Status |
| -------------- | ------------------------------------------------------------------ | ------ |
| Eyebrow area   | Placeholder copy area                                              | OD-07  |
| Heading (`h2`) | "ASHWAMEDH"                                                        | [B]    |
| Cards          | Four, fixed order: Technomedh → Cultural → Sports → Cultural Night | [A]    |

Each card shows: artwork · vertical name · tagline area (OD-07) · link label · icon.

| Card           | Link label       | Destination       |
| -------------- | ---------------- | ----------------- |
| Technomedh     | Explore Events → | `/technomedh`     |
| Cultural       | Explore Events → | `/cultural`       |
| Sports         | Explore Events → | `/sports`         |
| Cultural Night | Explore →        | `/cultural-night` |

- The whole card is one link, which gives a large touch target.
- The character artwork (robot, dancer, athlete, concert) is design reference only. Phase 3 replaces it
  with abstract per-vertical artwork (D5).
- No event counts or dates on cards, because the reference shows none.

## H3 — Schedule preview (compact panel 06)

- Heading "Event Schedule", with the status line **"Schedule Releasing Soon"** (D4).
- Category rows in the reference order: Inauguration Ceremony · Technomedh Events · Cultural Events ·
  Sports Events · Cultural Night.
  - Each row shows time **TBA** and venue **TBA**.
  - The row titles are confirmed festival components [B].
  - The reference venue names are never used (OD-05).
- **No day tabs** (OD-04).
- Link: "View Schedule →" to `/schedule`.

## H4 — Cultural Night preview (compact panel 07)

- Heading "Cultural Night", followed by a tagline area (OD-07). The "two nights" fact itself is confirmed [B].
- Two day cards: **Day 1 — TBA** and **Day 2 — TBA**.
- Link: "Explore Cultural Night →" to `/cultural-night`.

## H5 — Venue / campus preview (compact panel 08)

- Heading "Campus Map", followed by a sub-line area (OD-07).
- Abstract campus graphic with **no pins, locations, labels or legend** (OD-06).
- Status "Venue details coming soon." and link "View Campus Map →" to `/venue`. This is a main
  access point to the Venue page (OD-10).

## Heading outline

```
h1  ASHWAMEDH 2026                (hero)
h2  ASHWAMEDH — events overview   (cards use h3 for vertical names)
h2  Event Schedule
h2  Cultural Night
h2  Campus Map
    footer (no headings required beyond group labels)
```
