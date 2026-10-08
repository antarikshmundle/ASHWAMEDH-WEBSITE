import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eventDetails, eventInventory, events } from "@/data/events";
import { buildEvent } from "@/data/events/build";
import { recordToDetails } from "@/lib/cms/mapping";
import type { EventContentRecord } from "@/lib/cms/schema";
import { buildSeedPlan, runSeed, type SeedStore } from "@/lib/cms/seed";

/**
 * The real migrations on a real PostgreSQL (PGlite, in process) — Phase 10.2.
 * Supabase-only objects (roles, storage.buckets) are stubbed with the same shape.
 */

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");
let db: PGlite;

const SUPABASE_STUBS = `
  create role anon; create role authenticated; create role service_role;
  create schema storage;
  create table storage.buckets (
    id text primary key, name text not null, public boolean,
    file_size_limit bigint, allowed_mime_types text[]
  );
`;

function pgliteStore(database: PGlite): SeedStore {
  async function insert(table: string, rows: object[]) {
    for (const row of rows) {
      const columns = Object.keys(row);
      const values = Object.values(row);
      await database.query(
        `insert into public.${table} (${columns.join(", ")}) values (${columns.map((_, i) => `$${i + 1}`).join(", ")})
         on conflict do nothing`,
        values,
      );
    }
  }
  return {
    async existingSlugs() {
      const r = await database.query<{ event_slug: string }>(
        "select event_slug from public.events_content",
      );
      return new Set(r.rows.map((row) => row.event_slug));
    },
    insertEvents: (rows) => insert("events_content", rows),
    insertCoordinators: (rows) => insert("event_coordinators", rows),
    async countEvents() {
      return (
        await database.query<{ n: number }>("select count(*)::int as n from public.events_content")
      ).rows[0]!.n;
    },
  };
}

const rejects = async (sql: string, params: unknown[] = []) => {
  let message = "";
  try {
    await db.query(sql, params);
  } catch (error) {
    message = (error as Error).message;
  }
  return message;
};

const FORM = "https://forms.gle/AbC123xyz";
const SOURCE = ["owner-confirmed", "Test fixture", "2026-10-08"];
const FILE_ID = "11111111-1111-4111-8111-111111111111";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  for (const file of readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
}, 60_000);
afterAll(() => db?.close());

describe("CMS migrations (PostgreSQL)", () => {
  it("creates the content tables with row-level security and no public privileges", async () => {
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
       where relname in ('events_content','event_coordinators','cms_files') order by relname`,
    );
    expect(rows).toEqual([
      { relname: "cms_files", relrowsecurity: true },
      { relname: "event_coordinators", relrowsecurity: true },
      { relname: "events_content", relrowsecurity: true },
    ]);
    const grants = await db.query(
      `select grantee from information_schema.table_privileges
       where table_schema = 'public' and grantee in ('anon','authenticated')`,
    );
    expect(grants.rows).toEqual([]);
  });

  it("does not store event identity (names, departments, verticals)", async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_name = 'events_content'`,
    );
    const columns = rows.map((r) => r.column_name);
    for (const identity of ["name", "department", "category", "vertical"])
      expect(columns).not.toContain(identity);
    expect(columns).not.toContain("prize_pool");
    expect(columns.some((c) => c.includes("prize"))).toBe(false);
  });

  it("creates the two public buckets with type and size limits", async () => {
    const { rows } = await db.query("select * from storage.buckets order by id");
    expect(rows).toEqual([
      {
        id: "ashwamedh-documents",
        name: "ashwamedh-documents",
        public: true,
        file_size_limit: 10485760,
        allowed_mime_types: ["application/pdf"],
      },
      {
        id: "ashwamedh-images",
        name: "ashwamedh-images",
        public: true,
        file_size_limit: 5242880,
        allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
      },
    ]);
  });
});

describe("CMS seed (PostgreSQL)", () => {
  it("seeds exactly 40 rows, all NULL / not-open while the repository has no details", async () => {
    const first = await runSeed(pgliteStore(db));
    expect(first.inserted).toHaveLength(40);
    expect(first.totalRows).toBe(40);
    const { rows } = await db.query<Record<string, unknown>>(
      "select * from public.events_content order by event_slug",
    );
    expect(rows.map((r) => r.event_slug)).toEqual(eventInventory.map((e) => e.slug).sort());
    for (const row of rows) {
      expect(row.registration_status).toBe("not-open");
      for (const [column, value] of Object.entries(row))
        if (!["event_slug", "registration_status", "created_at", "updated_at"].includes(column))
          expect(value, `${row.event_slug}.${column}`).toBeNull();
    }
  });

  it("is idempotent: a second run inserts nothing and keeps 40 rows", async () => {
    const second = await runSeed(pgliteStore(db));
    expect(second).toMatchObject({
      inserted: [],
      alreadyPresent: 40,
      totalRows: 40,
      unknownSlugs: [],
    });
  });

  it("never overwrites content an admin has already saved", async () => {
    await db.query(
      `update public.events_content set venue = 'Admin-edited venue', source_kind = $1, source_reference = $2, source_date = $3
       where event_slug = 'hackathon'`,
      SOURCE,
    );
    await runSeed(pgliteStore(db));
    const { rows } = await db.query<{ venue: string }>(
      "select venue from public.events_content where event_slug = 'hackathon'",
    );
    expect(rows[0]!.venue).toBe("Admin-edited venue");
    await db.query(
      "update public.events_content set venue = null, source_kind = null, source_reference = null, source_date = null where event_slug = 'hackathon'",
    );
  });

  it("round-trips seeded rows into the same EventRecords the site builds today", async () => {
    const { rows } = await db.query<EventContentRecord>("select * from public.events_content");
    const bySlug = new Map(rows.map((r) => [r.event_slug, r]));
    const rebuilt = eventInventory.map((identity) =>
      buildEvent(
        identity,
        recordToDetails(
          {
            ...bySlug.get(identity.slug)!,
            event_coordinators: [],
            guidelines_file: null,
            image_file: null,
          },
          "https://example.supabase.co",
        ),
      ),
    );
    expect(rebuilt).toEqual(events);
    expect(Object.keys(eventDetails)).toHaveLength(0);
    expect(buildSeedPlan()).toHaveLength(40);
  });
});

describe("CMS constraints (PostgreSQL)", () => {
  const set = (column: string, value: unknown, slug = "debate") =>
    rejects(
      `update public.events_content set ${column} = $1, source_kind = $2, source_reference = $3, source_date = $4 where event_slug = '${slug}'`,
      [value, ...SOURCE],
    );

  it("accepts official Google Forms only, and open only with a link (D7-1, D7-3)", async () => {
    for (const bad of [
      "https://evil.example/form",
      "http://forms.gle/AbC",
      "javascript:alert(1)",
      "/events/x",
    ])
      expect(await set("registration_url", bad), bad).toMatch(/check constraint/);
    expect(await set("registration_status", "open")).toMatch(/events_content_open_needs_link/);
    expect(await set("registration_status", "completed")).toMatch(/check constraint/);
    expect(await set("registration_url", FORM)).toBe("");
  });

  it("refuses content without a complete source (ContentSource)", async () => {
    expect(
      await rejects(
        "update public.events_content set venue = 'Hall A' where event_slug = 'cricket'",
      ),
    ).toMatch(/events_content_content_needs_source/);
    expect(
      await rejects(
        "update public.events_content set source_kind = 'official-pdf' where event_slug = 'cricket'",
      ),
    ).toMatch(/events_content_source_complete/);
  });

  it("stores unknown values as NULL, never as blank strings", async () => {
    for (const column of ["venue", "team_size", "event_date", "registration_deadline"])
      expect(await set(column, "   "), column).toMatch(/check constraint/);
    expect(await set("participation", "duo")).toMatch(/check constraint/);
  });

  it("validates coordinators and removes them with their event", async () => {
    const add = (name: string, phone: string | null, email: string | null, order: number) =>
      rejects(
        "insert into public.event_coordinators (event_slug, name, phone, email, sort_order) values ('debate', $1, $2, $3, $4)",
        [name, phone, email, order],
      );
    expect(await add(" ", null, null, 0)).toMatch(/check constraint/);
    expect(await add("A. Coordinator", "call me", null, 0)).toMatch(/check constraint/);
    expect(await add("A. Coordinator", null, "not-an-email", 0)).toMatch(/check constraint/);
    expect(await add("A. Coordinator", "+91 98765 43210", "a@pce.ac.in", 0)).toBe("");
    expect(await add("B. Coordinator", null, null, 0)).toMatch(/unique/);
    expect(
      await add("Ghost", null, null, 1).then(() =>
        rejects(
          "insert into public.event_coordinators (event_slug, name, sort_order) values ('not-an-event', 'X', 0)",
        ),
      ),
    ).toMatch(/foreign key/);
    await db.query("delete from public.event_coordinators where event_slug = 'debate'");
  });

  it("allows only safe file metadata, and links files of the right kind", async () => {
    const file = (category: string, bucket: string, path: string, mime: string, size = 1000) =>
      rejects(
        "insert into public.cms_files (id, bucket, path, original_name, mime_type, size_bytes, category) values ($1,$2,$3,'rules.pdf',$4,$5,$6)",
        [FILE_ID, bucket, path, mime, size, category],
      );
    const docPath = `events/debate/${FILE_ID}.pdf`;
    expect(
      await file("document", "ashwamedh-documents", "../etc/passwd", "application/pdf"),
    ).toMatch(/check/);
    expect(await file("document", "ashwamedh-documents", docPath, "text/html")).toMatch(/check/);
    expect(await file("document", "ashwamedh-images", docPath, "application/pdf")).toMatch(
      /cms_files_kind/,
    );
    expect(
      await file("document", "ashwamedh-documents", docPath, "application/pdf", 20 * 1024 * 1024),
    ).toMatch(/cms_files_kind/);
    expect(await file("document", "ashwamedh-documents", docPath, "application/pdf")).toBe("");
    expect(await set("image_file_id", FILE_ID)).toMatch(/must reference an event-image/);
    expect(await set("guidelines_file_id", FILE_ID)).toBe("");
    expect(await set("guidelines_url", "https://example.org/rules.pdf")).toMatch(
      /events_content_one_guidelines/,
    );
    await db.query("delete from public.cms_files where id = $1", [FILE_ID]);
    const { rows } = await db.query<{ guidelines_file_id: string | null }>(
      "select guidelines_file_id from public.events_content where event_slug = 'debate'",
    );
    expect(rows[0]!.guidelines_file_id).toBeNull();
  });
});
