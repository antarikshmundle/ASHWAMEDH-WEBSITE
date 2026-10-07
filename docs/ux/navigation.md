# Navigation and Footer

Covers Phase 2 items **2 (desktop navigation)**, **3 (mobile navigation)** and **14 (footer)**.
Tags: **[A]** reference · **[B]** confirmed · **[C]** TBA · **[OD-xx]** locked owner decision
([owner-decisions.md](owner-decisions.md)).

## 2. Desktop navigation

### Structure [A] (reference panels 01, 02)

```
[ Logo block ]      Home  Events  Cultural Night  Schedule  Gallery  Team  About  Contact      [ Coming Soon ]
 left                              link group                                                 disabled CTA
```

| Element       | Behaviour                                                                                                                                                                                                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary items | Home · Events · Cultural Night · Schedule · Gallery · Team · About · Contact, in exactly the reference order (OD-09). Campus Map / Venue is **not** a navbar item (OD-10).                                                                                                                                            |
| "Events"      | **Plain link to `/events`, no dropdown** (OD-15). Visitors reach the verticals through the overview cards.                                                                                                                                                                                                            |
| CTA (right)   | One outlined element labelled **"Coming Soon"**. It is **non-clickable / disabled** and links nowhere (OD-12). It is rendered as a non-interactive status element, not a link: it is not in the tab order and announces as "Coming Soon". It becomes an active CTA only when official launch information defines one. |
| Active state  | A single indicator under the active item (the reference underlines "Home").                                                                                                                                                                                                                                           |

**Breakpoint (Phase 4 visual review):** the full desktop bar shows from **1280 px**. Below 1280 px the top bar + menu button (§3) is used, because 1024–1279 px was too narrow for the PCE identity, eight items and the CTA on one line.

### Active-state mapping

| Current route                                                      | Active item                 |
| ------------------------------------------------------------------ | --------------------------- |
| `/`                                                                | Home                        |
| `/events`, `/technomedh`, `/cultural`, `/sports`, `/events/[slug]` | Events                      |
| `/cultural-night`                                                  | Cultural Night              |
| `/schedule`                                                        | Schedule                    |
| `/gallery`, `/team`, `/about`, `/contact`                          | The item with the same name |
| `/venue`                                                           | None (not in nav, OD-10)    |

### Logo behaviour (locked: OD-13)

- **Homepage, over the hero (panel 01):** the logo block shows the **PCE logo + "Priyadarshini College of
  Engg., Nagpur"**.
- **Sticky state (panel 02) and all inner pages:** the logo block shows the **Ashwamedh logo** with
  "PCE's flagship annual fest".
- The transition between the two follows the reference (hero state → sticky state). The motion details are
  set in Phase 8.
- Clicking either logo goes to `/`.
- Both logos are used unaltered: no recolouring, cropping or redrawing.

### Sticky behaviour [A] (panel 02 is labelled "Sticky Navbar")

- The navbar is **sticky on every page**.
- On the homepage it is transparent over the hero at the top. After the hero logo scrolls out, it switches
  to the compact sticky state (solid/blurred background, Ashwamedh logo).
- Inner pages start directly in the sticky state.
- No hide-on-scroll in v1, because that motion can get in the way of navigation.

### Accessibility (IA level)

- Use `<header>` + `<nav aria-label="Primary">`. The active link has `aria-current="page"`.
- A "Skip to content" link is the first focusable element.
- Keyboard order: logo → nav items. The disabled CTA is not focusable.

## 3. Mobile navigation

The reference shows desktop only. The mobile navigation below keeps the same hierarchy (master prompt §15).

| Element   | Behaviour                                                                                                                                                                                                  |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top bar   | Sticky. Left: logo, following the same rule as desktop (OD-13). Right: menu button (≥ 44×44 px, labelled "Open menu"). The CTA is **not** squeezed into the bar.                                           |
| Menu      | Full-screen overlay. Items appear in the reference order with large tap targets, and the active item is marked. The disabled "Coming Soon" status sits at the bottom, and the PCE logo at the very bottom. |
| Close     | Close button (in the same position as the menu button), `Esc`, or navigating to any link.                                                                                                                  |
| Behaviour | Focus moves into the menu and is trapped while it is open. Page scroll is locked. Focus returns to the menu button on close.                                                                               |
| Events    | A single "Events" link to `/events` with no nested items (OD-15).                                                                                                                                          |

## 14. Footer [A] (reference panel 09)

```
┌──────────────────────────┬──────────────┬───────────────┬──────────────────┐
│ Ashwamedh logo           │ Quick Links  │ Events        │ Contact          │
│ PCE's flagship annual    │ Home         │ Technomedh    │ Phone      TBA   │
│ fest                     │ Events       │ Cultural      │ WhatsApp   TBA   │
│ [description area]       │ Cultural     │ Sports        │ Email      TBA   │
│                          │  Night       │ Cultural      │                  │
│ (social icons hidden)    │ Schedule     │  Night        │        PCE logo  │
│                          │ Gallery      │               │  Priyadarshini   │
│                          │ About        │               │  College of Engg.│
│                          │ Contact      │               │  Nagpur          │
└──────────────────────────┴──────────────┴───────────────┴──────────────────┘
```

| Block        | Content                                                                                                                                | Status            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Brand        | Ashwamedh logo + "PCE's flagship annual fest"                                                                                          | [B]               |
| Description  | Placeholder copy area (reference text not used)                                                                                        | OD-07             |
| Social icons | **Hidden** until official handles are provided. Never linked to a placeholder `#`.                                                     | OD-08             |
| Quick Links  | Home, Events, Cultural Night, Schedule, Gallery, About, Contact. Same items and order as the reference (Team and Venue are not added). | [A], OD-09, OD-10 |
| Events       | Technomedh, Cultural, Sports, Cultural Night                                                                                           | [A]               |
| Contact      | Phone, WhatsApp, Email, each showing **TBA** as in the reference                                                                       | [C]               |
| College      | PCE logo + name + Nagpur, bottom right, unaltered                                                                                      | [B], OD-13        |

The reference shows no copyright/legal row, so none is added unless the owner requests it.

On mobile, the blocks stack in this order: Brand → Events → Quick Links → Contact → College. Link groups may
sit in two columns to keep the footer short.
