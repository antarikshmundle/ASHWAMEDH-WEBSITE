import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Phase 10.6 follow-up: cms_upload_tickets.file_id is a historical identifier, not a foreign key.
 * Deleting a file (the media cleanup) must leave finalized tickets exactly as they were, while the
 * RESTRICT keys still protect files that an event or a gallery item uses. Real PostgreSQL (PGlite)
 * with every migration applied.
 */

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");
let db: PGlite;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const PNG = { mime_type: "image/png", size_bytes: 1000, width: 800, height: 600 };
const SOURCE = {
  source_kind: "owner-confirmed",
  source_reference: "Test fixture",
  source_date: "2026-10-13",
};

async function fails(sql: string, params: unknown[] = []): Promise<string> {
  try {
    await db.query(sql, params);
    return "";
  } catch (error) {
    return (error as Error).message;
  }
}
const one = async <T>(sql: string, params: unknown[] = []) =>
  (await db.query<T>(sql, params)).rows[0]!;

/** The ticket row exactly as PostgreSQL represents it (every column, JSON text). */
const ticketJson = async (n: number) =>
  (
    await one<{ j: string }>(
      "select to_jsonb(t)::text as j from public.cms_upload_tickets t where id = $1",
      [uuid(n)],
    )
  ).j;

/** A claimed ('processing') upload ticket, as the server leaves it right before finalizing. */
const claimed = (n: number, kind: string, path: string, slug: string | null) =>
  db.query(
    `insert into public.cms_upload_tickets (id, event_slug, kind, object_path, original_name, declared_type, declared_size, status, processing_at)
     values ($1, $2, $3, $4, 'upload.png', 'image/png', 1000, 'processing', now())`,
    [uuid(n), slug, kind, path],
  );
const finalizeGallery = (n: number) =>
  db.query<{ v: { file_id: string; item_id: string | null; repeated: boolean } }>(
    "select public.cms_finalize_gallery_upload($1, $2::jsonb, $3::jsonb) as v",
    [uuid(n), JSON.stringify({ caption: "Stage", ...SOURCE }), JSON.stringify(PNG)],
  );
const finalizeEvent = (n: number, slug: string, version: string) =>
  db.query<{ r: { file_id: string; updated_at: string; repeated: boolean } }>(
    "select public.cms_finalize_upload($1, $2, 'image', $3::timestamptz, $4::jsonb) as r",
    [uuid(n), slug, version, JSON.stringify(PNG)],
  );
const eventVersion = async (slug: string) =>
  (
    await one<{ v: string }>(
      "select updated_at::text as v from public.events_content where event_slug = $1",
      [slug],
    )
  ).v;

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
  // An event with a source may carry media (events_content_content_needs_source).
  await db.query(
    "insert into public.events_content (event_slug, source_kind, source_reference, source_date) values ('hackathon', $1, $2, $3)",
    [SOURCE.source_kind, SOURCE.source_reference, SOURCE.source_date],
  );
}, 60_000);
afterAll(() => db?.close());

describe("ticket file id is history, not a foreign key", () => {
  it("drops only the ticket key; the RESTRICT keys that protect files in use remain", async () => {
    const keys = await db.query<{ tbl: string; name: string; def: string }>(
      `select conrelid::regclass::text as tbl, conname as name, pg_get_constraintdef(oid) as def
         from pg_constraint where contype = 'f' and confrelid = 'public.cms_files'::regclass
        order by 1, 2`,
    );
    expect(keys.rows).toEqual([
      {
        tbl: "events_content",
        name: "events_content_guidelines_file_id_fkey",
        def: "FOREIGN KEY (guidelines_file_id) REFERENCES cms_files(id) ON DELETE RESTRICT",
      },
      {
        tbl: "events_content",
        name: "events_content_image_file_id_fkey",
        def: "FOREIGN KEY (image_file_id) REFERENCES cms_files(id) ON DELETE RESTRICT",
      },
      {
        tbl: "gallery_items",
        name: "gallery_items_file_id_fkey",
        def: "FOREIGN KEY (file_id) REFERENCES cms_files(id) ON DELETE RESTRICT",
      },
    ]);
    expect(
      (
        await one<{ c: string | null }>(
          "select col_description('public.cms_upload_tickets'::regclass, attnum) as c from pg_attribute where attrelid = 'public.cms_upload_tickets'::regclass and attname = 'file_id'",
        )
      ).c,
    ).toMatch(/^Historical identifier .* Not a foreign key/);
  });

  it("gallery: a file in use cannot be deleted; once detached and purged, the ticket is unchanged", async () => {
    await claimed(10, "gallery", `gallery/${uuid(10)}.png`, null);
    const { v } = (await finalizeGallery(10)).rows[0]!;
    expect(v.repeated).toBe(false);

    // In use by the gallery item: the database refuses the delete.
    expect(await fails("delete from public.cms_files where id = $1", [v.file_id])).toMatch(
      /gallery_items_file_id_fkey/,
    );

    // Repeat while the file exists: same file and item (idempotent).
    expect((await finalizeGallery(10)).rows[0]!.v).toEqual({
      file_id: v.file_id,
      item_id: v.item_id,
      repeated: true,
    });

    // Delete the item (the file is only detached), then purge the file like the cleanup does.
    const item = await one<{ updated_at: string }>(
      "select updated_at::text from public.gallery_items where id = $1",
      [v.item_id],
    );
    await db.query("select public.cms_delete_gallery_item($1, $2::timestamptz)", [
      v.item_id,
      item.updated_at,
    ]);
    const before = await ticketJson(10);
    expect(JSON.parse(before)).toMatchObject({ status: "finalized", file_id: v.file_id });
    expect(await fails("delete from public.cms_files where id = $1", [v.file_id])).toBe("");

    expect(await ticketJson(10)).toBe(before);
    expect(
      await one("select count(*)::int as n from public.cms_files where id = $1", [v.file_id]),
    ).toEqual({ n: 0 });

    // Repeat after the purge: still answers, with the historical id and no item.
    expect((await finalizeGallery(10)).rows[0]!.v).toEqual({
      file_id: v.file_id,
      item_id: null,
      repeated: true,
    });
    expect(await ticketJson(10)).toBe(before);
  });

  it("event media: a linked file cannot be deleted; once detached and purged, the ticket is unchanged", async () => {
    await claimed(20, "image", `events/hackathon/${uuid(20)}.png`, "hackathon");
    const { r } = (await finalizeEvent(20, "hackathon", await eventVersion("hackathon"))).rows[0]!;
    expect(r.repeated).toBe(false);

    // Linked as the event image: the database refuses the delete.
    expect(await fails("delete from public.cms_files where id = $1", [r.file_id])).toMatch(
      /events_content_image_file_id_fkey/,
    );

    // Unlink the image (the file is detached), then purge it.
    await db.query(
      "select public.cms_set_event_media('hackathon', $1::timestamptz, 'image', null)",
      [await eventVersion("hackathon")],
    );
    const before = await ticketJson(20);
    expect(JSON.parse(before)).toMatchObject({ status: "finalized", file_id: r.file_id });
    expect(await fails("delete from public.cms_files where id = $1", [r.file_id])).toBe("");
    expect(await ticketJson(20)).toBe(before);

    // Repeat after the purge: still answers with the historical id.
    const again = (await finalizeEvent(20, "hackathon", "2000-01-01Z")).rows[0]!.r;
    expect(again).toMatchObject({ file_id: r.file_id, repeated: true });
    expect(await ticketJson(20)).toBe(before);
  });

  it("a finalized ticket written directly keeps its file id when that file row is deleted", async () => {
    const file = await one<{ id: string }>(
      `insert into public.cms_files (bucket, path, original_name, mime_type, size_bytes, category, width, height)
       values ('ashwamedh-images', $1, 'upload.png', 'image/png', 1000, 'gallery-image', 800, 600) returning id`,
      [`gallery/${uuid(30)}.png`],
    );
    await db.query(
      `insert into public.cms_upload_tickets (id, event_slug, kind, object_path, original_name, declared_type, declared_size, status, processing_at, finished_at, file_id)
       values ($1, null, 'gallery', $2, 'upload.png', 'image/png', 1000, 'finalized', now(), now(), $3)`,
      [uuid(30), `gallery/${uuid(30)}.png`, file.id],
    );
    const before = await ticketJson(30);
    expect(await fails("delete from public.cms_files where id = $1", [file.id])).toBe("");
    expect(await ticketJson(30)).toBe(before);
    expect(JSON.parse(await ticketJson(30))).toMatchObject({ file_id: file.id });
  });
});
