import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Trigger function privileges (20261010130000) on a real PostgreSQL (PGlite): before the fix the two
 * trigger functions were executable through PUBLIC; after it only the owner and service_role keep
 * EXECUTE, and every trigger still fires for writers without EXECUTE.
 */

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");
const FIX = "20261010130000_cms_trigger_function_grants.sql";
const FUNCTIONS = ["public.cms_touch_updated_at()", "public.cms_check_event_files()"];
let db: PGlite;
let beforeFix: Record<string, boolean>;

const one = async <T>(sql: string, params: unknown[] = []) =>
  (await db.query<T>(sql, params)).rows[0]!;
const canExecute = async (role: string, fn: string) =>
  (await one<{ ok: boolean }>("select has_function_privilege($1, $2, 'execute') as ok", [role, fn]))
    .ok;
const publicCanExecute = async (fn: string) =>
  (
    await one<{ ok: boolean }>(
      "select coalesce(bool_or(a.grantee = 0 and a.privilege_type = 'EXECUTE'), false) as ok from pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where p.oid = $1::regprocedure",
      [fn],
    )
  ).ok;
async function asRole<T>(role: string, run: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}`);
  try {
    return await run();
  } finally {
    await db.exec("reset role");
  }
}
async function fails(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
    return "";
  } catch (error) {
    return (error as Error).message;
  }
}

beforeAll(async () => {
  db = new PGlite();
  // Supabase stubs, plus the hosted project's default privileges so the ACLs match the live ones
  // (live: {=X/postgres, postgres=X/postgres, service_role=X/postgres} before the fix).
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema storage;
    create table storage.buckets (id text primary key, name text not null, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;`);
  const files = readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const file of files.filter((f) => f < FIX))
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  beforeFix = {};
  for (const fn of FUNCTIONS) {
    beforeFix[`public ${fn}`] = await publicCanExecute(fn);
    for (const role of ["anon", "authenticated"])
      beforeFix[`${role} ${fn}`] = await canExecute(role, fn);
  }
  for (const file of files.filter((f) => f >= FIX))
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));

  await db.exec(`
    insert into public.events_content (event_slug) values ('hackathon');
    insert into public.cms_files (id, bucket, path, original_name, mime_type, size_bytes, category)
      values ('00000000-0000-4000-8000-000000000001', 'ashwamedh-documents',
              'events/hackathon/00000000-0000-4000-8000-000000000001.pdf', 'rules.pdf',
              'application/pdf', 1000, 'document');
    -- A writer with table access (and, like service_role, past RLS) but no EXECUTE on any function.
    create role trigger_writer bypassrls;
    grant usage on schema public to trigger_writer;
    grant select, insert, update on public.events_content, public.cms_files, public.event_coordinators
      to trigger_writer;`);
}, 60_000);
afterAll(() => db?.close());

describe("trigger function privileges", () => {
  it("reproduces the live gap before the fix: PUBLIC, anon and authenticated could execute", () => {
    expect(Object.values(beforeFix).every(Boolean), JSON.stringify(beforeFix)).toBe(true);
  });

  it("after the fix PUBLIC, anon and authenticated cannot execute either function", async () => {
    for (const fn of FUNCTIONS) {
      expect(await publicCanExecute(fn), `public ${fn}`).toBe(false);
      for (const role of ["anon", "authenticated", "trigger_writer"])
        expect(await canExecute(role, fn), `${role} ${fn}`).toBe(false);
    }
  });

  it("keeps the owner and service_role grants and leaves other functions unchanged", async () => {
    for (const fn of FUNCTIONS) {
      expect(await canExecute("service_role", fn), `service_role ${fn}`).toBe(true);
      expect(await canExecute("postgres", fn), `postgres ${fn}`).toBe(true);
    }
    const save = "public.cms_save_event(text, timestamptz, jsonb, jsonb)";
    expect(await canExecute("service_role", save)).toBe(true);
    expect(await canExecute("anon", save)).toBe(false);
  });

  it("a direct call is refused with a permission error", async () => {
    for (const fn of ["public.cms_touch_updated_at()", "public.cms_check_event_files()"])
      for (const role of ["anon", "authenticated"])
        expect(await fails(() => asRole(role, () => db.query(`select ${fn}`)))).toMatch(
          /permission denied for function/,
        );
  });

  it("cms_touch_updated_at still fires for a writer without EXECUTE", async () => {
    const stale = "2000-01-01 00:00:00+00";
    const touched = await asRole("trigger_writer", async () => {
      await db.query(
        "update public.events_content set updated_at = $1 where event_slug = 'hackathon'",
        [stale],
      );
      await db.query("update public.cms_files set updated_at = $1", [stale]);
      await db.query(
        "insert into public.event_coordinators (event_slug, name, sort_order) values ('hackathon', 'Test Person', 0)",
      );
      await db.query("update public.event_coordinators set updated_at = $1", [stale]);
      return one<{ events: boolean; files: boolean; coordinators: boolean }>(
        `select
          (select updated_at > $1::timestamptz from public.events_content where event_slug = 'hackathon') as events,
          (select bool_and(updated_at > $1::timestamptz) from public.cms_files) as files,
          (select bool_and(updated_at > $1::timestamptz) from public.event_coordinators) as coordinators`,
        [stale],
      );
    });
    expect(touched).toEqual({ events: true, files: true, coordinators: true });
  });

  it("cms_check_event_files still rejects a wrong file kind for a writer without EXECUTE", async () => {
    const error = await fails(() =>
      asRole("trigger_writer", () =>
        db.query(
          "update public.events_content set image_file_id = '00000000-0000-4000-8000-000000000001' where event_slug = 'hackathon'",
        ),
      ),
    );
    expect(error).toMatch(/image_file_id must reference an event-image file/);
  });

  it("the service-role save RPC still runs its triggers", async () => {
    const before = (
      await one<{ v: string }>(
        "select updated_at::text as v from public.events_content where event_slug = 'hackathon'",
      )
    ).v;
    await asRole("service_role", () =>
      db.query("select public.cms_save_event($1, $2::timestamptz, $3::jsonb, $4::jsonb)", [
        "hackathon",
        before,
        JSON.stringify({
          venue: "Test Hall",
          source_kind: "owner-confirmed",
          source_reference: "Test fixture",
          source_date: "2026-10-10",
        }),
        "[]",
      ]),
    );
    const after = await one<{ venue: string; newer: boolean }>(
      "select venue, updated_at > $1::timestamptz as newer from public.events_content where event_slug = 'hackathon'",
      [before],
    );
    expect(after).toEqual({ venue: "Test Hall", newer: true });
  });
});
