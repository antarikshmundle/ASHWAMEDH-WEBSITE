import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Security invariants across ALL migrations (Phase 10.7). Applies every migration on PGlite with
 * the hosted project's default privileges (anon / authenticated / service_role get everything on
 * new tables and functions, as Supabase grants), then checks that the migrations took them back:
 * every public table has RLS and no policies or grants for anon / authenticated, and no public
 * function is executable by them, runs as SECURITY DEFINER, or lacks a fixed search_path.
 *
 * A new migration that forgets a revoke fails here. Legitimate exceptions must be listed below
 * with a reason — never by weakening a check.
 */

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");
const CLIENT_ROLES = ["anon", "authenticated"] as const;
/** Documented exceptions (none today). Format: "table:<name>" or "function:<name>". */
const EXCEPTIONS: Record<string, string> = {};

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage;
    create table storage.buckets (id text primary key, name text not null, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;`);
  for (const file of readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
}, 60_000);
afterAll(() => db?.close());

const rows = async <T>(sql: string) => (await db.query<T>(sql)).rows;

describe("security invariants (all migrations)", () => {
  it("covers the CMS tables and functions (sanity)", async () => {
    const tables = await rows<{ t: string }>(
      "select relname as t from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'",
    );
    expect(tables.map((t) => t.t).sort()).toEqual([
      "cms_files",
      "cms_upload_tickets",
      "event_coordinators",
      "events_content",
      "events_content_revisions",
      "festival_settings",
      "festival_settings_revisions",
      "gallery_items",
      "team_members",
    ]);
    const fns = await rows<{ f: string }>(
      "select proname as f from pg_proc where pronamespace = 'public'::regnamespace",
    );
    expect(fns.length).toBeGreaterThanOrEqual(15);
  });

  it("every public table: RLS on, no policies, no privileges for anon / authenticated", async () => {
    const tables = await rows<{ t: string; rls: boolean; policies: number; grants: string[] }>(`
      select c.relname as t, c.relrowsecurity as rls,
        (select count(*)::int from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies,
        array(select distinct g.grantee || ':' || g.privilege_type from information_schema.role_table_grants g
               where g.table_schema = 'public' and g.table_name = c.relname
                 and g.grantee in ('anon', 'authenticated', 'PUBLIC') order by 1) as grants
      from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')`);
    const problems = tables
      .filter((t) => !EXCEPTIONS[`table:${t.t}`])
      .flatMap((t) => [
        ...(t.rls ? [] : [`${t.t}: RLS off`]),
        ...(t.policies ? [`${t.t}: ${t.policies} policies`] : []),
        ...t.grants.map((g) => `${t.t}: grant ${g}`),
      ]);
    expect(problems).toEqual([]);
  });

  it("no public function is executable by anon / authenticated", async () => {
    const fns = await rows<{ f: string; sig: string }>(
      "select proname as f, oid::regprocedure::text as sig from pg_proc where pronamespace = 'public'::regnamespace",
    );
    const problems: string[] = [];
    for (const fn of fns.filter((f) => !EXCEPTIONS[`function:${f.f}`]))
      for (const role of CLIENT_ROLES) {
        const [result] = await rows<{ ok: boolean }>(
          `select has_function_privilege('${role}', '${fn.sig.replace(/'/g, "''")}', 'execute') as ok`,
        );
        if (result?.ok !== false) problems.push(`${role} can execute ${fn.sig}`);
      }
    expect(problems).toEqual([]);
  });

  it("no SECURITY DEFINER; every function pins search_path", async () => {
    const fns = await rows<{ f: string; definer: boolean; config: string[] | null }>(
      "select proname as f, prosecdef as definer, proconfig as config from pg_proc where pronamespace = 'public'::regnamespace",
    );
    const problems = fns
      .filter((f) => !EXCEPTIONS[`function:${f.f}`])
      .flatMap((f) => [
        ...(f.definer ? [`${f.f}: SECURITY DEFINER`] : []),
        ...((f.config ?? []).some((c) => c.startsWith("search_path="))
          ? []
          : [`${f.f}: no search_path`]),
      ]);
    expect(problems).toEqual([]);
  });

  it("buckets: documents and images public-read, staging private; nothing else", async () => {
    expect(await rows("select id, public from storage.buckets order by id")).toEqual([
      { id: "ashwamedh-documents", public: true },
      { id: "ashwamedh-images", public: true },
      { id: "ashwamedh-staging", public: false },
    ]);
  });
});
