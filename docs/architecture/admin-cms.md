# Admin CMS — Architecture (Phase 10)

Owner decision (Phase 10): festival content must be editable through a protected admin panel,
without editing the repository. **Content** becomes admin-editable; **design** (layout, tokens,
typography, motion, navigation, components) stays developer-controlled. The CMS is purpose-built for
ASHWAMEDH — not a general page builder: no arbitrary HTML, CSS or scripts.

Status: **10.0 architecture** (this document) and **10.1 authentication** are done. Nothing is
editable yet; the public site still reads its content from the repository.

## 10.0 — Findings (baseline 5314e95)

| #   | Question                   | Finding                                                                                                                                                                                                                                                                                           |
| --- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | Source of truth today      | TypeScript modules: `src/data/events/inventory.ts` (40 frozen identities), `details.ts` (official details by slug — empty), `src/data/festival.ts` / `site.ts` / `verticals.ts` (festival-level). All public pages are prerendered at build time (55 pages).                                      |
| B   | Static data                | Everything. No database, no runtime data source, no file uploads, no API routes.                                                                                                                                                                                                                  |
| C   | Stable types               | `EventIdentity`, `EventDetailsInput`, `EventRecord`, `ContentSource`, `Coordinator`, `Participation`, `RegistrationStatus` (`src/types/festival.ts`). Validation: `buildEvent()` (source, D7 link rules, open ⇒ valid link), `safe-url.ts`, `media.ts`, `contact.ts`.                             |
| D   | Becomes CMS content        | Every `EventDetailsInput` field (description, rules, eligibility, participation, team size, fee, date, time, venue, coordinators, image, guidelines PDF, registration link / status / deadline, source); schedule; Cultural Night dates; contact; social links; vertical taglines; gallery; team. |
| E   | Stays developer-controlled | Event identity (slug, name, vertical, department, order, legacy slugs), the four Cultural Night "What's On" items, navigation, all design and motion, validation rules, placeholder wording (`src/lib/display.ts`).                                                                               |
| F   | Migrating the 40 events    | Identity stays in `inventory.ts` (frozen, snapshot-tested). The database stores **details only, keyed by slug** — never a second copy of identity, so the CMS cannot rename or add events. The seed upserts by slug: re-running it changes nothing.                                               |
| G   | Provenance                 | `ContentSource` (`kind`, `reference`, `date`) stays required on every saved details entry; the admin form requires it.                                                                                                                                                                            |
| H   | TBA / Coming Soon          | Columns are nullable; blank input is saved as `null`; the display layer is unchanged, so `null` still renders as TBA / Coming Soon. The CMS never stores placeholder text.                                                                                                                        |
| I   | Files                      | Object storage, metadata in the database. Guidelines PDFs: `application/pdf`, checked by content (`%PDF-`), size-limited. Images: JPEG / PNG / WebP, sniffed and size-limited. Server-generated object names; no user-supplied paths or extensions.                                               |
| J   | Authentication             | 10.1: one administrator configured by environment variables, scrypt-hashed password, signed `httpOnly` session cookie. Later (with the database): optional named accounts and roles, server-side session revocation, audit log.                                                                   |
| K   | Route protection           | `src/proxy.ts` (admin routes only, optimistic redirect) + `requireAdmin()` in every admin page and Server Action (the real check).                                                                                                                                                                |
| L   | Public consumption         | Pages keep calling the same data functions (`events`, `getEventBySlug`, …). Their implementation reads saved details and passes them through the same `buildEvent()` validation. Pages stay statically rendered and are revalidated on save, so the public site stays as fast as today.           |
| M   | Deployment                 | Admin routes need a Node.js server (Vercel or `next start`); the public pages remain static. A pure static export is no longer possible once the admin exists.                                                                                                                                    |
| N   | Backup / rollback          | Database point-in-time recovery from the provider, plus a revisions table (previous version of every saved entry) for one-click rollback. Files are never overwritten — a replaced PDF gets a new object; the old one is kept until cleaned up.                                                   |
| O   | Secrets / configuration    | See [Environment](#environment). None is exposed to the browser (no `NEXT_PUBLIC_` prefix).                                                                                                                                                                                                       |

Also found: `culturalNight.registrationLink` in `src/data/festival.ts` is unused and unvalidated. It
will not be carried into the CMS schema (Cultural Night has no registration — OD-14, D7-7).

## Selected architecture

```
Admin (browser) ──► /admin/* (proxy: optimistic check) ──► Server Actions (requireAdmin + validation)
                                                                │
                                                     database (content) + object storage (files)
                                                                │  on save: revalidate affected pages
Public visitor ──► static pages ◄── data layer ── buildEvent() / display.ts (unchanged contracts)
```

- **Why:** smallest design that meets the requirement (edit without the repository) while keeping the
  site static and every Phase 6–7 rule enforced on the server.
- **Database and storage provider — owner decision before 10.2.** Requirements: managed PostgreSQL
  (point-in-time recovery) and S3-compatible or platform object storage, both reachable from the chosen
  host. Typical fits: Vercel → Vercel Postgres/Neon + Vercel Blob; self-hosted → PostgreSQL + S3/R2.
  Nothing is installed until hosting is decided.
- Guidelines PDF links keep the D7-8 rule; uploaded files will be served from the storage host, which
  the PDF/image validators will allow explicitly.

## 10.1 — Authentication (implemented)

| Part        | Implementation                                                                                                                                                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes      | `/admin/login` (sign-in form, works without JavaScript), `/admin` (dashboard; lists the planned sections, none editable yet). Both `noindex`, `no-store`, outside the public header/footer (`PublicChrome`).                                                                 |
| Credentials | `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` (scrypt N=32768, r=8, p=1, 16-byte salt, 64-byte key; format `scrypt:N:r:p:salt:hash`). Generate with `npm run admin:hash`. No plain-text password anywhere, no default account; incomplete configuration disables sign-in.         |
| Session     | Stateless token `payload.signature`, HMAC-SHA-256 with `ADMIN_SESSION_SECRET` (≥ 32 chars). 8-hour lifetime. Bound to the current password hash: changing the password, or rotating the secret, signs everyone out.                                                          |
| Cookie      | `ashwamedh_admin_session`: `HttpOnly`, `Secure` in production, `SameSite=Strict`, `Path=/admin`, `Max-Age` 8 h. Set and cleared only in Server Actions.                                                                                                                      |
| Checks      | `src/proxy.ts` (matcher `/admin`, `/admin/:path*`) redirects signed-out requests to `/admin/login`; `requireAdmin()` (`src/lib/admin/auth.ts`, `server-only`) re-verifies in every admin page and action. Next.js rejects cross-origin Server Action calls (Origin vs Host). |
| Throttling  | 5 failed attempts per client in 15 min → that client locked 15 min; 50 failures overall → sign-in locked 15 min. In memory, per instance — replaced by a shared store with the database.                                                                                     |
| Timing      | Username compared with `timingSafeEqual` on SHA-256 digests; the password hash is always computed.                                                                                                                                                                           |
| Sign-out    | Expires the cookie (same name, path and flags) and returns to the sign-in page.                                                                                                                                                                                              |

### Setting up the administrator

1. `npm run admin:hash` — type the password (12–256 characters; not echoed). Copy the printed hash.
2. Generate a session secret, e.g. `openssl rand -base64 48`.
3. Set `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` in `.env.local` (local) or the
   host's environment settings (production). Never commit them.
4. To change the password, replace the hash; to sign everyone out, rotate the secret.

## Environment

| Variable                             | Needed for                  | Notes                                                        |
| ------------------------------------ | --------------------------- | ------------------------------------------------------------ |
| `ADMIN_USERNAME`                     | 10.1 sign-in                | Server-only.                                                 |
| `ADMIN_PASSWORD_HASH`                | 10.1 sign-in                | Server-only. Output of `npm run admin:hash`.                 |
| `ADMIN_SESSION_SECRET`               | 10.1 sign-in                | Server-only, ≥ 32 characters, random.                        |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Multi-instance self-hosting | Stable key shared by all instances (Next.js Server Actions). |
| Database / storage credentials       | 10.2+                       | Defined once the providers are chosen.                       |

## Next milestones

| Milestone | Scope                                                                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 10.2      | Hosting + database decision; schema (event details by slug, coordinators, revisions, file metadata, settings); idempotent seed; data layer reading the database through `buildEvent()`; on-save revalidation. Public output must stay identical. |
| 10.3      | Event editor (details, coordinators, registration with the D7 rules, source) with server-side validation and revisions.                                                                                                                          |
| 10.4      | File manager (guidelines PDFs, event images) on object storage.                                                                                                                                                                                  |
| 10.5      | Schedule (`scheduleDays` + rows), Cultural Night dates, festival settings, contact / footer / social links.                                                                                                                                      |
| 10.6      | Gallery and Team (data model + public rendering of official content only).                                                                                                                                                                       |
| 10.7      | QA, security review, backup / rollback drill, runbook.                                                                                                                                                                                           |
