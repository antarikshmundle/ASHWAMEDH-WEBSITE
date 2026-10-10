import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** Phase 10.5 festival settings migration on a real PostgreSQL (PGlite). */

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");
let db: PGlite;
const SOURCE = {
  source_kind: "owner-confirmed",
  source_reference: "Test fixture",
  source_date: "2026-10-11",
};

async function fails(sql: string, params: unknown[] = []): Promise<string> {
  try {
    await db.query(sql, params);
    return "";
  } catch (error) {
    return (error as Error).message;
  }
}
const version = async () =>
  (await db.query<{ v: string }>("select updated_at::text as v from public.festival_settings"))
    .rows[0]!.v;
const save = async (content: object, expected?: string) =>
  db.query("select public.cms_save_settings($1::timestamptz, $2::jsonb)::text as v", [
    expected ?? (await version()),
    JSON.stringify(content),
  ]);
const row = async () =>
  (await db.query<Record<string, unknown>>("select * from public.festival_settings")).rows[0]!;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema storage;
    create table storage.buckets (id text primary key, name text not null, public boolean,
      file_size_limit bigint, allowed_mime_types text[]);`);
  for (const file of readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
}, 60_000);
afterAll(() => db?.close());

describe("festival settings — schema", () => {
  it("creates exactly one all-empty row", async () => {
    const { rows } = await db.query("select count(*)::int as n from public.festival_settings");
    expect(rows).toEqual([{ n: 1 }]);
    const settings = await row();
    for (const [key, value] of Object.entries(settings))
      if (!["id", "social_links", "created_at", "updated_at"].includes(key))
        expect(value, key).toBeNull();
    expect(settings.social_links).toEqual([]);
    expect(await fails("insert into public.festival_settings (id) values (2)")).toMatch(/check/);
  });

  it("needs a complete source as soon as anything is set", async () => {
    expect(await fails("update public.festival_settings set contact_email = 'a@b.co'")).toMatch(
      /festival_settings_content_needs_source/,
    );
    expect(
      await fails(
        `update public.festival_settings set social_links = '[{"label":"Instagram","href":"https://instagram.com/x"}]'`,
      ),
    ).toMatch(/festival_settings_content_needs_source/);
    expect(
      await fails("update public.festival_settings set source_kind = 'owner-confirmed'"),
    ).toMatch(/festival_settings_source_complete/);
  });

  it("validates contact details and social links in the database too", async () => {
    const set = (sql: string) =>
      fails(
        `update public.festival_settings set source_kind='owner-confirmed', source_reference='x', source_date='2026-10-11', ${sql}`,
      );
    expect(await set("contact_phone = '+91 98765 43210'")).toBe("");
    expect(await set("contact_phone = 'call me'")).toMatch(/check/);
    expect(await set("contact_whatsapp = '98765 43210'")).toMatch(/check/); // not international
    expect(await set("contact_whatsapp = '+91 98765 43210'")).toBe("");
    expect(await set("contact_email = 'not-an-email'")).toMatch(/check/);
    expect(await set("schedule_sports_venue = '   '")).toMatch(/check/);
    for (const bad of [
      `[{"label":"X","href":"http://x.com"}]`,
      `[{"label":"X","href":"javascript:alert(1)"}]`,
      `[{"label":"X","href":"https://user@x.com"}]`,
      `[{"label":"","href":"https://x.com"}]`,
      `[{"label":"X","href":"https://x.com","extra":1}]`,
      `{"label":"X","href":"https://x.com"}`,
      JSON.stringify(Array.from({ length: 9 }, () => ({ label: "X", href: "https://x.com" }))),
    ])
      expect(await set(`social_links = '${bad}'`), bad).toMatch(/check/);
    expect(
      await set(`social_links = '[{"label":"Instagram","href":"https://instagram.com/x"}]'`),
    ).toBe("");
    await db.exec(
      `update public.festival_settings set social_links='[]', contact_phone=null, contact_whatsapp=null, source_kind=null, source_reference=null, source_date=null`,
    );
  });
});

describe("cms_save_settings", () => {
  it("saves every column from the payload, keeps the previous version, and bumps the version", async () => {
    const before = await version();
    await save({
      ...SOURCE,
      contact_email: "fest@pce.edu.in",
      cultural_night_day1_date: "12 Feb 2027",
      schedule_inauguration_time: "10:00 AM",
      tagline_sports: "Play fair",
      social_links: [{ label: "Instagram", href: "https://instagram.com/ashwamedh" }],
    });
    const saved = await row();
    expect(saved).toMatchObject({
      contact_email: "fest@pce.edu.in",
      cultural_night_day1_date: "12 Feb 2027",
      schedule_inauguration_time: "10:00 AM",
      tagline_sports: "Play fair",
      contact_phone: null,
      social_links: [{ label: "Instagram", href: "https://instagram.com/ashwamedh" }],
    });
    expect(await version()).not.toBe(before);
    const { rows } = await db.query<{ content: Record<string, unknown> }>(
      "select content from public.festival_settings_revisions order by saved_at desc limit 1",
    );
    expect(rows[0]!.content.contact_email).toBeNull(); // the version before this save
  });

  it("clears everything (a missing key is NULL) and refuses stale versions and bad payloads", async () => {
    await save({});
    const cleared = await row();
    expect(cleared.contact_email).toBeNull();
    expect(cleared.social_links).toEqual([]);
    expect(cleared.source_kind).toBeNull();
    expect(
      await fails("select public.cms_save_settings('2000-01-01'::timestamptz, '{}'::jsonb)"),
    ).toMatch(/cms_version_conflict/);
    expect(
      await fails("select public.cms_save_settings($1::timestamptz, '[]'::jsonb)", [
        await version(),
      ]),
    ).toMatch(/cms_invalid_payload/);
    // Content without a source rolls back, revision included.
    const revisions = async () =>
      (
        await db.query<{ n: number }>(
          "select count(*)::int as n from public.festival_settings_revisions",
        )
      ).rows[0]!.n;
    const count = await revisions();
    expect(
      await fails("select public.cms_save_settings($1::timestamptz, $2::jsonb)", [
        await version(),
        '{"contact_email":"a@b.co"}',
      ]),
    ).toMatch(/festival_settings_content_needs_source/);
    expect(await revisions()).toBe(count);
  });

  it("is reachable by the service role only; tables are private", async () => {
    for (const role of ["anon", "authenticated"]) {
      for (const fn of [
        "public.cms_save_settings(timestamptz, jsonb)",
        "public.cms_valid_social_links(jsonb)",
      ])
        expect(
          (
            await db.query<{ ok: boolean }>(
              "select has_function_privilege($1, $2, 'execute') as ok",
              [role, fn],
            )
          ).rows[0]!.ok,
          `${role} ${fn}`,
        ).toBe(false);
    }
    expect(
      (
        await db.query<{ ok: boolean }>(
          "select has_function_privilege('service_role', 'public.cms_save_settings(timestamptz, jsonb)', 'execute') as ok",
        )
      ).rows[0]!.ok,
    ).toBe(true);
    const { rows } = await db.query(
      "select relname, relrowsecurity from pg_class where relname in ('festival_settings','festival_settings_revisions') order by relname",
    );
    expect(rows).toEqual([
      { relname: "festival_settings", relrowsecurity: true },
      { relname: "festival_settings_revisions", relrowsecurity: true },
    ]);
    const grants = await db.query(
      "select grantee from information_schema.table_privileges where table_name like 'festival_settings%' and grantee in ('anon','authenticated')",
    );
    expect(grants.rows).toEqual([]);
  });
});
