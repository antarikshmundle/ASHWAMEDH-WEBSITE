# Admin CMS — Architecture (Phase 10)

Owner decision (Phase 10): festival content must be editable through a protected admin panel,
without editing the repository. **Content** becomes admin-editable; **design** (layout, tokens,
typography, motion, navigation, components) stays developer-controlled. The CMS is purpose-built for
ASHWAMEDH — not a general page builder: no arbitrary HTML, CSS or scripts.

Status: **10.0 architecture**, **10.1 authentication** and **10.2 database + storage** are done.
Nothing is editable through the admin yet; by default the public site still reads its content from
the repository (`CMS_CONTENT_SOURCE`, below).

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
will not be carried into the CMS schema (Cultural Night has no registration — OD-14, D7-7). Removed in 10.2.

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
- **Database and storage provider:** Supabase PostgreSQL + Supabase Storage (owner decision, 10.2).
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

## 10.2 — Database and storage (implemented)

**Decision (owner):** Supabase PostgreSQL for content and Supabase Storage for files.
**Supabase Auth is not used.** Admin sign-in stays the project's own (10.1): one administrator, no
public accounts, and nothing in the database depends on Supabase users or roles. The site talks to
Supabase only from the server, with the service-role key.

### Data flow

```
repository: inventory.ts (identity, frozen)   database: events_content + event_coordinators + cms_files
                         \                     /
                  src/lib/cms/events.ts (loadEvents / loadEvent / loadEventsByVertical)
                                   ↓
                    buildEvent() — the same validation as before (D7 links, source, coordinators)
                                   ↓
                  display.ts (TBA / Coming Soon) → components → static pages
```

- `CMS_CONTENT_SOURCE` chooses the content source: `repository` (default — `src/data/events/details.ts`,
  no credentials, exactly the Phase 8 output) or `database`. In `database` mode, missing credentials or
  an unreachable database **fail the build** with a clear message; repository content is never
  published silently instead.
- An event without a database row falls back to its repository details. Rows whose slug is not in the
  inventory are ignored by the site and reported by the seed.
- Identity (name, slug, department, vertical) always comes from the repository. The database cannot
  create, delete, rename or move events.

### Static pages and revalidation

- Public reads use `fetch` with `cache: "force-cache"` and Next.js cache tags (no `cacheComponents`
  switch, so the rest of the app is unchanged). Pages are prerendered at build time and stay static;
  serving a page does not query the database.
- Tags: `cms:events` (all rows — the three listing pages) and `cms:event:<slug>` (one event page).
- `expireEventContent(slug)` (`src/lib/cms/revalidate.ts`, admin-only) calls `updateTag` for that event
  and the listings only. The admin editors (10.3+) call it from their Server Actions after a save; the
  next visit renders fresh content. Other event pages keep their cache.
- If a regeneration fails (database down, invalid row), Next.js keeps serving the last good page.

### Schema (`supabase/migrations/`)

| Table                | Key                   | Holds                                                                                                                                                                                                                                                             |
| -------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events_content`     | `event_slug` (PK)     | Description, rules, eligibility (text arrays), participation, team size, fee, date, time, venue, image (file or `/images/events/` path), guidelines (file or https / `/docs/` link), registration status / link / deadline, source (`kind`, `reference`, `date`). |
| `event_coordinators` | `id`; FK `event_slug` | Name, designation, phone, email, `sort_order` (unique per event). Deleted with their event row.                                                                                                                                                                   |
| `cms_files`          | `id` (uuid)           | Bucket, server-generated path, original name, MIME type, size, category (`document`, `event-image`, `gallery-image`, `team-image`, `logo`), alt text.                                                                                                             |

Constraints mirror the domain rules: unknown values are `NULL` (blank strings are rejected); registration
links must be official Google Forms and `open` needs one; any content needs a complete source; at most one
image and one guidelines source; linked files must be of the right category (trigger); coordinator phone /
email formats; file category ⇔ bucket ⇔ MIME ⇔ size limit; safe paths. No prize columns (Phase 7.6). No
Cultural Night registration — the unused `culturalNight.registrationLink` was removed from the data model.
Row-level security is on with no policies, and `anon` / `authenticated` have no privileges: only the
server can read or write.

**Revisions:** not yet. Phase 10.3 adds an `events_content_revisions` table (previous row and coordinators
as JSON, plus when) written by the editor's save action, with restore from the admin UI.

### Storage

| Bucket                | Contents                                            | Types             | Limit |
| --------------------- | --------------------------------------------------- | ----------------- | ----- |
| `ashwamedh-documents` | Guidelines PDFs (`events/<slug>/…`)                 | `application/pdf` | 10 MB |
| `ashwamedh-images`    | `events/<slug>/…`, `gallery/…`, `team/…`, `logos/…` | JPEG, PNG, WebP   | 5 MB  |

- Two buckets so Storage itself enforces type and size per kind of file. Both are **public-read**: the
  website links to guidelines PDFs and images directly. **No storage policies** are added, so anonymous or
  signed-in Supabase users cannot upload, change or delete anything.
- Object names are generated on the server (`<folder>[/<slug>]/<uuid>.<ext>`); the uploaded file name is
  kept only as metadata.
- `src/lib/cms/upload-policy.ts` checks every upload before Storage: the real type from the file's first
  bytes (PDF, PNG, JPEG, WebP only — SVG, HTML, scripts, executables and archives are rejected), the
  claimed type and the extension must match it, size limits, a safe file name. `src/lib/cms/files.ts`
  (server-only) uploads and deletes after `requireAdmin()` and is not exposed as a route; the file manager
  arrives in 10.4.
- Event images from Storage are not displayed yet: `src/lib/media.ts` and `next.config.ts` still allow
  only `/images/events/`. 10.4 adds the Storage host to both, together with the image manager.

### Security boundaries

- Service-role key: server environment only; used by `src/lib/cms/server.ts`, `events.ts`, `files.ts`,
  `revalidate.ts` (all `server-only`) and the seed script. Unit tests fail if a client component imports
  the CMS or Supabase, or if a `NEXT_PUBLIC_SUPABASE…` variable appears.
- Every CMS mutation (`uploadCmsFile`, `deleteCmsFile`, `expireEventContent`) calls `requireAdmin()`
  first. There is no public API route for the CMS.
- The database repeats the validation (constraints, RLS), so a bug in the app cannot store an unsafe
  registration link or file type.

### Commands

| Command                                                              | What it does                                                                                                                                                                                          |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx supabase link --project-ref <ref>`, then `npx supabase db push` | Applies `supabase/migrations/*.sql` (schema, then buckets) to the project, in order.                                                                                                                  |
| `npm run cms:seed`                                                   | One `events_content` row per inventory event, from the repository details. Inserts missing slugs only — never overwrites or deletes; safe to repeat. Fails unless there is exactly one row per event. |
| `npm test`                                                           | Unit tests, including the migrations on an in-process PostgreSQL (PGlite). No credentials needed.                                                                                                     |
| `npm run test:supabase`                                              | Live checks against a migrated project: seed idempotency, constraints, no anonymous access, PDF upload / public read / clean-up. Fails without credentials.                                           |

### Local setup

1. Without Supabase: nothing to do — `CMS_CONTENT_SOURCE` defaults to `repository`.
2. With a Supabase project (or `npx supabase start` locally, URL `http://127.0.0.1:54321`): put
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, apply the migrations, run
   `npm run cms:seed`, then set `CMS_CONTENT_SOURCE=database` to build from the database.

### Production setup

1. Create the Supabase project (with backups / point-in-time recovery on the plan used).
2. Apply the migrations with `npx supabase db push` — never from the running app.
3. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CMS_CONTENT_SOURCE=database` and the admin variables
   in the host's server environment.
4. Run `npm run cms:seed` once (from a trusted machine or CI), then deploy.
5. Later schema changes are new migration files, reviewed and applied the same way.

### Known limitations

- No editor UI yet; content changes still need the repository or SQL until 10.3.
- The sign-in throttle is still per instance (it moves to the database later).
- Storage images are not rendered until 10.4 (see above).
- The seed fills missing rows only; it does not copy later repository edits into existing rows. Once
  seeded, the database is the source of truth for content.

## Environment

| Variable                             | Needed for                  | Notes                                                                          |
| ------------------------------------ | --------------------------- | ------------------------------------------------------------------------------ |
| `ADMIN_USERNAME`                     | 10.1 sign-in                | Server-only.                                                                   |
| `ADMIN_PASSWORD_HASH`                | 10.1 sign-in                | Server-only. Output of `npm run admin:hash`.                                   |
| `ADMIN_SESSION_SECRET`               | 10.1 sign-in                | Server-only, ≥ 32 characters, random.                                          |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Multi-instance self-hosting | Stable key shared by all instances (Next.js Server Actions).                   |
| `CMS_CONTENT_SOURCE`                 | 10.2 public content         | `repository` (default) or `database`.                                          |
| `SUPABASE_URL`                       | 10.2 database / storage     | `https://<project>.supabase.co` (http only for a local Supabase). Server-only. |
| `SUPABASE_SERVICE_ROLE_KEY`          | 10.2 database / storage     | Service-role (secret) key. **Server-only — never `NEXT_PUBLIC_`.**             |

## Next milestones

| Milestone | Scope                                                                                                                                                                       |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10.2      | Done — Supabase schema and storage, idempotent seed, database-backed data layer through `buildEvent()`, targeted revalidation helper.                                       |
| 10.3      | Event editor (details, coordinators, registration with the D7 rules, source) with server-side validation, a revisions table with restore, and `expireEventContent` on save. |
| 10.4      | File manager (guidelines PDFs, event images) on object storage.                                                                                                             |
| 10.5      | Schedule (`scheduleDays` + rows), Cultural Night dates, festival settings, contact / footer / social links.                                                                 |
| 10.6      | Gallery and Team (data model + public rendering of official content only).                                                                                                  |
| 10.7      | QA, security review, backup / rollback drill, runbook.                                                                                                                      |
