# ASHWAMEDH 2026 — Operations runbook

For whoever deploys and runs the site and its admin CMS. Architecture details:
[docs/architecture/admin-cms.md](../architecture/admin-cms.md). Owner decisions:
[docs/requirements/decisions-log.md](../requirements/decisions-log.md).

Golden rules: never invent official content; never print or commit secrets; never run anything
against the live database or Storage that is not a reviewed migration, the seed, or the cleanup — and
always dry-run first.

## 1. Configuration

| Variable                                                        | Where                    | Notes                                                                                                    |
| --------------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------- |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` | server runtime           | Hash from `npm run admin:hash`; secret ≥ 32 random characters. All three valid, or sign-in is disabled.  |
| `SUPABASE_URL`                                                  | **build time** + runtime | Plain `https://<project>.supabase.co`. Build time: the image optimizer's allowlist is generated from it. |
| `SUPABASE_SERVICE_ROLE_KEY`                                     | server runtime           | Secret. Never `NEXT_PUBLIC_…`.                                                                           |
| `CMS_CONTENT_SOURCE`                                            | build time + runtime     | `repository` (default) or `database`.                                                                    |
| `SUPABASE_DB_URL`                                               | operator machine only    | For `supabase db push` / read-only checks. Never on the web host.                                        |

Local: `.env.local` or `.env` (both git-ignored; `.env.local` wins). One line per name — a later empty
line overrides an earlier value. Restart the server after any change.

## 2. Deploy checklist

1. `npm run check` and `npm run build` pass locally (the build in the mode you deploy).
2. Pending migrations: `npx supabase db push --db-url <DB_URL> --dry-run` — read the list; only reviewed
   migrations. Then apply (`db push`) **before** deploying code that needs them. Code from 10.5 on
   tolerates a missing settings / gallery / team table (shows the repository / Coming Soon state), so
   the order is safe either way.
3. New inventory slugs: `npm run cms:seed` (inserts missing rows only, never overwrites).
4. Deploy with the variables above. After deploy:
   - `.next/images-manifest.json` (or the host's build output) lists exactly two remote patterns: the
     project host with `/storage/v1/object/public/ashwamedh-images/events/**` and `…/gallery/*`.
   - Response headers on `/`, an event page and `/admin/login`: `X-Content-Type-Options: nosniff`,
     `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`.
   - `/admin` redirects to the login; the login does **not** say "not configured".
5. **HSTS is not set yet.** Add `Strict-Transport-Security` (in `next.config.ts`, next to the other
   headers) only once the production domain is confirmed HTTPS-only, including any subdomains you
   would cover. Start with a short `max-age`; no `preload` without a separate decision. No CSP yet.

## 3. Migrations and rollback

Migrations are forward-only and are never edited after being applied. A rollback is a **new**
reviewed migration (or a provider restore, §5). What undoing each would mean:

| Migration                                    | Adds                                                           | Undoing it                                                                          |
| -------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `20261008120000_cms_content`                 | Core tables, constraints, triggers                             | Drops all CMS content — restore from backup instead.                                |
| `20261008120100_cms_storage`                 | Public documents / images buckets                              | Only when empty.                                                                    |
| `20261009120000_cms_event_editor`            | Revisions table, `cms_save_event`                              | Loses event history.                                                                |
| `20261010120000_cms_media`                   | Staging bucket, file dimensions, RESTRICT FKs, tickets         | Unlink media first; loses tickets.                                                  |
| `20261010130000_cms_trigger_function_grants` | Revokes trigger-function EXECUTE from PUBLIC                   | Never undo (security fix).                                                          |
| `20261011120000_cms_settings`                | `festival_settings`, revisions, `cms_save_settings`            | Loses festival settings; the site falls back to repository values.                  |
| `20261012120000_cms_collections`             | Gallery / team tables, gallery tickets, RPCs                   | Delete gallery items first (files then go through the cleanup); team rows are lost. |
| `20261013120000_cms_ticket_file_history`     | Drops the ticket → file foreign key; `file_id` becomes history | One-way in practice — see the note below.                                           |

**Note — undoing `20261013120000_cms_ticket_file_history`.** The key can technically be added back
without touching existing rows: `ADD CONSTRAINT … FOREIGN KEY (file_id) REFERENCES cms_files (id) ON DELETE
SET NULL NOT VALID` skips the check of tickets that already name a purged file. But restoring
`ON DELETE SET NULL` brings back exactly what this migration removed: every later file deletion (the
cleanup) would rewrite the finalized tickets that point at it. Restoring the full original guarantee —
`VALIDATE CONSTRAINT`, or adding the key without `NOT VALID` — fails while any ticket names a purged file,
and could only pass by resolving those dangling ids (for example setting them to NULL), which means
modifying finalized ticket records — the very thing this migration exists to prevent. Treat it as
one-way; decide any change to it as a new reviewed migration.

The version prefix of a migration file is a naming timestamp, not the date it was applied; the applied
history is `supabase migration list`.

**Content rollback without a migration:** event content → the editor's Version history (restores text,
coordinators and still-existing media). Festival settings → previous versions are kept in
`festival_settings_revisions` (no restore UI yet: re-enter the values from the revision). Gallery / Team →
no history; a deleted gallery image's file stays 24 hours (it can be re-uploaded meanwhile from the
original).

## 4. Routine operations

- **Unused media:** `npm run cms:cleanup` (dry run) → read it → `npm run cms:cleanup -- --apply`, or the
  admin **Files** page. Only unreferenced files past the 24-hour grace, orphaned objects past the grace,
  and staging objects older than an hour; never files in use or with an active upload.
- **A file must disappear now:** follow the runbook in
  [admin-cms.md](../architecture/admin-cms.md#runbook--a-file-must-disappear-now-eg-published-by-mistake)
  (CDN and image-optimizer caches are not purged by deleting the object).
- **Stuck upload tickets:** see "Stuck `processing` tickets" in admin-cms.md (manual, after inspection).
- **Admin password:** `npm run admin:hash` → replace `ADMIN_PASSWORD_HASH` → restart.
- **Sign everyone out:** replace `ADMIN_SESSION_SECRET` → restart.
- **Service-role key leaked / rotated:** rotate in the Supabase dashboard (API keys), update
  `SUPABASE_SERVICE_ROLE_KEY` on the host and locally, redeploy; check the old key no longer works.

## 5. Backup and restore

- **Provider backups / point-in-time recovery: NOT VERIFIED.** Confirm in the Supabase dashboard
  (Database → Backups) which backups and retention the plan provides. Until confirmed, assume none
  beyond the logical export below.
- **Logical export drill (done in 10.7):** a read-only `SELECT` export of every CMS table (rows as JSON,
  plus per-table checksums computed in the database, in primary-key order, UTC) into a git-ignored scratch
  directory outside the repository; then a fresh PGlite with all migrations, the rows inserted in
  dependency order with every constraint and trigger active, and the checksums recomputed. Result in
  10.7: all 9 tables matched. `supabase db dump` was not used: it needs Docker, which this machine does
  not have.
- **Storage is not in the export.** Objects are only listed (bucket, name, size, type). Keep the official
  originals of every uploaded file outside the CMS.
- **Never** run a restore, `db reset` or bulk SQL against the live database. A real restore is done from
  the provider's backups into a new project, verified, then switched to — with approval.
- The export contains live data: never print it, commit it or upload it elsewhere; delete it after use.

## 6. Checks before a release

`npm run check` (includes the migration-wide security-invariant test:
`tests/unit/cms-security-invariants.test.ts`), `npm run build` in both content modes, the route crawl /
axe checks, `npm audit --omit=dev` (production dependencies; 0 findings in 10.7 — the dev-only ESLint
toolchain reports `braces` DoS advisories with no safe fix), and a read-only permission query: every
public table RLS on, no policies, no grants for anon / authenticated; no `cms_*` function executable by
them; no storage policies on the CMS buckets.

## 7. Open decisions and future requirements

- **HSTS** — pending confirmation that the production host is HTTPS-only (§2).
- **Admin dashboard "Settings" tile** — still "Not available yet"; what it should manage is undecided.
- **Schedule day tabs** — not shown until the official days are confirmed (OD-04); per-day rows need a
  decision.
- **Team photos** — not supported; need a verified official authorization / consent process first.
- **Homepage countdown timer (future requirement, not implemented).** Not in the locked reference and no
  official festival date / time exists. Before it can be built it needs: (1) an official date and start
  time with its source; (2) design approval (placement and look are not in the reference); (3) explicit
  Asia/Kolkata (IST) handling, independent of the visitor's time zone; (4) defined behaviour before the
  date is set (hidden — never a guessed target), during the festival and after it ends.
- **QA artifacts from the 10.6 live test** — synthetic gallery file `ebbf2cc6-66f3-4e6c-9db4-df9a88c4c06b`
  (object `ashwamedh-images/gallery/28adcf10-67b4-41fb-aefd-77f57b641248.png`): **deleted on 2026-10-11** by
  `npm run cms:cleanup -- --apply`, after the migration `20261013120000_cms_ticket_file_history` had been applied
  to the live database and verified. The finalized upload ticket `c8ff2bb0-adf5-4c19-a1f9-16e34f8cc110` was
  preserved unchanged (its full row, including the historical `file_id`, matched before and after). Its
  long-term retention decision is still pending.
- **Deployment** — the production host, its environment variables and CDN purge options are not
  verified from this repository.
