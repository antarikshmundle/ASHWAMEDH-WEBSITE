# Admin CMS — Architecture (Phase 10)

Owner decision (Phase 10): festival content must be editable through a protected admin panel,
without editing the repository. **Content** becomes admin-editable; **design** (layout, tokens,
typography, motion, navigation, components) stays developer-controlled. The CMS is purpose-built for
ASHWAMEDH — not a general page builder: no arbitrary HTML, CSS or scripts.

Status: **10.0 architecture**, **10.1 authentication**, **10.2 database + storage** and **10.3 event
editor** are done. Event content is editable at `/admin/events`; the public site shows it when it reads
from the database (`CMS_CONTENT_SOURCE=database`, below).

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
| K   | Route protection           | `src/proxy.ts` (admin routes, optimistic redirect; since 10.3 also the event-page slug guard) + `requireAdmin()` in every admin page and Server Action (the real check).                                                                                                                          |
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

| Part        | Implementation                                                                                                                                                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Routes      | `/admin/login` (sign-in form, works without JavaScript), `/admin` (dashboard; lists the planned sections, none editable yet). Both `noindex`, `no-store`, outside the public header/footer (`PublicChrome`).                                                                                                          |
| Credentials | `ADMIN_USERNAME` + `ADMIN_PASSWORD_HASH` (scrypt N=32768, r=8, p=1, 16-byte salt, 64-byte key; format `scrypt:N:r:p:salt:hash`). Generate with `npm run admin:hash`. No plain-text password anywhere, no default account; incomplete configuration disables sign-in.                                                  |
| Session     | Stateless token `payload.signature`, HMAC-SHA-256 with `ADMIN_SESSION_SECRET` (≥ 32 chars). 8-hour lifetime. Bound to the current password hash: changing the password, or rotating the secret, signs everyone out.                                                                                                   |
| Cookie      | `ashwamedh_admin_session`: `HttpOnly`, `Secure` in production, `SameSite=Strict`, `Path=/admin`, `Max-Age` 8 h. Set and cleared only in Server Actions.                                                                                                                                                               |
| Checks      | `src/proxy.ts` (matcher `/admin`, `/admin/:path*`; `/events/:slug` for the 10.3 slug guard) redirects signed-out requests to `/admin/login`; `requireAdmin()` (`src/lib/admin/auth.ts`, `server-only`) re-verifies in every admin page and action. Next.js rejects cross-origin Server Action calls (Origin vs Host). |
| Throttling  | 5 failed attempts per client in 15 min → that client locked 15 min; 50 failures overall → sign-in locked 15 min. In memory, per instance — replaced by a shared store with the database.                                                                                                                              |
| Timing      | Username compared with `timingSafeEqual` on SHA-256 digests; the password hash is always computed.                                                                                                                                                                                                                    |
| Sign-out    | Expires the cookie (same name, path and flags) and returns to the sign-in page.                                                                                                                                                                                                                                       |

### Setting up the administrator

1. `npm run admin:hash` — type the password (12–256 characters; not echoed). Copy the printed hash
   (`scrypt:…`, colon-separated; paste it unquoted and unchanged).
2. Generate a session secret (≥ 32 characters), e.g. `openssl rand -base64 48`, or without OpenSSL:
   `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
3. Set `ADMIN_USERNAME` (1–64 characters), `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` in `.env.local` or
   `.env` (local; both are git-ignored, `.env.local` wins) or the host's environment settings (production).
   Never commit them. Each name once: a later line with the same name — even an empty one — replaces the
   earlier value.
4. Restart the server (`npm run dev`, or `npm run build` then `npm run start`): environment files are read
   at start-up. The login page says "Admin sign-in is not configured on this server." until all three
   values are present and valid.
5. To change the password, replace the hash; to sign everyone out, rotate the secret.

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
  and the listings only. The event editor (10.3) calls it from its Server Action after a save; the next
  visit renders fresh content. Other event pages keep their cache. Event pages need the proxy slug guard
  for this — see 10.3.
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

**Revisions:** `events_content_revisions` (added in 10.3) — see the event editor below.

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
  claimed type and the extension must match it, size limits, a safe file name. Uploads go through the
  media service (`src/lib/cms/media-admin.ts`, 10.4) and deletions only through the cleanup
  (`src/lib/cms/cleanup.ts`, 10.4.6); the 10.2 helper `files.ts` was removed in 10.4.6.
- Uploaded event images are displayed since 10.4.4 (see below): `src/lib/media.ts` and `next.config.ts`
  allow exactly the project's Storage host and public event-image folder.

### Security boundaries

- Service-role key: server environment only; used by `src/lib/cms/server.ts`, `events.ts`,
  `media-admin.ts`, `image-decode.ts`, `revalidate.ts`, `admin-events.ts` (all `server-only`), and by the
  seed and cleanup scripts. Unit tests fail if a client component imports
  the CMS or Supabase, or if a `NEXT_PUBLIC_SUPABASE…` variable appears.
- Every CMS mutation (event save / restore, media actions, cleanup, `expireEventContent`) calls
  `requireAdmin()` first. There is no public API route for the CMS.
- The database repeats the validation (constraints, RLS), so a bug in the app cannot store an unsafe
  registration link or file type.

### Inventory corrections (owner-approved only)

Identity is never created in the CMS. An official inventory change (e.g. INV-01, decisions log) is made in
`src/data/events/inventory.ts` (appended at the end of its vertical so no other event's order or card art
changes), with the identity snapshot and count tests updated in the same change. The database then needs
one content row for the new slug: `npm run cms:seed` inserts rows **only for slugs that have none** — all
NULL / "not-open", no source — and never overwrites or deletes existing rows. No migration is needed (the
schema does not list slugs). Until the seed runs, the public site still shows the new event (all TBA,
from the repository) and its admin editor asks for the seed.

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
   - **`SUPABASE_URL` must also be available at build time** (`next build`): `next.config.ts` derives the
     image optimizer's `remotePatterns` from it, and the built configuration is what the server uses.
     Built without it, uploaded event images are not rendered (the abstract art shows) or, if the runtime
     has it, the optimizer refuses them with HTTP 400. It must be the plain `https://<project>.supabase.co`
     origin — an `http://` (local) URL is not accepted for images.
   - After a deployment, check `.next/images-manifest.json` (or the host's build output) lists exactly one
     remote pattern: that host and `/storage/v1/object/public/ashwamedh-images/events/**`.
4. Run `npm run cms:seed` once (from a trusted machine or CI), then deploy.
5. Later schema changes are new migration files, reviewed and applied the same way.

### Known limitations

- The sign-in throttle is still per instance (it moves to the database later).
- Storage images are not rendered until 10.4 (see above).
- The seed fills missing rows only; it does not copy later repository edits into existing rows. Once
  seeded, the database is the source of truth for content.

## 10.3 — Event editor (implemented)

### Routes

| Route                  | What it does                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `/admin/events`        | The 41 frozen events by vertical: content entered or all TBA, registration status, last update (IST).                                        |
| `/admin/events/[slug]` | Editor for one event. Identity (name, vertical, department, slug) is shown read-only. Unknown slugs 404; there is no way to create an event. |

Both call `requireAdmin()`; the proxy also redirects signed-out requests. A notice says when the public site
reads repository content (`CMS_CONTENT_SOURCE` ≠ `database`), because saves are then not published.

### Editable vs fixed

| Editable (content)                                                                                                                                                                                                       | Fixed (identity / later phases)                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Description, rules, eligibility, participation, team size, fee, date, time, venue, registration status / Google Form link / deadline, guidelines PDF link, coordinators (name, designation, phone, email, order), source | Slug, name, department, vertical, order (repository). Event image and uploaded files (10.4, shown read-only). No prize fields. No Cultural Night registration. |

An empty field is saved as `NULL` and the site shows TBA / Coming Soon.

### Save flow

```
editor form (client, useActionState) → editorAction (Server Action; intent save | restore)
  requireAdmin() → slug ∈ inventory → validateEventForm() (src/lib/cms/event-form.ts)
  → buildEvent() final check → rpc cms_save_event (one transaction) → expireEventContent(slug)
```

- **Validation** (server; the database repeats it): trim, blank → NULL; length limits; registration open
  only with an official Google Form (`registrationHref`); guidelines link `https://` or `/docs/…`
  (`pdfHref`); coordinator phone / email (`contactHref`); a complete source as soon as any content — or an
  image / uploaded file — exists; finally `buildEvent()` must accept the result.
- **`cms_save_event`** (`supabase/migrations/…_cms_event_editor.sql`): locks the row, compares
  `updated_at` with the version the editor loaded (optimistic concurrency), writes the previous content and
  coordinators to `events_content_revisions`, updates the editable columns only (image / file columns are
  untouched), replaces the coordinators — all or nothing. Executable by the service role only.
- **Outcomes in the UI:** field errors with a linked summary (focus moves to it, values are kept); saved /
  restored (with a link to the public page); conflict ("changed in another tab or session" — nothing saved,
  the edits stay in the form); database failure ("nothing was changed"); not seeded. An "Unsaved changes"
  indicator and a leave-page warning guard unsaved edits.
- **Revisions:** every save keeps the previous version; the editor lists the latest 20 and can restore one
  (after a confirmation). A restore is validated like an edit and is itself undoable. Since 10.4 it runs
  through `cms_restore_event`, which also restores media links (see 10.4).

### Event pages refresh after a save (proxy guard)

Event pages are prerendered and tagged `cms:event:<slug>`. With `dynamicParams = false`, Next.js 16 does
not re-render such a page once its tag is expired — it keeps serving the old page. `/events/[slug]`
therefore has `dynamicParams = true`, and `src/proxy.ts` lets only exact inventory / former slugs reach the
route; any other value (unknown, wrongly cased, encoded) is rewritten to the 404 page. Without the guard,
every unknown URL would be rendered and cached on disk, and on case-insensitive file systems a URL such
as `/events/Hackathon` would overwrite the real page's cache entry. Verified: after a save, the next visit
to that event (and its listing) shows the new content; other event pages stay cached; unknown URLs return
404 and add nothing to the route cache.

## 10.4 — Event media (10.4.1–10.4.6 implemented)

Guidelines PDFs and event images, uploaded by the admin. Decisions D1–D8 are in the 10.4 audit; the
the cleanup (10.4.6) is described below.

### Database (`…_cms_media.sql`, `…_cms_trigger_function_grants.sql`)

- Private bucket `ashwamedh-staging` (10 MB; PDF, JPEG, PNG, WebP), no storage policies.
- `cms_files.width` / `height` (images: both required, each ≤ 4096, product ≤ 16,000,000 — D6) and
  `detached_at` (when a file stopped being used; the cleanup grace counts from it).
- The event → file foreign keys are `ON DELETE RESTRICT`: a file in use cannot be deleted.
- `cms_upload_tickets`: one row per upload, bound to the event, the kind and a server-generated
  `events/<slug>/<uuid>.<ext>` path; valid 15 minutes (at most one hour); `issued → processing →
finalized | failed`; a processing claim older than 10 minutes may be taken over.
- RPCs (service role only): `cms_set_event_media` (attach / remove, versioned, with a revision; attaching
  replaces an `image_path` / `guidelines_url`, which stays in the revision — D2), `cms_finalize_upload`
  (file row + link + ticket in one transaction; a repeat returns the same file) and `cms_restore_event`
  (D5: restores links whose file still exists and reports the others as missing).
- The two trigger functions are no longer executable through `PUBLIC` (security fix); triggers still fire.

### Upload flow (server: `src/lib/cms/media-admin.ts`, actions: `src/app/admin/events/media-actions.ts`)

```
requestMediaUploadAction → requireAdmin → slug ∈ inventory → checkUploadRequest (kind, name, type, size)
  → event has a source (D3) and the editor's version → ticket row → signed upload URL (staging, no upsert)
browser → PUT the file to the signed URL (10.4.5)
finalizeMediaUploadAction → requireAdmin → claim the ticket (event + kind + unexpired, one winner)
  → download the staging object → size = requested size → validateUpload (type from bytes, extension,
    limits, image structure, D6) → full decode (images) → upload THESE bytes to the public bucket, same
    path, our content type → rpc cms_finalize_upload (version check, revision) → remove the staging copy
  → expireEventContent(slug)
```

- **Remove:** `cms_set_event_media(…, NULL)` — versioned, with a revision; the file is only detached.
- **Alt text:** for the event's current image only; trimmed, ≤ 300 characters, blank = none (decorative).
- **Nothing from the browser chooses a bucket, a path or a file id.** The signed upload URL is a secret for
  the signed-in admin's browser only; it is never logged or stored. Supabase signs upload URLs for two
  hours (not configurable); after the 15-minute ticket the server no longer accepts the upload, and the
  token can only write that one staging path (no overwrite), which the cleanup removes.

### Image verification

1. Header parser (`image-dimensions.ts`, pure): walks the whole PNG / JPEG / WebP structure; rejects
   damaged, truncated, animated, unsupported (lossless / arithmetic / 12-bit JPEG …) files and data after
   the image (polyglots); dimensions come from the bytes, never from the browser.
2. D6 limits (`upload-policy.ts`): each side ≤ 4096 and ≤ 16,000,000 pixels.
3. Full decode (`image-decode.ts`, sharp / libvips — installed by Next.js for its image optimizer):
   `limitInputPixels` 16,000,000, ≤ 4 channels, first frame only, `failOn: "warning"`, a 15-second
   timeout; `stats()` reads every pixel without keeping an output image. Format and dimensions must equal
   the parser's. If sharp cannot be loaded, images are refused (fails closed).

Limits: decoding proves the data decodes, not that it is the intended picture — some damage inside a
JPEG or lossy WebP scan decodes to wrong pixels without an error. Strict `failOn: "warning"` may refuse
unusual but viewable files (re-exporting fixes them). EXIF orientation is not applied; public rendering
must handle it (10.4.4).

### Failures and recovery (Storage and the database are not atomic)

| Failure                                       | Result                                                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Signed URL cannot be created                  | Ticket closed as failed                                                                                                      |
| Upload never arrives / Storage read fails     | Claim given back (`issued`); the admin can retry                                                                             |
| Bytes rejected                                | Ticket failed, staging copy removed; nothing public written                                                                  |
| Public write fails                            | Claim given back; staging copy kept for the retry                                                                            |
| RPC fails with a database error (rolled back) | Public copy removed, ticket failed, staging removed                                                                          |
| RPC outcome unknown (network)                 | Nothing deleted; if the ticket turns out finalized it is a success, otherwise it stays `processing` (retry after 10 minutes) |
| Finalize called again                         | Same file returned (idempotent)                                                                                              |
| Expired ticket                                | Closed as failed, staging copy removed                                                                                       |

Verified live once (10.4.3, generated test files, then removed by ID): a browser-style PUT to the signed URL
works without an API key; anonymous reads and listings of the staging bucket are refused (HTTP 400);
finalized files are served publicly (200, correct type); a repeated finalize returns the same file; a
replacement detaches the old file; an HTML payload declared as PNG is rejected and never reaches the
public bucket; removal unlinks both media.

A public copy is written under a path no row refers to until the transaction commits, so a public file is
never linked before it is fully validated. Leftovers (staging objects, unreferenced public objects) are for
the cleanup (10.4.6, below), which checks references, active tickets and the 24-hour grace first.

### Public rendering (10.4.4)

- **Data:** `recordToDetails` (`src/lib/cms/mapping.ts`) turns a linked file into its public URL only when it is
  exactly what the media service stores for that event — the right bucket and `events/<slug>/<uuid>.<ext>`
  (images jpg / png / webp, guidelines pdf). Anything else is ignored (abstract art / "Coming Soon").
  `EventRecord.imageAlt` carries the image's admin-entered alt text (`null` without one or without an
  image).
- **Allowlist:** `eventImageSrc(image, slug)` accepts repository images in `/images/events/` as before, and an
  uploaded image only as the exact text
  `<SUPABASE_URL origin>/storage/v1/object/public/ashwamedh-images/events/<this event's slug>/<uuid>.<jpg|png|webp>`
  — no normalising, so other hosts, schemes, ports, credentials, buckets, events, encoded or traversal
  paths, query strings, fragments and other names or extensions never match. Without `SUPABASE_URL` no
  uploaded image is shown.
- **Optimizer (D8):** `images.remotePatterns` is built from `SUPABASE_URL` (`src/lib/storage-images.ts`):
  https, that host, no port, `/storage/v1/object/public/ashwamedh-images/events/**`, no query. Redirects are
  not followed (`maximumRedirects: 0`) and source images are capped at 5 MB (`maximumResponseBody`). The
  optimizer applies EXIF orientation (sharp `rotate()`; verified with rotated JPEGs) and strips it.
- **Rendering:** `EventImage` (cards and the event-detail header, unchanged layout) uses the official alt
  text when there is one, otherwise `alt=""` (decorative — the event name is the adjacent heading). The
  guidelines PDF button links the mapped Storage URL, or an approved `guidelines_url`; otherwise "Coming
  Soon". Stored width / height are the encoded ones (before orientation); rendering does not use them.
- **Caching:** unchanged — event data stays tagged `cms:event:<slug>` / `cms:events` and is refreshed by the
  media actions through `expireEventContent(slug)`. Every upload has a new uuid URL, so a replaced image is
  never served from an old cache entry.

### Admin media panels (10.4.5)

`/admin/events/[slug]` has an **Event files** section between the text form and the version history, with
an **Event image** and a **Guidelines PDF** panel (`src/components/admin/media-panel.tsx`, inside
`event-editor.tsx`):

- Shows the current file (name, size, upload time; image preview, stored dimensions and alt text), or the
  linked path / URL an upload would replace (D2), or what the public site shows without one.
- Upload / Replace: client-side type and size check (guidance only), ticket, direct upload to staging with
  a progress bar, then server finalization; replacing asks for confirmation. Remove asks for confirmation
  and only unlinks. The image's alt text can be edited (≤ 300 characters, empty = decorative).
- Blocked, with the reason shown and linked to every control: until the content source is saved (D3),
  while the text form has unsaved changes (D7), while the page refreshes, or while the other panel works.
- After any successful change the page data is refreshed and the form re-created from it, so text saves
  and file changes never use a stale version; notices (including "the restored version used a file that
  no longer exists" — D5) survive the refresh. The guidelines link field refuses a link while an uploaded
  PDF is attached (server validation).
- Accessibility: labelled controls with hints, `role="progressbar"` with value, status in a polite live
  region, errors as `role="alert"` with an icon, all targets ≥ 44 px, one column on narrow screens.

**Known limitation — deleted files can stay reachable.** Removing or deleting a file stops the site from
linking it, but it does not purge copies that were already cached. Public media is stored with
`Cache-Control: max-age=86400` (one day; `PUBLIC_CACHE_MAX_AGE` in `media-admin.ts`, a year before the
10.4.4 review). That bounds normal freshness only:

- **Supabase CDN:** may keep serving a deleted public object until its cached copy expires; Storage
  deletion does not guarantee an immediate purge.
- **Next.js image optimizer:** an optimized copy is fresh for max(`minimumCacheTTL` 4 h, origin max-age)
  = one day (`Cache-Control: public, max-age=86400, must-revalidate` on `/_next/image`). After that it is
  served **stale** while Next.js revalidates in the background — and when revalidation fails because the
  source is gone, Next.js keeps the old copy (stale-on-error). Verified on `next start`: after the source
  image was deleted, the already-optimized width kept returning 200 (`HIT` / `STALE`); only widths never
  optimized before returned 400. There is no invalidation API: the copy stays until
  `<distDir>/cache/images` is deleted, the disk cache evicts it, or a new deployment starts with an empty
  cache (hosted optimizers have their own cache rules).

URLs are unguessable (uuid) and no longer linked from any page, but anyone who kept one may still load it.
For a file that must disappear at once, follow the runbook below.

### Cleanup of unused files (10.4.6)

`npm run cms:cleanup` (trusted machine, service key — dry run; add `-- --apply` to delete) and the admin
**Files** page (`/admin/files`: dry-run list, then "Delete N unused items" after a confirmation) run the same
code (`src/lib/cms/cleanup.ts`):

- **Deletes, within `events/` only:** file rows no event links, unused for ≥ 24 hours (since
  `detached_at`, or since upload for a row never attached) — row first, then its object; public objects
  without a row, older than 24 hours; staging objects older than 1 hour.
- **Never deletes:** anything an event links (checked when planning, and the database's
  `ON DELETE RESTRICT` refuses it at deletion); anything inside the grace; anything an active upload ticket
  (issued and unexpired, or processing — of any age) points to; anything outside `events/`.
- **Re-checked right before each deletion:** the row is deleted only if it is still unused for the whole
  grace (a re-attached file is skipped); objects are deleted only if no row and no active upload appeared.
  The browser never says what to delete; the server plans again.
- **Failures are recoverable:** a row whose object could not be removed leaves an orphan object that the
  next run removes. Running it again is safe. The CLI exits non-zero when anything failed.
- Revisions may still name a deleted file; restoring one leaves that slot empty and says so (D5).
- Run it daily or after media work, dry run first.
- **Stuck `processing` tickets** (an upload whose finalization was interrupted and never retried) keep
  their objects protected indefinitely; the cleanup never forces them. Recovery, by a person with database
  access: (1) if the ticket's `file_id` is set or a `cms_files` row exists at its `object_path` and an
  event links it, the upload actually completed — set the ticket to `finalized`; (2) otherwise, once it is
  older than an hour, set it to `failed` (`finished_at = now()`, `failure = 'Recovered manually'`). The
  next cleanup then removes its leftover objects after the usual grace. The admin simply uploads the file
  again.

### Runbook — a file must disappear now (e.g. published by mistake)

Deleting a Storage object does **not** immediately purge copies cached by the Supabase CDN or by the
Next.js image optimizer.

1. In the event's editor, **Remove** the file (or replace it). The site stops linking it on the next visit
   of the event page and listings.
2. Do not bypass the 24-hour grace in the cleanup. If the object must go before that, a person with
   project access deletes it deliberately: confirm in the database that no event links the file
   (`image_file_id` / `guidelines_file_id`), delete its `cms_files` row (the database refuses if it is still
   linked), then delete exactly that object in the Supabase dashboard. Record what was removed and why.
3. **Supabase CDN:** cached copies can be served until they expire (public media is stored with
   `max-age=86400`, one day). If the plan offers cache purging, purge that exact URL; otherwise allow up to a
   day.
4. **Next.js image optimizer:** an optimized copy keeps being served (stale copies are kept even when the
   source is gone). Self-hosted: delete `<distDir>/cache/images` (all optimized images are rebuilt on
   demand) or redeploy; a hosting provider's optimizer has its own cache — use its purge or redeploy.
5. Check: the Storage URL and `/_next/image?url=…` for that file no longer return the image (each width
   that was requested is a separate cached copy).

## 10.5 — Festival settings

- **Migration** `…_cms_settings.sql` (additive): one-row `festival_settings` (contact phone / WhatsApp /
  email, `social_links` — at most 8 https links, Cultural Night Day 1 / Day 2 dates, time and venue of the
  five fixed schedule rows, four vertical taglines, source), `festival_settings_revisions`, and
  `cms_save_settings(expected_version, content)` (lock, version check, revision, update). Same rules as
  event content: any value needs a complete source; RLS on; service role only.
- **Public:** `loadFestivalSettings()` (`src/lib/cms/settings.ts`) — repository mode returns the repository
  values (`src/lib/festival-settings.ts`); database mode reads the row, tagged `cms:settings`. Used by the
  footer (contact, social links), Contact page, schedule panel, Cultural Night band and the vertical
  taglines (cards, listings, Cultural Night band). Empty values keep today's TBA / placeholder output.
- **Admin:** `/admin/settings` (dashboard tiles Schedule, Cultural Night, Festival Settings, Contact /
  Footer). Save refreshes `cms:settings` only; since the footer is on every page, every page that read the
  settings is regenerated on its next visit.
- **Fixed in the repository:** schedule row titles and links, "What's On", the number of Cultural Night
  days. **Deferred:** schedule day tabs — not shown until the official days are confirmed (OD-04); they need
  a decision on per-day rows.

## 10.6 — Gallery and Team

- **Migration** `…_cms_collections.sql`: `gallery_items` (file → `cms_files` gallery-image, RESTRICT; caption;
  source; draft / published; order) and `team_members` (name, role, group; source; draft / published;
  order — **no photos**, no personal contact details). Upload tickets gain kind `gallery` (path
  `gallery/<uuid>.<ext>`, no event); event tickets keep exactly their rules. RPCs (service role only):
  `cms_finalize_gallery_upload` (ticket → file row → draft item, one transaction, idempotent),
  `cms_delete_gallery_item` (versioned; the file is only detached), `cms_reorder_gallery` / `cms_reorder_team`
  (the whole order at once). RLS on, nothing for anon / authenticated.
- **Uploads** reuse the 10.4 pipeline unchanged (signed staging upload, byte validation, D6, full decode,
  publish exactly the validated bytes, compensation, idempotent finalize); `media-admin.ts` shares its
  claim / publish / link steps between events and the gallery.
- **Public:** `/gallery` and `/team` show **published** items only (`cms:gallery` / `cms:team`); with none — or in
  repository mode, or before the migration — the exact Coming Soon state. Gallery: 3 / 2 / 1 columns, caption
  below, no lightbox; only exact `ashwamedh-images/gallery/<uuid>.<ext>` URLs (`galleryImageSrc`, optimizer
  pattern `gallery/*`). Team: a heading per group, name and role cards.
- **Admin:** `/admin/gallery` (upload as Draft with caption, alt text and source; edit, publish, reorder, delete)
  and `/admin/team` (add, edit, publish, reorder, delete). Every change is versioned and refreshes only that
  page's data.
- **Content rules:** official items only, each with its source. A previous edition's photo states its
  edition / year in the caption (OD 10.6-3). Team photos need verified official authorization and are not
  supported yet.
- **Cleanup** also covers `gallery/`: a file a gallery item uses is in use; a deleted item's file goes after
  the 24-hour grace.

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

| Milestone | Scope                                                                                                                                                                        |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10.2      | Done — Supabase schema and storage, idempotent seed, database-backed data layer through `buildEvent()`, targeted revalidation helper.                                        |
| 10.3      | Done — event editor with server-side validation, atomic save (`cms_save_event`), optimistic concurrency, revisions with restore, targeted refresh (proxy slug guard).        |
| 10.4      | 10.4.1–10.4.6 done (schema, validation, media service, public rendering, admin panels, cleanup); final QA (10.4.7) next.                                                     |
| 10.5      | Done (migration applied 2026-10-11) — festival settings: contact, social links, Cultural Night dates, schedule times / venues, taglines. Schedule day tabs deferred (OD-04). |
| 10.6      | Done (migration applied 2026-10-10) — Gallery (official images via the 10.4 pipeline) and Team (names, roles, groups; no photos), draft / published, ordered.                |
| 10.7      | QA, security review, backup / rollback drill, runbook.                                                                                                                       |
