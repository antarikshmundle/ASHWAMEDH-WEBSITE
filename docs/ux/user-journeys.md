# Core User Journeys

Covers Phase 2 item **13**. Each journey lists the steps, the page that serves each step, and what the user
sees **today** (before official content) versus **after release**.

## J1 — Visitor exploring the festival

| Step                                       | Page                | Today                                                              | After release                              |
| ------------------------------------------ | ------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| 1. Lands from a social link                | `/` hero            | Logo, "PCE's Flagship Annual Fest", disabled "Coming Soon" (OD-12) | Active CTA defined by official launch info |
| 2. Scrolls / taps "Scroll to explore"      | `/` events overview | Four vertical cards                                                | Same                                       |
| 3. Reads schedule & Cultural Night teasers | `/` H3–H4           | "Schedule Releasing Soon", Day 1/Day 2 TBA                         | Real days and times                        |
| 4. Opens a vertical                        | `/technomedh`       | All events with department; meta TBA                               | Dates filled                               |

Success: within one scroll the visitor knows what Ashwamedh is and the four things it contains.

## J2 — Student looking for a specific competition

| Step                                     | Page           | Today                                           | After release      |
| ---------------------------------------- | -------------- | ----------------------------------------------- | ------------------ |
| 1. Opens nav "Events" (or homepage card) | `/events`      | Four cards                                      | Same               |
| 2. Picks the vertical                    | `/cultural`    | 15 events, inventory order                      | Same               |
| 3. Jumps via sidebar / "Jump to event"   | —              | Direct link to the event                        | Same               |
| 4. Reads detail                          | `/events/mime` | Department shown; chips TBA; tabs "coming soon" | Full details + PDF |

Success: any event reachable in ≤ 3 taps from any page (nav → vertical → event).
Students who only know their **department** can scan the department line on every listing card (OD-16).

## J3 — Student registering for an event

| Step                           | Page                           | Today                                                    | After release        |
| ------------------------------ | ------------------------------ | -------------------------------------------------------- | -------------------- |
| 1. Reaches event detail (J2)   | `/events/hackathon`            | —                                                        | —                    |
| 2. Reads rules / downloads PDF | Rules tab, PDF CTA             | "Rules will be published…", "Guidelines PDF Coming Soon" | Rules + PDF          |
| 3. Taps primary CTA            | Detail                         | **"Registration Opening Soon"** (disabled)               | **"Register Now →"** |
| 4. Fills the form              | Official Google Form (new tab) | —                                                        | Google confirmation  |

Success: no dead ends — the disabled state explains that registration is not open yet.

## J4 — Visitor checking the schedule

| Step                                  | Page                              | Today                                                                                                       | After release                |
| ------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 1. Nav "Schedule" or homepage preview | `/schedule`                       | "Schedule Releasing Soon"; category rows TBA; no day tabs                                                   | Day tabs, timed rows, venues |
| 2. Taps a category row                | Vertical page / `/cultural-night` | Navigates to the vertical                                                                                   | Same                         |
| 3. Checks Cultural Night              | `/cultural-night`                 | Day 1 / Day 2 TBA; "What's On": Group Dance, Singing, Solo Dance, Inauguration / Stage Performances (OD-14) | Times, line-up               |

## J5 — Visitor finding venue / contact information

| Step                                         | Page                   | Today                                       | After release                         |
| -------------------------------------------- | ---------------------- | ------------------------------------------- | ------------------------------------- |
| 1. Homepage venue preview or event Venue tab | `/venue`               | Abstract map, no pins/labels/legend (OD-06) | Map with official locations (Phase 9) |
| 2. Needs to contact organisers               | Footer / nav "Contact" | Phone / WhatsApp / Email: TBA               | Official contacts                     |
| 3. Looks for the college                     | Footer                 | PCE logo, name, Nagpur                      | Same                                  |

`/venue` is intentionally not in the navbar or footer (OD-10). It is reached from the homepage Venue preview,
event Venue tabs and the Contact page.
