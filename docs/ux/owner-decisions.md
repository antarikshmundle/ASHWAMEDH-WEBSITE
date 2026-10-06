# Owner Decisions Register

Phase 2 owner decisions. **All 16 are LOCKED (2026-10-06)** and are authoritative for UX and implementation.
They are also recorded in [../requirements/decisions-log.md](../requirements/decisions-log.md).
A locked decision changes only with explicit owner approval or when official information replaces a TBA.

## Content conflicts found in the reference

| ID    | Topic                                  | Reference shows                                                                 | Locked decision                                                                                                                                                                  |
| ----- | -------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OD-01 | "Ideathon"                             | Card + sidebar "Ideathon"                                                       | Use the official name **"Business Ideathon"** (Industrial IoT).                                                                                                                  |
| OD-02 | "Project Exhibition"                   | Card + sidebar "Project Exhibition", meta "Individual/Team"                     | Use the official name **"Project Competition"** (Electrical / E&P). Meta values TBA.                                                                                             |
| OD-03 | Hackathon description and "Team Event" | "A 24-hour coding challenge…"; chip "Team Event"; all cards "Team Event"        | `description` and `teamSize` stay `null` → "Details coming soon." / TBA until officially confirmed. Never invented.                                                              |
| OD-04 | Schedule day count                     | Day 1 – Day 4 tabs                                                              | Day count stays **TBA**. **No day tabs** until the official number of days is confirmed.                                                                                         |
| OD-05 | Schedule venue names                   | "Venue TBA", "Various Venues", "Main Stage", "Sports Ground", "Main Auditorium" | Every schedule venue = **TBA**. Reference venue names are never used.                                                                                                            |
| OD-06 | Campus map locations / pins            | 7 legend items + pins on a 3D campus                                            | **Abstract map treatment allowed**; **no** invented pins, locations, labels or legend.                                                                                           |
| OD-07 | Marketing taglines                     | See list below                                                                  | Reference taglines are **not official copy**. Their copy areas remain as approved placeholders / "Coming Soon" until official copy is approved. Reference text is never shipped. |
| OD-08 | Social icons / handles                 | Three icons in footer                                                           | Icons **hidden** until official handles are provided.                                                                                                                            |

**OD-07: copy areas covered.** Each area keeps its place in the layout. None of the reference text below is shipped.

| Area                         | Reference text (not official)                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Hero tagline                 | "Bigger events. Brighter stories."                                                                               |
| Hero right word stack        | "Compete · Create · Collaborate · Celebrate"                                                                     |
| Overview eyebrow             | "Explore the realm of"                                                                                           |
| Vertical card taglines       | "Innovate · Build · Solve", "Express · Perform · Inspire", "Play · Compete · Unite", "Music · Art · Celebration" |
| Listing tagline (Technomedh) | "Engineer today. Shape tomorrow."                                                                                |
| Event detail tagline         | "Code · Collaborate · Create" (this slot shows the confirmed **department** instead, see OD-16)                  |
| Cultural Night tagline       | "Two nights. Endless energy." (the "two nights" fact itself is confirmed)                                        |
| Campus map sub-line          | "Find your way around Ashwamedh"                                                                                 |
| Footer description           | "A celebration of talent, innovation, creativity and sportsmanship."                                             |

The visual treatment of a placeholder copy area (subtle placeholder vs. the words "Coming Soon") is set in
Phase 3. Where "Coming Soon" text would repeat a neighbouring "Coming Soon" (e.g. the hero CTA), the subtle
placeholder is used instead.

## Navigation

| ID    | Topic            | Locked decision                                                                                                                                                                                                       |
| ----- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OD-09 | Gallery and Team | **Kept in the navbar** as in the reference. `/gallery` and `/team` initially show Coming Soon states. No invented content. Footer Quick Links stay as in the reference (Team not added).                              |
| OD-10 | Campus Map       | **Not** a primary navbar item. The **Venue page (`/venue`)** is the access point, reached from the homepage Venue preview, event Venue tabs and the Contact page. Footer stays as in the reference (Venue not added). |
| OD-15 | "Events"         | **Plain link to `/events`. No dropdown.**                                                                                                                                                                             |

## Homepage and branding

| ID    | Topic                | Locked decision                                                                                                                                                                                                                                                                                             |
| ----- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OD-11 | Homepage composition | **Yes.** Homepage = Hero → Four verticals → Schedule preview → Cultural Night preview → Venue preview → Footer. No "Featured Events" section.                                                                                                                                                               |
| OD-12 | "Coming Soon" CTA    | **Non-clickable / disabled.** It is not a link and redirects nowhere. Once official dates or launch information exist, it is replaced by the appropriate active CTA for the confirmed requirement. Applies to both the navbar "Coming Soon" and the hero "Coming Soon →" (clarification locked, see below). |
| OD-13 | Logo transition      | **Approved.** Hero state: PCE logo. Sticky / inner-page navigation: Ashwamedh logo, following the reference's transition. Neither logo is recoloured, cropped or modified.                                                                                                                                  |

> **OD-12 clarification (LOCKED 2026-10-06):** The current pre-launch state is:
>
> - Hero "Coming Soon →": disabled and non-clickable
> - Navbar "Coming Soon": disabled and non-clickable
> - Hero "Scroll to explore": functional
> - No fake redirects or placeholder destinations

## Events and Cultural Night

| ID    | Topic                        | Locked decision                                                                                                                                                                                                                                                                                   |
| ----- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OD-14 | Cultural Night participation | `/cultural-night` may show a **"What's On"** section with only these confirmed components: **Group Dance · Singing · Solo Dance · Inauguration / Stage Performances**. **No public registration** by default. Registration is added only if organisers later provide an official process or form. |
| OD-16 | Department on listing cards  | **Yes.** Event cards display the department (confirmed metadata). Sports cards have no department, so the line is omitted.                                                                                                                                                                        |

## Standing imagery rule (D5)

All photorealistic imagery in the reference is **design reference only**. This covers the category
characters, event card photos, the Hackathon participant, concert crowds and the campus aerial. Until
official imagery exists, Phase 3 defines abstract/graphic placeholders per vertical. Nothing may be captioned
or presented as real Ashwamedh photography.
