import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Phase 10.4 media migration on a real PostgreSQL (PGlite): buckets, file dimensions, RESTRICT,
 * cms_set_event_media, upload tickets + cms_finalize_upload, cms_restore_event, permissions.
 */

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");
let db: PGlite;

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const SOURCE =
  "source_kind = 'owner-confirmed', source_reference = 'Test fixture', source_date = '2026-10-10'";

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
const version = async (slug: string) =>
  (
    await one<{ v: string }>(
      "select updated_at::text as v from public.events_content where event_slug = $1",
      [slug],
    )
  ).v;

async function addFile(
  n: number,
  slug: string,
  kind: "image" | "document",
  extra: Partial<Record<string, unknown>> = {},
) {
  const image = kind === "image";
  const row = {
    id: uuid(n),
    bucket: image ? "ashwamedh-images" : "ashwamedh-documents",
    path: `events/${slug}/${uuid(n)}.${image ? "png" : "pdf"}`,
    original_name: image ? "poster.png" : "rules.pdf",
    mime_type: image ? "image/png" : "application/pdf",
    size_bytes: 1000,
    category: image ? "event-image" : "document",
    width: image ? 800 : null,
    height: image ? 600 : null,
    ...extra,
  };
  const cols = Object.keys(row);
  await db.query(
    `insert into public.cms_files (${cols.join(",")}) values (${cols.map((_, i) => `$${i + 1}`).join(",")})`,
    Object.values(row),
  );
  return row.id;
}
const setMedia = async (slug: string, kind: string, fileId: string | null) =>
  db.query("select public.cms_set_event_media($1, $2::timestamptz, $3, $4::uuid)::text as v", [
    slug,
    await version(slug),
    kind,
    fileId,
  ]);

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
  for (const slug of ["hackathon", "debate", "rocketry", "chess"])
    await db.query("insert into public.events_content (event_slug) values ($1)", [slug]);
  // hackathon and debate have a source (content allowed); rocketry stays all-TBA.
  await db.exec(
    `update public.events_content set ${SOURCE} where event_slug in ('hackathon','debate','chess')`,
  );
}, 60_000);
afterAll(() => db?.close());

describe("media migration — buckets and files", () => {
  it("adds a private staging bucket and keeps the public buckets unchanged", async () => {
    const { rows } = await db.query(
      "select id, public, file_size_limit, allowed_mime_types from storage.buckets order by id",
    );
    expect(rows).toEqual([
      {
        id: "ashwamedh-documents",
        public: true,
        file_size_limit: 10485760,
        allowed_mime_types: ["application/pdf"],
      },
      {
        id: "ashwamedh-images",
        public: true,
        file_size_limit: 5242880,
        allowed_mime_types: ["image/jpeg", "image/png", "image/webp"],
      },
      {
        id: "ashwamedh-staging",
        public: false,
        file_size_limit: 10485760,
        allowed_mime_types: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
      },
    ]);
  });

  it("requires image dimensions within 4096 × 4096 and 16 megapixels (D6); none for PDFs", async () => {
    expect(await addFile(10, "hackathon", "image", { width: 4000, height: 4000 })).toBe(uuid(10));
    expect(await addFile(11, "hackathon", "image", { width: 4096, height: 3906 })).toBe(uuid(11));
    for (const [n, dims] of [
      [12, { width: 4096, height: 4096 }],
      [13, { width: 4097, height: 100 }],
      [14, { width: null, height: null }],
      [15, { width: 0, height: 600 }],
    ] as const)
      expect(
        await addFile(n, "hackathon", "image", dims).catch((e: Error) => e.message),
        JSON.stringify(dims),
      ).toMatch(/cms_files_dimensions/);
    expect(
      await addFile(16, "hackathon", "document", { width: 10, height: 10 }).catch(
        (e: Error) => e.message,
      ),
    ).toMatch(/cms_files_dimensions/);
  });
});

describe("media migration — attach, replace, remove", () => {
  it("needs the event's content source first (D3)", async () => {
    const file = await addFile(20, "rocketry", "document");
    expect(await setMedia("rocketry", "guidelines", file).catch((e: Error) => e.message)).toMatch(
      /content_needs_source/,
    );
  });

  it("refuses files of another event, the wrong category and unknown kinds", async () => {
    const other = await addFile(21, "debate", "document");
    const image = await addFile(22, "hackathon", "image");
    expect(await setMedia("hackathon", "guidelines", other).catch((e: Error) => e.message)).toMatch(
      /cms_file_not_for_event/,
    );
    expect(await setMedia("hackathon", "guidelines", image).catch((e: Error) => e.message)).toMatch(
      /must reference a document/,
    );
    expect(await setMedia("hackathon", "video", image).catch((e: Error) => e.message)).toMatch(
      /cms_invalid_kind/,
    );
  });

  it("attaches a PDF in place of an external link, keeping the link in the revision (D2)", async () => {
    await db.exec(
      "update public.events_content set guidelines_url = 'https://example.org/rules.pdf' where event_slug = 'hackathon'",
    );
    const pdf = await addFile(23, "hackathon", "document");
    await setMedia("hackathon", "guidelines", pdf);
    const row = await one<Record<string, unknown>>(
      "select guidelines_file_id, guidelines_url from public.events_content where event_slug = 'hackathon'",
    );
    expect(row).toEqual({ guidelines_file_id: pdf, guidelines_url: null });
    const revision = await one<{ content: Record<string, unknown> }>(
      "select content from public.events_content_revisions where event_slug = 'hackathon' order by saved_at desc limit 1",
    );
    expect(revision.content).toMatchObject({
      guidelines_url: "https://example.org/rules.pdf",
      guidelines_file_id: null,
    });
    const file = await one<{ detached_at: string | null }>(
      "select detached_at from public.cms_files where id = $1",
      [pdf],
    );
    expect(file.detached_at).toBeNull();
  });

  it("replacing detaches the old file (grace starts) and never deletes it", async () => {
    const old = uuid(23);
    const replacement = await addFile(24, "hackathon", "document");
    await setMedia("hackathon", "guidelines", replacement);
    const files = await db.query<{ id: string; detached_at: string | null }>(
      "select id, detached_at from public.cms_files where id in ($1, $2) order by id",
      [old, replacement],
    );
    expect(files.rows).toEqual([
      { id: old, detached_at: expect.any(Object) },
      { id: replacement, detached_at: null },
    ]);
  });

  it("a file in use cannot be deleted (RESTRICT); a detached one can", async () => {
    expect(await fails("delete from public.cms_files where id = $1", [uuid(24)])).toMatch(
      /foreign key/,
    );
    expect(await fails("delete from public.cms_files where id = $1", [uuid(23)])).toBe("");
  });

  it("rejects a stale version and changes nothing", async () => {
    const before = await version("hackathon");
    const message = await fails(
      "select public.cms_set_event_media('hackathon', '2000-01-01Z', 'guidelines', null)",
    );
    expect(message).toMatch(/cms_version_conflict/);
    expect(await version("hackathon")).toBe(before);
  });

  it("removing returns the event to Coming Soon and detaches the file", async () => {
    await setMedia("hackathon", "guidelines", null);
    const row = await one<Record<string, unknown>>(
      "select guidelines_file_id, guidelines_url from public.events_content where event_slug = 'hackathon'",
    );
    expect(row).toEqual({ guidelines_file_id: null, guidelines_url: null });
    const file = await one<{ detached_at: string | null }>(
      "select detached_at from public.cms_files where id = $1",
      [uuid(24)],
    );
    expect(file.detached_at).not.toBeNull();
  });

  it("an image replaces an /images/events path the same way", async () => {
    await db.exec(
      "update public.events_content set image_path = '/images/events/debate.webp' where event_slug = 'debate'",
    );
    const image = await addFile(25, "debate", "image");
    await setMedia("debate", "image", image);
    expect(
      await one(
        "select image_file_id, image_path from public.events_content where event_slug = 'debate'",
      ),
    ).toEqual({
      image_file_id: image,
      image_path: null,
    });
  });
});

describe("media migration — upload tickets and finalize", () => {
  const ticket = (n: number, slug: string, kind: string, ext: string, extra = "") =>
    fails(
      `insert into public.cms_upload_tickets (id, event_slug, kind, object_path, original_name, declared_type, declared_size${extra ? ", " + extra.split("=")[0] : ""})
       values ($1, $2, $3, $4, 'upload.${ext}', $5, 1000${extra ? ", " + extra.split("=")[1] : ""})`,
      [
        uuid(n),
        slug,
        kind,
        `events/${slug}/${uuid(n)}.${ext}`,
        ext === "pdf" ? "application/pdf" : "image/png",
      ],
    );
  const finalize = (n: number, slug: string, kind: string, expected: string, file: object) =>
    db.query<{ r: { file_id: string; updated_at: string; repeated: boolean } }>(
      "select public.cms_finalize_upload($1, $2, $3, $4::timestamptz, $5::jsonb) as r",
      [uuid(n), slug, kind, expected, JSON.stringify(file)],
    );
  const pdfFile = { mime_type: "application/pdf", size_bytes: 2048 };

  it("binds a ticket to its event folder, kind and file type, with a short validity window", async () => {
    expect(await ticket(40, "chess", "guidelines", "pdf")).toBe("");
    expect(
      await fails(
        "insert into public.cms_upload_tickets (event_slug, kind, object_path, original_name, declared_type, declared_size) values ('chess','guidelines','events/debate/" +
          uuid(41) +
          ".pdf','x.pdf','application/pdf',10)",
      ),
    ).toMatch(/cms_upload_tickets_path_slug/);
    expect(await ticket(42, "chess", "guidelines", "png")).toMatch(
      /cms_upload_tickets_kind_type|declared_type/,
    );
    expect(await ticket(43, "chess", "image", "pdf")).toMatch(/cms_upload_tickets_kind_type/);
    expect(
      await ticket(44, "chess", "guidelines", "pdf", "expires_at=now() + interval '2 hours'"),
    ).toMatch(/cms_upload_tickets_window/);
    expect(
      await fails(
        "insert into public.cms_upload_tickets (event_slug, kind, object_path, original_name, declared_type, declared_size) values ('chess','guidelines','events/chess/../x.pdf','x.pdf','application/pdf',10)",
      ),
    ).toMatch(/check/);
  });

  it("refuses to finalize an unclaimed ticket, or one used for another event or kind", async () => {
    const v = await version("chess");
    expect(
      await finalize(40, "chess", "guidelines", v, pdfFile).catch((e: Error) => e.message),
    ).toMatch(/cms_ticket_not_claimed/);
    await db.exec(
      `update public.cms_upload_tickets set status = 'processing', processing_at = now() where id = '${uuid(40)}'`,
    );
    expect(
      await finalize(40, "debate", "guidelines", v, pdfFile).catch((e: Error) => e.message),
    ).toMatch(/cms_invalid_ticket/);
    expect(await finalize(40, "chess", "image", v, pdfFile).catch((e: Error) => e.message)).toMatch(
      /cms_invalid_ticket/,
    );
  });

  it("rolls back the file row and the link together on a version conflict", async () => {
    const files = async () =>
      (await one<{ n: number }>("select count(*)::int as n from public.cms_files")).n;
    const before = await files();
    expect(
      await finalize(40, "chess", "guidelines", "2000-01-01Z", pdfFile).catch(
        (e: Error) => e.message,
      ),
    ).toMatch(/cms_version_conflict/);
    expect(await files()).toBe(before);
    expect(
      await one("select status from public.cms_upload_tickets where id = $1", [uuid(40)]),
    ).toEqual({ status: "processing" });
  });

  it("finalizes once: file row, link and ticket together; a repeat returns the same file", async () => {
    const first = (await finalize(40, "chess", "guidelines", await version("chess"), pdfFile))
      .rows[0]!.r;
    expect(first).toMatchObject({ file_id: expect.any(String), repeated: false });
    expect(
      await one("select guidelines_file_id from public.events_content where event_slug = 'chess'"),
    ).toEqual({ guidelines_file_id: first.file_id });
    expect(
      await one("select status, file_id from public.cms_upload_tickets where id = $1", [uuid(40)]),
    ).toEqual({ status: "finalized", file_id: first.file_id });
    expect(
      await one("select path, category, width from public.cms_files where id = $1", [
        first.file_id,
      ]),
    ).toEqual({
      path: `events/chess/${uuid(40)}.pdf`,
      category: "document",
      width: null,
    });
    const again = (await finalize(40, "chess", "guidelines", "2000-01-01Z", pdfFile)).rows[0]!.r;
    expect(again).toMatchObject({ file_id: first.file_id, repeated: true });
    expect(
      (
        await one<{ n: number }>(
          "select count(*)::int as n from public.cms_files where path like 'events/chess/%'",
        )
      ).n,
    ).toBe(1);
  });

  it("checks image dimensions when an image upload is finalized", async () => {
    expect(await ticket(45, "chess", "image", "png")).toBe("");
    await db.exec(
      `update public.cms_upload_tickets set status = 'processing', processing_at = now() where id = '${uuid(45)}'`,
    );
    const huge = { mime_type: "image/png", size_bytes: 4096, width: 5000, height: 5000 };
    expect(
      await finalize(45, "chess", "image", await version("chess"), huge).catch(
        (e: Error) => e.message,
      ),
    ).toMatch(/cms_files_dimensions/);
  });
});

describe("media migration — restore with media links (D5)", () => {
  it("restores a still-existing file link and reports a missing one", async () => {
    const image = await addFile(60, "debate", "image");
    await setMedia("debate", "image", image);
    const revisionWithImage = await one<{ id: string }>(
      "select id from public.events_content_revisions where event_slug = 'debate' order by saved_at desc limit 1",
    );
    // The revision recorded before attaching uuid(60) holds uuid(25), the previous image.
    await setMedia("debate", "image", null);
    const restored = await one<{ r: { missing: string[] } }>(
      "select public.cms_restore_event('debate', $1::timestamptz, $2::uuid) as r",
      [await version("debate"), revisionWithImage.id],
    );
    expect(restored.r.missing).toEqual([]);
    expect(
      await one("select image_file_id from public.events_content where event_slug = 'debate'"),
    ).toEqual({ image_file_id: uuid(25) });

    // Now make the file disappear: detach it, delete it, and restore the same revision again.
    await setMedia("debate", "image", null);
    expect(await fails("delete from public.cms_files where id = $1", [uuid(25)])).toBe("");
    const again = await one<{ r: { missing: string[] } }>(
      "select public.cms_restore_event('debate', $1::timestamptz, $2::uuid) as r",
      [await version("debate"), revisionWithImage.id],
    );
    expect(again.r.missing).toEqual(["image"]);
    expect(
      await one("select image_file_id from public.events_content where event_slug = 'debate'"),
    ).toEqual({ image_file_id: null });
  });

  it("refuses a revision of another event and a stale version", async () => {
    const other = await one<{ id: string }>(
      "select id from public.events_content_revisions where event_slug = 'hackathon' limit 1",
    );
    expect(
      await fails("select public.cms_restore_event('debate', $1::timestamptz, $2::uuid)", [
        await version("debate"),
        other.id,
      ]),
    ).toMatch(/cms_unknown_revision/);
    const own = await one<{ id: string }>(
      "select id from public.events_content_revisions where event_slug = 'debate' limit 1",
    );
    expect(
      await fails("select public.cms_restore_event('debate', '2000-01-01Z', $1::uuid)", [own.id]),
    ).toMatch(/cms_version_conflict/);
  });
});

describe("media migration — access", () => {
  it("functions are service-role only; tickets are private", async () => {
    for (const signature of [
      "public.cms_set_event_media(text, timestamptz, text, uuid)",
      "public.cms_finalize_upload(uuid, text, text, timestamptz, jsonb)",
      "public.cms_restore_event(text, timestamptz, uuid)",
      "public.cms_lock_event(text, timestamptz)",
      "public.cms_refresh_detached(uuid[])",
    ]) {
      for (const role of ["anon", "authenticated"])
        expect(
          (
            await one<{ ok: boolean }>("select has_function_privilege($1, $2, 'execute') as ok", [
              role,
              signature,
            ])
          ).ok,
          `${role} ${signature}`,
        ).toBe(false);
      expect(
        (
          await one<{ ok: boolean }>(
            "select has_function_privilege('service_role', $1, 'execute') as ok",
            [signature],
          )
        ).ok,
      ).toBe(true);
    }
    expect(
      await one("select relrowsecurity from pg_class where relname = 'cms_upload_tickets'"),
    ).toEqual({ relrowsecurity: true });
    const grants = await db.query(
      "select grantee from information_schema.table_privileges where table_name = 'cms_upload_tickets' and grantee in ('anon','authenticated')",
    );
    expect(grants.rows).toEqual([]);
  });
});
