import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/** Phase 10.6 Gallery / Team migration on a real PostgreSQL (PGlite). */

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");
let db: PGlite;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SOURCE = {
  source_kind: "owner-confirmed",
  source_reference: "Test fixture",
  source_date: "2026-10-12",
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
const ticket = (
  n: number,
  kind: string,
  path: string,
  slug: string | null,
  type = "image/png",
  status = "processing",
) =>
  db.query(
    `insert into public.cms_upload_tickets (id, event_slug, kind, object_path, original_name, declared_type, declared_size, status, processing_at)
     values ($1, $2, $3, $4, 'upload.png', $5, 1000, $6, now())`,
    [uuid(n), slug, kind, path, type, status],
  );
const finalize = (
  n: number,
  item: object = { caption: "Inauguration, ASHWAMEDH 2025", ...SOURCE },
) =>
  db.query<{ v: { file_id: string; item_id: string; repeated: boolean } }>(
    "select public.cms_finalize_gallery_upload($1, $2::jsonb, $3::jsonb) as v",
    [
      uuid(n),
      JSON.stringify(item),
      JSON.stringify({
        mime_type: "image/png",
        size_bytes: 1000,
        alt_text: " Stage ",
        width: 800,
        height: 600,
      }),
    ],
  );

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
  await db.query("insert into public.events_content (event_slug) values ('hackathon')");
}, 60_000);
afterAll(() => db?.close());

describe("upload tickets", () => {
  it("keep every event-ticket rule and add gallery tickets without an event", async () => {
    const G = (n: number) => `gallery/${uuid(n)}.png`;
    expect(await fails("select 1")).toBe("");
    // event tickets: unchanged
    await ticket(1, "image", `events/hackathon/${uuid(1)}.png`, "hackathon");
    expect(
      await fails(
        "insert into public.cms_upload_tickets (event_slug, kind, object_path, original_name, declared_type, declared_size) values (null, 'image', $1, 'a.png', 'image/png', 1)",
        [`events/hackathon/${uuid(2)}.png`],
      ),
    ).toMatch(/path_slug/);
    expect(
      await fails(
        "insert into public.cms_upload_tickets (event_slug, kind, object_path, original_name, declared_type, declared_size) values ('hackathon', 'image', $1, 'a.png', 'image/png', 1)",
        [G(3)],
      ),
    ).toMatch(/path_slug/);
    // gallery tickets
    await ticket(10, "gallery", G(10), null);
    for (const [slug, path, type] of [
      ["hackathon", G(11), "image/png"], // gallery has no event
      [null, `events/hackathon/${uuid(12)}.png`, "image/png"],
      [null, `gallery/${uuid(13)}.pdf`, "application/pdf"], // images only
      [null, `gallery/sub/${uuid(14)}.png`, "image/png"],
      [null, `gallery/../${uuid(15)}.png`, "image/png"],
    ] as const)
      expect(
        await fails(
          "insert into public.cms_upload_tickets (event_slug, kind, object_path, original_name, declared_type, declared_size) values ($1, 'gallery', $2, 'a', $3, 1)",
          [slug, path, type],
        ),
        path,
      ).not.toBe("");
    expect(
      await fails(
        "insert into public.cms_upload_tickets (event_slug, kind, object_path, original_name, declared_type, declared_size) values (null, 'team', $1, 'a', 'image/png', 1)",
        [`team/${uuid(16)}.png`],
      ),
    ).toMatch(/check/);
    // an event finalize can never use a gallery ticket
    expect(
      await fails(
        "select public.cms_finalize_upload($1, 'hackathon', 'image', now(), '{}'::jsonb)",
        [uuid(10)],
      ),
    ).toMatch(/cms_invalid_ticket/);
  });
});

describe("gallery items", () => {
  it("finalize: file row + draft item + finalized ticket in one transaction; repeat is idempotent", async () => {
    const { v } = (await finalize(10)).rows[0]!;
    expect(v.repeated).toBe(false);
    expect(
      await one("select category, bucket, alt_text, width from public.cms_files where id = $1", [
        v.file_id,
      ]),
    ).toEqual({
      category: "gallery-image",
      bucket: "ashwamedh-images",
      alt_text: "Stage",
      width: 800,
    });
    expect(
      await one("select status, caption, sort_order from public.gallery_items where id = $1", [
        v.item_id,
      ]),
    ).toEqual({
      status: "draft",
      caption: "Inauguration, ASHWAMEDH 2025",
      sort_order: 0,
    });
    expect((await finalize(10)).rows[0]!.v).toEqual({ ...v, repeated: true });
    expect(await one("select count(*)::int as n from public.gallery_items")).toEqual({ n: 1 });
  });

  it("needs a caption and a complete source; a failure rolls back the file row too", async () => {
    await ticket(20, "gallery", `gallery/${uuid(20)}.png`, null);
    const files = async () =>
      (await one<{ n: number }>("select count(*)::int as n from public.cms_files")).n;
    const before = await files();
    expect(
      await fails(
        'select public.cms_finalize_gallery_upload($1, $2::jsonb, \'{"mime_type":"image/png","size_bytes":1,"width":1,"height":1}\'::jsonb)',
        [uuid(20), JSON.stringify({ caption: "x" })],
      ),
    ).toMatch(/null value|not-null/);
    expect(
      await fails(
        'select public.cms_finalize_gallery_upload($1, $2::jsonb, \'{"mime_type":"image/png","size_bytes":1,"width":1,"height":1}\'::jsonb)',
        [uuid(20), JSON.stringify({ caption: "  ", ...SOURCE })],
      ),
    ).toMatch(/check/);
    expect(await files()).toBe(before);
    expect(
      await fails("select public.cms_finalize_gallery_upload($1, '{}'::jsonb, '{}'::jsonb)", [
        uuid(99),
      ]),
    ).toMatch(/cms_invalid_ticket/);
    await ticket(21, "gallery", `gallery/${uuid(21)}.png`, null, "image/png", "issued");
    expect(
      await fails("select public.cms_finalize_gallery_upload($1, '{}'::jsonb, '{}'::jsonb)", [
        uuid(21),
      ]),
    ).toMatch(/cms_ticket_not_claimed/);
  });

  it("only gallery images; a file in use cannot be deleted; delete detaches it (versioned)", async () => {
    const item = await one<{ id: string; file_id: string; v: string }>(
      "select id, file_id, updated_at::text as v from public.gallery_items limit 1",
    );
    await db.query(
      "insert into public.cms_files (id, bucket, path, original_name, mime_type, size_bytes, category) values ($1, 'ashwamedh-documents', $2, 'r.pdf', 'application/pdf', 10, 'document')",
      [uuid(50), `events/hackathon/${uuid(50)}.pdf`],
    );
    expect(
      await fails("update public.gallery_items set file_id = $1 where id = $2", [
        uuid(50),
        item.id,
      ]),
    ).toMatch(/gallery-image/);
    expect(await fails("delete from public.cms_files where id = $1", [item.file_id])).toMatch(
      /foreign key/,
    );
    expect(
      await fails("select public.cms_delete_gallery_item($1, '2000-01-01')", [item.id]),
    ).toMatch(/cms_version_conflict/);
    await db.query("select public.cms_delete_gallery_item($1, $2::timestamptz)", [item.id, item.v]);
    expect(await one("select count(*)::int as n from public.gallery_items")).toEqual({ n: 0 });
    expect(
      await one<{ d: boolean }>(
        "select detached_at is not null as d from public.cms_files where id = $1",
        [item.file_id],
      ),
    ).toEqual({ d: true });
    expect(await fails("select public.cms_delete_gallery_item($1, now())", [item.id])).toMatch(
      /cms_unknown_item/,
    );
  });
});

describe("team members and ordering", () => {
  it("need name, role, group and source; status draft / published only", async () => {
    const add = (over: object) => {
      const row = {
        name: "A. Person",
        role: "Coordinator",
        group_label: "Faculty",
        ...SOURCE,
        ...over,
      };
      const cols = Object.keys(row);
      return fails(
        `insert into public.team_members (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})`,
        Object.values(row),
      );
    };
    expect(await add({ id: uuid(70) })).toBe("");
    expect(await add({ id: uuid(71), sort_order: 1 })).toBe("");
    expect(await add({ name: " " })).toMatch(/check/);
    expect(await add({ status: "live" })).toMatch(/check/);
    expect(await add({ source_kind: null })).toMatch(/null/);
    expect(await one("select status from public.team_members where id = $1", [uuid(70)])).toEqual({
      status: "draft",
    });
  });

  it("reorders the whole list at once and refuses partial or foreign lists", async () => {
    await db.query("select public.cms_reorder_team($1::uuid[])", [[uuid(71), uuid(70)]]);
    const { rows } = await db.query("select id from public.team_members order by sort_order");
    expect(rows).toEqual([{ id: uuid(71) }, { id: uuid(70) }]);
    for (const ids of [[uuid(70)], [uuid(70), uuid(70)], [uuid(70), uuid(1)]])
      expect(await fails("select public.cms_reorder_team($1::uuid[])", [ids])).toMatch(
        /cms_invalid_order/,
      );
    expect(await fails("select public.cms_reorder_gallery($1::uuid[])", [[uuid(1)]])).toMatch(
      /cms_invalid_order/,
    );
  });

  it("is reachable by the service role only; tables are private", async () => {
    for (const fn of [
      "public.cms_finalize_gallery_upload(uuid, jsonb, jsonb)",
      "public.cms_delete_gallery_item(uuid, timestamptz)",
      "public.cms_reorder_gallery(uuid[])",
      "public.cms_reorder_team(uuid[])",
      "public.cms_check_gallery_file()",
    ])
      for (const role of ["anon", "authenticated"])
        expect(
          (
            await one<{ ok: boolean }>("select has_function_privilege($1, $2, 'execute') as ok", [
              role,
              fn,
            ])
          ).ok,
          `${role} ${fn}`,
        ).toBe(false);
    expect(
      (
        await one<{ ok: boolean }>(
          "select has_function_privilege('service_role', 'public.cms_finalize_gallery_upload(uuid, jsonb, jsonb)', 'execute') as ok",
        )
      ).ok,
    ).toBe(true);
    const { rows } = await db.query(
      "select relname, relrowsecurity from pg_class where relname in ('gallery_items','team_members') order by relname",
    );
    expect(rows).toEqual([
      { relname: "gallery_items", relrowsecurity: true },
      { relname: "team_members", relrowsecurity: true },
    ]);
    expect(
      (
        await db.query(
          "select 1 from information_schema.table_privileges where table_name in ('gallery_items','team_members') and grantee in ('anon','authenticated')",
        )
      ).rows,
    ).toEqual([]);
  });
});
