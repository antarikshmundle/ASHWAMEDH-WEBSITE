import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GalleryGrid } from "@/components/sections/gallery-grid";
import { TeamList } from "@/components/sections/team-list";
import { validateGalleryItem, validateTeamMember } from "@/lib/cms/collection-form";
import { galleryImageSrc } from "@/lib/media";

/** Phase 10.6 Gallery / Team: validation, allowlist, loaders, gallery uploads, admin gate, rendering. */

const ORIGIN = "https://abcdefghijklmnop.supabase.co";
const UUID = "0b9f5d4e-8c5a-4f6e-9a1b-2c3d4e5f6a7b";
const GALLERY = `${ORIGIN}/storage/v1/object/public/ashwamedh-images/gallery`;
const TODAY = new Date("2026-10-12T06:00:00Z");
const SOURCE = {
  sourceKind: "owner-confirmed",
  sourceReference: "Fest committee",
  sourceDate: "2026-10-11",
};
const html = (node: ReactNode) => renderToString(node).replace(/<!-- -->/g, "");

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("validation", () => {
  it("gallery: caption and a complete source are required; status draft / published", () => {
    expect(
      validateGalleryItem(
        { caption: " Inauguration, ASHWAMEDH 2025 ", altText: "", ...SOURCE },
        TODAY,
      ),
    ).toEqual({
      ok: true,
      payload: {
        caption: "Inauguration, ASHWAMEDH 2025",
        alt_text: null,
        status: "draft",
        source_kind: "owner-confirmed",
        source_reference: "Fest committee",
        source_date: "2026-10-11",
      },
    });
    const bad = validateGalleryItem(
      {
        caption: " ",
        altText: "x".repeat(301),
        status: "live",
        sourceKind: "",
        sourceReference: "",
        sourceDate: "2026-10-30",
      },
      TODAY,
    );
    expect(bad.ok).toBe(false);
    expect(Object.keys((bad as { errors: object }).errors).sort()).toEqual([
      "altText",
      "caption",
      "sourceDate",
      "sourceKind",
      "sourceReference",
      "status",
    ]);
  });

  it("team: name, role and group are required; nothing is defaulted", () => {
    const ok = validateTeamMember(
      { name: "A", role: "B", groupLabel: "C", status: "published", ...SOURCE },
      TODAY,
    );
    expect(ok).toMatchObject({
      ok: true,
      payload: { name: "A", role: "B", group_label: "C", status: "published" },
    });
    const bad = validateTeamMember({ name: "", role: "", groupLabel: "", ...SOURCE }, TODAY);
    expect(Object.keys((bad as { errors: object }).errors).sort()).toEqual([
      "groupLabel",
      "name",
      "role",
    ]);
  });
});

describe("galleryImageSrc", () => {
  it("accepts only the exact Storage gallery URL", () => {
    expect(galleryImageSrc(`${GALLERY}/${UUID}.webp`, ORIGIN)).toBe(`${GALLERY}/${UUID}.webp`);
    for (const url of [
      `${GALLERY}/sub/${UUID}.webp`,
      `${GALLERY}/${UUID}.webp?x=1`,
      `${GALLERY}/${UUID}.svg`,
      `${GALLERY}/${UUID.toUpperCase()}.png`,
      `${ORIGIN}/storage/v1/object/public/ashwamedh-images/events/hackathon/${UUID}.png`,
      `${ORIGIN}/storage/v1/object/public/ashwamedh-images/team/${UUID}.png`,
      `${ORIGIN}/storage/v1/object/public/ashwamedh-staging/gallery/${UUID}.png`,
      `https://evil.example/storage/v1/object/public/ashwamedh-images/gallery/${UUID}.png`,
      `${GALLERY}/%2e%2e/${UUID}.png`,
    ])
      expect(galleryImageSrc(url, ORIGIN), url).toBeNull();
    expect(galleryImageSrc(`${GALLERY}/${UUID}.webp`, null)).toBeNull();
  });
});

describe("rendering", () => {
  it("gallery: figure, caption, optimizer URL; anything not allowlisted is dropped", () => {
    vi.stubEnv("SUPABASE_URL", ORIGIN);
    const markup = html(
      <GalleryGrid
        items={[
          {
            id: "1",
            caption: "Inauguration, ASHWAMEDH 2025",
            src: `${GALLERY}/${UUID}.webp`,
            alt: "",
          },
          { id: "2", caption: "Elsewhere", src: `https://evil.example/${UUID}.webp`, alt: "x" },
        ]}
      />,
    );
    expect(markup.match(/<figure/g)).toHaveLength(1);
    expect(markup).toContain("<figcaption");
    expect(markup).toContain("Inauguration, ASHWAMEDH 2025");
    expect(markup).toContain(
      `src="/_next/image?url=${encodeURIComponent(`${GALLERY}/${UUID}.webp`)}`,
    );
    expect(markup).toContain('alt=""');
    expect(markup).not.toContain("evil.example");
    vi.unstubAllEnvs();
  });

  it("team: a heading per group, name and role cards, nothing else", () => {
    const markup = html(
      <TeamList
        groups={[
          {
            label: "Faculty Coordinators",
            members: [{ id: "1", name: "A. Name", role: "Convener" }],
          },
        ]}
      />,
    );
    expect(markup).toMatch(/<h2[^>]*>Faculty Coordinators<\/h2>/);
    expect(markup).toContain("A. Name");
    expect(markup).toContain("Convener");
    expect(markup).not.toMatch(/<img|mailto:|tel:/);
  });
});

/* ---------- loaders, services and actions (mocked Supabase) ---------- */

class Redirect extends Error {}
let signedIn = true;
vi.mock("@/lib/admin/auth", () => ({
  requireAdmin: async () => {
    if (!signedIn) throw new Redirect("/admin/login");
    return { sub: "admin" };
  },
}));
const updateTag = vi.fn();
vi.mock("next/cache", () => ({ updateTag: (t: string) => updateTag(t) }));

type Reply = { data: unknown; error: { message: string; code?: string } | null };
interface Call {
  table: string;
  op: string;
  payload?: unknown;
  filters: [string, string, unknown][];
  or?: string;
}
const calls: Call[] = [];
let respond: (call: Call) => Reply;
const query = (table: string) => {
  const call: Call = { table, op: "select", filters: [] };
  const b = {
    select: () => b,
    insert: (p: unknown) => ((call.op = "insert"), (call.payload = p), b),
    update: (p: unknown) => ((call.op = "update"), (call.payload = p), b),
    delete: () => ((call.op = "delete"), b),
    eq: (c: string, v: unknown) => (call.filters.push(["eq", c, v]), b),
    is: (c: string, v: unknown) => (call.filters.push(["is", c, v]), b),
    or: (f: string) => ((call.or = f), b),
    order: () => b,
    limit: () => b,
    maybeSingle: () => b,
    single: () => b,
    then: (resolve: (r: Reply) => unknown) => {
      calls.push(call);
      return Promise.resolve(respond(call)).then(resolve);
    },
  };
  return b;
};
const rpc = vi.fn<(fn: string, args: Record<string, unknown>) => Promise<Reply>>();
const storageCalls: [string, string, ...unknown[]][] = [];
let stagedBytes: Uint8Array;
const storage = (bucket: string) => ({
  createSignedUploadUrl: async (path: string) => (
    storageCalls.push([bucket, "sign", path]),
    { data: { signedUrl: "https://x/sign?token=t", path, token: "t" }, error: null }
  ),
  download: async (path: string) => (
    storageCalls.push([bucket, "download", path]),
    { data: { arrayBuffer: async () => stagedBytes.slice().buffer }, error: null }
  ),
  upload: async (path: string, _b: unknown, o: unknown) => (
    storageCalls.push([bucket, "upload", path, o]),
    { data: { path }, error: null }
  ),
  remove: async (paths: string[]) => (
    storageCalls.push([bucket, "remove", paths]),
    { data: [], error: null }
  ),
});
const client = {
  from: query,
  rpc: (fn: string, args: Record<string, unknown>) => rpc(fn, args),
  storage: { from: storage },
};
vi.mock("@/lib/cms/server", () => ({
  cmsAdminClient: () => ({ client, credentials: { url: ORIGIN, serviceRoleKey: "k" } }),
  cmsPublicReadClient: (tags: string[]) => ({
    client: { ...client, tags },
    credentials: { url: ORIGIN, serviceRoleKey: "k" },
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  calls.length = 0;
  storageCalls.length = 0;
  signedIn = true;
  respond = () => ({ data: [], error: null });
  rpc.mockResolvedValue({
    data: { item_id: "item-1", file_id: "file-1", repeated: false },
    error: null,
  });
});

describe("public loaders", () => {
  it("repository mode: nothing (Coming Soon), no database", async () => {
    vi.resetModules();
    vi.stubEnv("CMS_CONTENT_SOURCE", "repository");
    const { loadPublishedGallery, loadPublishedTeam } = await import("@/lib/cms/collections");
    expect(await loadPublishedGallery()).toEqual([]);
    expect(await loadPublishedTeam()).toEqual([]);
    expect(calls).toEqual([]);
  });

  it("database mode: published only; bad file paths skipped; missing table = nothing; team grouped", async () => {
    vi.resetModules();
    vi.stubEnv("CMS_CONTENT_SOURCE", "database");
    respond = (call) =>
      call.table === "gallery_items"
        ? {
            data: [
              {
                id: "a",
                caption: "One",
                file: { bucket: "ashwamedh-images", path: `gallery/${UUID}.webp`, alt_text: null },
              },
              {
                id: "b",
                caption: "Two",
                file: {
                  bucket: "ashwamedh-images",
                  path: `events/hackathon/${UUID}.webp`,
                  alt_text: null,
                },
              },
            ],
            error: null,
          }
        : {
            data: [
              { id: "1", name: "A", role: "R1", group_label: "Faculty" },
              { id: "2", name: "B", role: "R2", group_label: "Students" },
              { id: "3", name: "C", role: "R3", group_label: "Faculty" },
            ],
            error: null,
          };
    const { loadPublishedGallery, loadPublishedTeam } = await import("@/lib/cms/collections");
    expect(await loadPublishedGallery()).toEqual([
      { id: "a", caption: "One", src: `${GALLERY}/${UUID}.webp`, alt: "" },
    ]);
    expect(calls[0]!.filters).toContainEqual(["eq", "status", "published"]);
    expect((await loadPublishedTeam()).map((g) => [g.label, g.members.map((m) => m.name)])).toEqual(
      [
        ["Faculty", ["A", "C"]],
        ["Students", ["B"]],
      ],
    );
    vi.resetModules();
    respond = () => ({ data: null, error: { message: "missing", code: "PGRST205" } });
    const fresh = await import("@/lib/cms/collections");
    expect(await fresh.loadPublishedGallery()).toEqual([]);
    vi.resetModules();
    respond = () => ({ data: null, error: { message: "down", code: "57P01" } });
    const failing = await import("@/lib/cms/collections");
    await expect(failing.loadPublishedTeam()).rejects.toThrow(/Reading the team failed/);
  });
});

describe("gallery uploads (10.4 pipeline)", () => {
  it("issues a gallery ticket without an event, at a server-generated gallery path", async () => {
    const { requestGalleryUpload } = await import("@/lib/cms/media-admin");
    respond = (call) =>
      call.op === "insert"
        ? { data: { id: UUID, expires_at: "later" }, error: null }
        : { data: [], error: null };
    expect(
      await requestGalleryUpload({ filename: "Stage.png", type: "image/png", size: 1000 }),
    ).toMatchObject({ ok: true, ticketId: UUID });
    const insert = calls.find((c) => c.op === "insert")!;
    expect(insert.payload).toMatchObject({
      event_slug: null,
      kind: "gallery",
      declared_type: "image/png",
    });
    expect((insert.payload as { object_path: string }).object_path).toMatch(
      /^gallery\/[0-9a-f-]{36}\.png$/,
    );
    expect(
      await requestGalleryUpload({ filename: "x.svg", type: "image/svg+xml", size: 10 }),
    ).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("validates caption and source first; then claims (no event), validates bytes, publishes and links", async () => {
    const { finalizeGalleryUpload } = await import("@/lib/cms/media-admin");
    expect(
      await finalizeGalleryUpload({ ticketId: UUID, caption: "", altText: "", ...SOURCE }),
    ).toMatchObject({ ok: false, reason: "invalid" });
    expect(calls).toEqual([]);

    stagedBytes = new Uint8Array(
      await sharp({ create: { width: 40, height: 30, channels: 3, background: "#123456" } })
        .png()
        .toBuffer(),
    );
    const path = `gallery/${UUID}.png`;
    respond = (call) =>
      call.op === "update" && call.or
        ? {
            data: {
              id: UUID,
              event_slug: null,
              kind: "gallery",
              object_path: path,
              original_name: "Stage.png",
              declared_type: "image/png",
              declared_size: stagedBytes.byteLength,
              status: "processing",
              processing_at: "t",
            },
            error: null,
          }
        : { data: [], error: null };
    const result = await finalizeGalleryUpload({
      ticketId: UUID,
      caption: "Stage, ASHWAMEDH 2025",
      altText: " Lit stage ",
      ...SOURCE,
    });
    expect(result).toEqual({ ok: true, itemId: "item-1", fileId: "file-1", repeated: false });
    expect(calls[0]!.filters).toEqual([
      ["eq", "id", UUID],
      ["is", "event_slug", null],
      ["eq", "kind", "gallery"],
    ]);
    expect(storageCalls.map(([b, m]) => `${b}:${m}`)).toEqual([
      "ashwamedh-staging:download",
      "ashwamedh-images:upload",
      "ashwamedh-staging:remove",
    ]);
    expect(rpc).toHaveBeenCalledWith("cms_finalize_gallery_upload", {
      p_ticket_id: UUID,
      p_item: {
        caption: "Stage, ASHWAMEDH 2025",
        source_kind: "owner-confirmed",
        source_reference: "Fest committee",
        source_date: "2026-10-11",
      },
      p_file: {
        mime_type: "image/png",
        size_bytes: stagedBytes.byteLength,
        alt_text: "Lit stage",
        width: 40,
        height: 30,
      },
    });
    expect(updateTag.mock.calls).toEqual([["cms:gallery"]]);
  });
});

describe("admin services and actions", () => {
  it("every action needs the admin session", async () => {
    signedIn = false;
    const gallery = await import("@/app/admin/gallery/actions");
    const team = await import("@/app/admin/team/actions");
    for (const run of [
      () => gallery.requestGalleryUploadAction({ filename: "a.png", type: "image/png", size: 1 }),
      () => gallery.finalizeGalleryUploadAction({ ticketId: UUID }),
      () => gallery.saveGalleryItemAction(UUID, "v", {}),
      () => gallery.deleteGalleryItemAction(UUID, "v"),
      () => gallery.reorderGalleryAction([UUID]),
      () => team.createTeamMemberAction({}),
      () => team.saveTeamMemberAction(UUID, "v", {}),
      () => team.deleteTeamMemberAction(UUID, "v"),
      () => team.reorderTeamAction([UUID]),
    ])
      await expect(run()).rejects.toBeInstanceOf(Redirect);
    expect(calls).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("versioned saves and deletes; stale versions are conflicts; refresh only that collection", async () => {
    const svc = await import("@/lib/cms/collections");
    const values = { name: "A", role: "B", groupLabel: "C", status: "published", ...SOURCE };
    respond = () => ({ data: [], error: null }); // no row matched the version
    expect(await svc.saveTeamMember(UUID, "old", values)).toMatchObject({
      ok: false,
      reason: "conflict",
    });
    expect(await svc.deleteTeamMember(UUID, "old")).toMatchObject({
      ok: false,
      reason: "conflict",
    });
    expect(updateTag).not.toHaveBeenCalled();
    respond = () => ({ data: [{ id: UUID }], error: null });
    expect(await svc.saveTeamMember(UUID, "v1", values)).toEqual({ ok: true });
    const save = calls.at(-1)!;
    expect(save.filters).toEqual([
      ["eq", "id", UUID],
      ["eq", "updated_at", "v1"],
    ]);
    expect(updateTag.mock.calls).toEqual([["cms:team"]]);
    expect(await svc.saveTeamMember(UUID, "v1", { ...values, name: "" })).toMatchObject({
      ok: false,
      reason: "invalid",
      errors: { name: expect.any(String) },
    });

    rpc.mockResolvedValueOnce({ data: null, error: { message: "cms_version_conflict" } });
    expect(await svc.deleteGalleryItem(UUID, "old")).toMatchObject({ reason: "conflict" });
    rpc.mockResolvedValueOnce({ data: null, error: { message: "cms_invalid_order" } });
    expect(await svc.reorderCollection("gallery", [UUID])).toMatchObject({ reason: "conflict" });
    rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await svc.reorderCollection("team", [UUID])).toEqual({ ok: true });
    expect(rpc).toHaveBeenLastCalledWith("cms_reorder_team", { p_ids: [UUID] });
  });
});

describe("public pages", () => {
  it("keep the exact Coming Soon state while nothing is published", async () => {
    vi.resetModules();
    vi.stubEnv("CMS_CONTENT_SOURCE", "repository");
    const gallery = html(await (await import("@/app/gallery/page")).default());
    const team = html(await (await import("@/app/team/page")).default());
    expect(gallery).toContain("Gallery coming soon.");
    expect(gallery).not.toContain("<figure");
    expect(team).toContain("Organising committee will be announced.");
    expect(team).not.toMatch(/<h2/);
  });
});
