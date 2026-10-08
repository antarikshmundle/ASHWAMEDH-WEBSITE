# Official Content Status

Official information is released gradually after the event date is finalized.
Nothing in this table may be invented — unknown values stay `null` in data and render as TBA / Coming Soon.

| Content                                          | Status                                                                                                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event inventory (names, departments)             | 🟢 Available — see [master prompt §6](../requirements/master-prompt-v1.md)                                                                                |
| Official event date                              | ⚫ Not finalized                                                                                                                                          |
| Event descriptions                               | ⚫ On hold                                                                                                                                                |
| Official event PDFs                              | ⚫ On hold                                                                                                                                                |
| Rules / eligibility / team size                  | ⚫ On hold                                                                                                                                                |
| Dates / timings / venues                         | ⚫ On hold                                                                                                                                                |
| Registration fees                                | ⚫ On hold                                                                                                                                                |
| Coordinators                                     | ⚫ On hold                                                                                                                                                |
| Google Forms                                     | ⚫ On hold                                                                                                                                                |
| Organising committee                             | ⚫ On hold                                                                                                                                                |
| Official contact details                         | ⚫ On hold                                                                                                                                                |
| Sponsors                                         | ⚫ On hold                                                                                                                                                |
| Event / campus / gallery imagery                 | ⚫ On hold — abstract placeholders only                                                                                                                   |
| Ashwamedh logo                                   | 🟢 Reference asset — `public/logos/ashwamedh-logo.png` (450×450, transparent). Colors are not the final palette.                                          |
| PCE logo                                         | 🟢 Official — `public/logos/pce-logo.png` (506×353, transparent). Use unaltered.                                                                          |
| High-resolution Ashwamedh logo (SVG / ≥ 2000 px) | ⚫ **Required** for the final large hero logo; SVG preferred. Current artwork (406 px) usable only within native sharpness limits; never upscaled (DS-06) |
| Final branding / palette                         | ⚫ Not finalized                                                                                                                                          |

When an official PDF arrives, store it in this folder (or `public/` once it is meant to be downloadable)
and add the event's details to `src/data/events/details.ts` — see the
[event data authoring guide](event-data.md).

## Phase 1 content dependencies by page

Defined in Phase 2 ([UX docs](../ux/README.md)). Every item below is currently TBA because the official
event date and content are not finalized; the UX shows the placeholder state from
[states-and-ctas.md](../ux/states-and-ctas.md) until the content arrives.

| Content needed                                         | Pages / slots affected                                                                                                         | Placeholder now                               |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Official festival dates & day count                    | Schedule day tabs, Cultural Night Day 1/2, event Date chips, listing card meta, hero CTA lifecycle (OD-12), SEO event metadata | TBA; no day tabs                              |
| Per-event description                                  | Event detail About tab                                                                                                         | "Details coming soon."                        |
| Per-event rules, eligibility                           | Rules, Eligibility tabs                                                                                                        | "…coming soon" sentences                      |
| Team size / participation type                         | Detail chips, listing card meta                                                                                                | TBA                                           |
| Registration fee                                       | Detail chip                                                                                                                    | TBA                                           |
| Date, time, venue per event                            | Detail chips, Venue tab, schedule rows                                                                                         | TBA                                           |
| Coordinators                                           | Coordinator tab                                                                                                                | "Coordinator details will be announced."      |
| Registration deadline                                  | Line under CTA (only while open)                                                                                               | Hidden                                        |
| Official Google Form per event                         | Register Now CTA                                                                                                               | "Registration Opening Soon"                   |
| Official PDF per event                                 | View Guidelines PDF CTA                                                                                                        | "Guidelines PDF Coming Soon"                  |
| Cultural Night performers, timings, registration rules | `/cultural-night`                                                                                                              | Day 1/Day 2 TBA; OD-14                        |
| Sports categories, fixtures, rules                     | Sports event details                                                                                                           | TBA / coming soon                             |
| Campus locations / map                                 | `/venue`, homepage H5, Venue tabs                                                                                              | Abstract map, no pins (OD-06)                 |
| Organising committee                                   | `/team`                                                                                                                        | "Organising committee will be announced."     |
| Contact details                                        | Footer, `/contact`                                                                                                             | TBA                                           |
| Social media handles                                   | Footer icons                                                                                                                   | Hidden (OD-08)                                |
| Approved taglines / marketing copy                     | Hero, overview, listing, Cultural Night, footer                                                                                | Omitted (OD-07)                               |
| Event, campus and gallery imagery                      | Cards, detail hero, `/gallery`                                                                                                 | Abstract placeholders; "Gallery coming soon." |
| Sponsors                                               | None until provided                                                                                                            | —                                             |
| Final branding / palette                               | Phase 3 tokens                                                                                                                 | Provisional tokens                            |
