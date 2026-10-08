# CTA Hierarchy and TBA / Empty States

Covers Phase 2 items **10 (CTA hierarchy)** and **11 (TBA / Coming Soon / unavailable states)**.
Tags: **[A]** reference · **[B]** confirmed · **[C]** TBA · **[OD-xx]** locked owner decision ([owner-decisions.md](owner-decisions.md)) · **[E]** dependency.

## 10. CTA hierarchy

| Level         | Purpose                                        | Instances                                                                                                                                                                         | Rule                                                                                                                    |
| ------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Primary**   | The single most important action on the screen | Event detail: **"Register Now →"** · Hero: **"Coming Soon →"** — disabled status until launch info exists (OD-12)                                                                 | At most one primary per view. Filled/strongest treatment (reference: filled button on detail, glowing outline in hero). |
| **Secondary** | Supporting action next to a primary            | **"View Guidelines PDF ⤓"** · Navbar **"Coming Soon"** — disabled status (OD-12)                                                                                                  | Outlined. Never competes visually with the primary.                                                                     |
| **Tertiary**  | Navigation into content                        | "Explore Events →", "Explore →", "View Details →", "View Schedule →", "Explore Cultural Night →", "View Campus Map →", "← Back to {Vertical}", "Scroll to explore", sidebar links | Text link or small outlined button with arrow.                                                                          |

- Registration always ends at the event's **official Google Form** — no intermediate page.
- Disabled CTAs keep their position and size and state _why_ they are disabled ("Registration Opening Soon");
  they are not hidden, so the page layout does not shift when official data arrives.
- External links (Google Forms, PDFs on Drive if used) open in a new tab with an external-link indicator
  and accessible label "(opens in new tab)".
- **Pre-launch "Coming Soon" CTAs (navbar + hero) are non-clickable** (OD-12). They are rendered as status
  elements, not links or focusable buttons, and redirect nowhere. When official dates/launch information
  arrive, each is replaced by the active CTA that the confirmed requirement defines.
- Cultural Night has **no registration CTA** (OD-14) unless organisers later provide an official process.

## 11. TBA / Coming Soon / unavailable states

### Vocabulary — three phrases only

| Phrase                                             | Use for                                                                                                  | Never use for           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------- |
| **TBA**                                            | A single short fact: date, time, venue, fee, team size, participation type, contact value, Day labels    | Long content or actions |
| **Coming Soon** (or a short sentence ending in it) | A block of content: description, rules, eligibility, guidelines PDF, schedule, gallery, team, campus map | Short facts             |
| **Registration Opening Soon**                      | Only the registration CTA before a form link exists                                                      | Anything else           |

"Upcoming" is never used (D4). No dashes, "N/A", "0", "Free" or empty strings as stand-ins.

### State table

| Situation                                  | Where                                                                                                                                 | Displayed                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Date TBA                                   | Detail chip, listing card meta, schedule rows, Cultural Night day cards                                                               | `TBA`                                                                            |
| Time TBA                                   | Detail chip (with date), schedule rows                                                                                                | `TBA` (chip shows one `TBA` for "Date & Time")                                   |
| Venue TBA                                  | Detail chip                                                                                                                           | `TBA`                                                                            |
| Venue TBA                                  | Detail **Venue** tab                                                                                                                  | "Venue will be announced." + link "View campus map"                              |
| Fee TBA                                    | Detail chip "Registration Fee"                                                                                                        | `TBA` (never "Free" unless officially stated)                                    |
| Team size TBA                              | Detail chips "Participation", "Team Size"; card meta                                                                                  | `TBA`                                                                            |
| Description missing                        | **About** tab                                                                                                                         | "Details coming soon."                                                           |
| Rules missing                              | **Rules** tab                                                                                                                         | "Rules will be published with the official event PDF."                           |
| Eligibility missing                        | **Eligibility** tab                                                                                                                   | "Eligibility details coming soon."                                               |
| Coordinator not announced                  | **Coordinator** tab                                                                                                                   | "Coordinator details will be announced."                                         |
| Registration not open / link not available | Primary CTA                                                                                                                           | Disabled button: "Registration Opening Soon"                                     |
| Registration closed                        | Primary CTA                                                                                                                           | Disabled button: "Registration Closed"                                           |
| PDF not available                          | Secondary CTA                                                                                                                         | Disabled button: "Guidelines PDF Coming Soon"                                    |
| Registration deadline unknown              | Under CTA                                                                                                                             | Hidden while registration is not open                                            |
| Image missing                              | Cards, detail hero                                                                                                                    | Abstract per-vertical placeholder (no stock photos, D5)                          |
| Schedule not released                      | `/schedule`, homepage H3                                                                                                              | "Schedule Releasing Soon" + category rows with `TBA`                             |
| Cultural Night timings                     | `/cultural-night`, homepage H4                                                                                                        | "Day 1 — TBA", "Day 2 — TBA"                                                     |
| Campus locations unknown                   | `/venue`, homepage H5                                                                                                                 | Abstract map; no pins, labels or legend; "Venue details coming soon." (OD-06)    |
| Contact unknown                            | Footer, `/contact`                                                                                                                    | Phone / WhatsApp / Email: `TBA`                                                  |
| Social handles unknown                     | Footer                                                                                                                                | Icons hidden (OD-08)                                                             |
| Gallery empty                              | `/gallery`                                                                                                                            | "Gallery coming soon." (OD-09)                                                   |
| Committee unknown                          | `/team`                                                                                                                               | "Organising committee will be announced." (OD-09)                                |
| Official copy not approved                 | Hero tagline / word stack, overview eyebrow, card taglines, listing tagline, Cultural Night tagline, map sub-line, footer description | Placeholder copy area / "Coming Soon" — reference taglines never shipped (OD-07) |
| Launch info not available                  | Navbar + hero CTA                                                                                                                     | "Coming Soon", disabled / non-clickable (OD-12)                                  |

### Implementation contract (for Phase 6)

- Data stores unknowns as `null`. The words above live **only** in one display helper, so wording changes
  in one place.
- Placeholder states use the same layout slot as real content (no layout shift when data arrives).
- Screen readers hear the same text ("Venue: TBA"), not an empty value.
