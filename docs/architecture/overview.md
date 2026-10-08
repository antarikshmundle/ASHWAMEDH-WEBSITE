# Architecture Overview

## Stack

- **Next.js 16 (App Router) + TypeScript (strict)** — all pages statically generated.
- **Tailwind CSS v4** — design tokens (defined in [../design-system/](../design-system/README.md)) centralized in one CSS file, `src/styles/tokens.css` (Phase 5).
- **Fonts** — Rajdhani (display) + Inter (body) via `next/font` (locked, DS-01).
- **Lucide React** for icons. Motion is CSS-only so far (no Motion library needed in Phase 4).
- **Vitest** for unit tests; Playwright for E2E/a11y later.
- No backend, auth, database or CMS until official requirements justify one.

## Principles

1. **Content ≠ presentation.** Event and festival data live in `src/data/`; components never hardcode content.
2. **Unknown = `null`.** Data never contains `"TBA"` strings or guessed values. A single helper in `src/lib/`
   maps missing values to the right placeholder ("TBA", "Coming Soon", "Registration Opening Soon").
3. **One event-detail component** renders every event page from data (`/events/[slug]`).
4. **Theming by tokens.** Verticals (Technomedh, Cultural, Sports, Cultural Night) override a small set
   of accent tokens via a `data-vertical` attribute — one brand, four personalities.
5. **Reference-first UI.** The locked image in `docs/ux/reference/` decides layout and composition.

## Routes

Defined in Phase 2 — see [../ux/sitemap-and-routes.md](../ux/sitemap-and-routes.md).

```
/                       Home
/events                 Four-vertical overview
/technomedh             Vertical listing
/cultural               Vertical listing
/sports                 Vertical listing
/events/[slug]          Event detail (one data-driven template)
/cultural-night
/schedule               "Schedule Releasing Soon" until dates are official
/venue                  Campus map
/gallery                Coming Soon (OD-09)
/team                   Coming Soon (OD-09)
/about
/contact
```

## Folder map

```
src/app/          Routes only — thin, compose sections
src/components/   ui/ cards/ sections/ layout/ art/
src/data/         Typed content (site identity, events, departments)
src/lib/          Pure helpers (site URL, placeholder display, metadata)
src/styles/       globals.css (+ tokens in Phase 3)
src/types/        Shared types
tests/unit/       Vitest
tests/e2e/        Playwright (later)
docs/             requirements/ architecture/ ux/ content/
```

## Configuration

| Variable                                                        | Purpose                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                          | Base URL for canonical/OG/sitemap. Falls back to `http://localhost:3000`. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` | Admin sign-in (server-only). See [admin-cms.md](admin-cms.md).            |
