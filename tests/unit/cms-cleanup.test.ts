import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLEANUP_GRACE_MS,
  STAGING_GRACE_MS,
  applyCleanup,
  planCleanup,
  type CleanupFile,
  type CleanupInputs,
} from "@/lib/cms/cleanup";

/**
 * Phase 10.4.6: media cleanup — planning (references, 24-hour grace, active uploads, events/
 * only), applying with a re-check of every item, the admin action and the CLI's dry-run default.
 */

const NOW = new Date("2026-10-20T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const H = 60 * 60 * 1000;
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const file = (n: number, over: Partial<CleanupFile> = {}): CleanupFile => ({
  id: U(n),
  bucket: "ashwamedh-images",
  path: `events/rocketry/${U(n)}.png`,
  uploaded_at: ago(72 * H),
  detached_at: ago(25 * H),
  ...over,
});
const input = (over: Partial<CleanupInputs> = {}): CleanupInputs => ({
  now: NOW,
  files: [],
  referenced: new Set(),
  tickets: [],
  objects: [],
  ...over,
});

describe("planCleanup", () => {
  it("deletes a file row only when unused for the whole 24-hour grace", () => {
    const plan = planCleanup(
      input({
        files: [
          file(1), // detached 25 h ago → delete
          file(2, { detached_at: ago(CLEANUP_GRACE_MS) }), // exactly 24 h → delete
          file(3, { detached_at: ago(CLEANUP_GRACE_MS - 1000) }), // 23:59:59 → keep
          file(4, { detached_at: null }), // in use (referenced below)
          file(5, { detached_at: null, uploaded_at: ago(30 * H) }), // never attached, old → delete
          file(6, { detached_at: null, uploaded_at: ago(2 * H) }), // never attached, new → keep
        ],
        referenced: new Set([U(4)]),
      }),
    );
    expect(plan.files.map((f) => f.id)).toEqual([U(1), U(2), U(5)]);
    expect(plan.kept).toEqual({ inUse: 1, inGrace: 2, activeUpload: 0, outsideEvents: 0 });
  });

  it("never deletes what an event uses, even when it looks old", () => {
    const plan = planCleanup(input({ files: [file(1)], referenced: new Set([U(1)]) }));
    expect(plan.files).toEqual([]);
    expect(plan.kept.inUse).toBe(1);
  });

  it("protects anything an active upload points to (issued and unexpired, or processing)", () => {
    const f1 = file(1);
    const f2 = file(2);
    const f3 = file(3);
    const plan = planCleanup(
      input({
        files: [f1, f2, f3],
        tickets: [
          { object_path: f1.path, status: "issued", expires_at: ago(-10 * 60 * 1000) },
          { object_path: f2.path, status: "processing", expires_at: ago(5 * H) }, // stuck: kept
          { object_path: f3.path, status: "issued", expires_at: ago(60 * 1000) }, // expired
        ],
        objects: [
          { bucket: "ashwamedh-staging", path: f1.path, writtenAt: ago(3 * H) },
          { bucket: "ashwamedh-staging", path: f3.path, writtenAt: ago(3 * H) },
        ],
      }),
    );
    expect(plan.files.map((f) => f.id)).toEqual([U(3)]);
    expect(plan.staging.map((o) => o.path)).toEqual([f3.path]);
    expect(plan.kept.activeUpload).toBe(3);
  });

  it("finds public objects without a row after the grace, and old staging objects", () => {
    const withRow = file(1, { detached_at: null });
    const plan = planCleanup(
      input({
        files: [withRow],
        referenced: new Set([U(1)]),
        objects: [
          { bucket: "ashwamedh-images", path: withRow.path, writtenAt: ago(90 * H) }, // has row
          { bucket: "ashwamedh-images", path: "events/debate/a.png", writtenAt: ago(25 * H) },
          { bucket: "ashwamedh-documents", path: "events/debate/b.pdf", writtenAt: ago(2 * H) },
          {
            bucket: "ashwamedh-staging",
            path: "events/debate/c.png",
            writtenAt: ago(STAGING_GRACE_MS),
          },
          {
            bucket: "ashwamedh-staging",
            path: "events/debate/d.png",
            writtenAt: ago(30 * 60 * 1000),
          },
        ],
      }),
    );
    expect(plan.orphans.map((o) => o.path)).toEqual(["events/debate/a.png"]);
    expect(plan.staging.map((o) => o.path)).toEqual(["events/debate/c.png"]);
    expect(plan.kept.inGrace).toBe(2);
  });

  it("touches nothing outside events/ and gallery/ or in other buckets", () => {
    const plan = planCleanup(
      input({
        files: [file(1, { path: `team/${U(1)}.png` })],
        objects: [
          { bucket: "ashwamedh-images", path: "logos/x.png", writtenAt: ago(90 * H) },
          { bucket: "other-bucket", path: "events/x/y.png", writtenAt: ago(90 * H) },
        ],
      }),
    );
    expect([plan.files, plan.orphans, plan.staging]).toEqual([[], [], []]);
    expect(plan.kept.outsideEvents).toBe(1);
  });

  it("treats gallery files like event files: kept while a gallery item uses them (10.6)", () => {
    const used = file(1, { path: `gallery/${U(1)}.png`, detached_at: null });
    const removed = file(2, { path: `gallery/${U(2)}.png` }); // gallery item deleted 25 h ago
    const plan = planCleanup(
      input({
        files: [used, removed],
        referenced: new Set([U(1)]),
        objects: [
          { bucket: "ashwamedh-images", path: "gallery/orphan.png", writtenAt: ago(30 * H) },
        ],
      }),
    );
    expect(plan.files.map((f) => f.id)).toEqual([U(2)]);
    expect(plan.orphans.map((o) => o.path)).toEqual(["gallery/orphan.png"]);
    expect(plan.kept.inUse).toBe(1);
  });

  it("is idempotent: after the deletions nothing is left to plan", () => {
    const before = input({
      files: [file(1)],
      objects: [{ bucket: "ashwamedh-images", path: file(1).path, writtenAt: ago(90 * H) }],
    });
    expect(planCleanup(before).files).toHaveLength(1);
    expect(planCleanup(input())).toMatchObject({ files: [], orphans: [], staging: [] });
  });
});

/* ---------- applyCleanup with a recording fake ---------- */

type Reply = { data: unknown; error: { message: string; code?: string } | null };
interface Call {
  table: string;
  op: "select" | "delete";
  filters: [string, unknown][];
  or?: string;
}
const calls: Call[] = [];
const removed: [string, string[]][] = [];
let respond: (call: Call) => Reply;
let removeError: string | null;
function fakeClient() {
  const query = (table: string) => {
    const call: Call = { table, op: "select", filters: [] };
    const builder = {
      select: () => builder,
      delete: () => ((call.op = "delete"), builder),
      eq: (c: string, v: unknown) => (call.filters.push([c, v]), builder),
      in: (c: string, v: unknown) => (call.filters.push([c, v]), builder),
      or: (f: string) => ((call.or = f), builder),
      maybeSingle: () => builder,
      then: (resolve: (r: Reply) => unknown) => {
        calls.push(call);
        return Promise.resolve(respond(call)).then(resolve);
      },
    };
    return builder;
  };
  return {
    from: query,
    storage: {
      from: (bucket: string) => ({
        remove: async (paths: string[]) => {
          removed.push([bucket, paths]);
          return removeError
            ? { data: null, error: { message: removeError } }
            : { data: paths.map((name) => ({ name })), error: null };
        },
      }),
    },
  } as never;
}

describe("applyCleanup", () => {
  beforeEach(() => {
    calls.length = 0;
    removed.length = 0;
    removeError = null;
    respond = (call) =>
      call.table === "cms_files" && call.op === "delete"
        ? { data: [{ id: "x" }], error: null }
        : { data: call.table === "cms_upload_tickets" ? [] : null, error: null };
  });
  const plan = (over: Partial<CleanupInputs> = {}) => planCleanup(input(over));

  it("deletes the row first — still unused for the grace — then exactly its object", async () => {
    const report = await applyCleanup(fakeClient(), plan({ files: [file(1)] }));
    expect(report).toEqual({
      deleted: { files: [`ashwamedh-images/${file(1).path}`], orphans: [], staging: [] },
      skipped: [],
      failures: [],
    });
    const del = calls.find((c) => c.op === "delete")!;
    expect(del.filters).toEqual([
      ["id", U(1)],
      ["bucket", "ashwamedh-images"],
      ["path", file(1).path],
    ]);
    const cutoff = ago(CLEANUP_GRACE_MS);
    expect(del.or).toBe(
      `and(detached_at.not.is.null,detached_at.lte."${cutoff}"),and(detached_at.is.null,uploaded_at.lte."${cutoff}")`,
    );
    expect(removed).toEqual([["ashwamedh-images", [file(1).path]]]);
  });

  it("keeps a file an event uses again (RESTRICT) or that is no longer eligible", async () => {
    respond = (call) =>
      call.op === "delete"
        ? { data: null, error: { message: "violates foreign key constraint", code: "23503" } }
        : { data: [], error: null };
    let report = await applyCleanup(fakeClient(), plan({ files: [file(1)] }));
    expect(report.skipped[0]).toMatch(/in use by an event again/);
    expect(removed).toEqual([]);

    respond = (call) =>
      call.op === "delete" ? { data: [], error: null } : { data: [], error: null };
    report = await applyCleanup(fakeClient(), plan({ files: [file(1)] }));
    expect(report.skipped[0]).toMatch(/no longer eligible/);
    expect(removed).toEqual([]);
  });

  it("re-checks active uploads and rows right before deleting objects", async () => {
    const orphan = {
      bucket: "ashwamedh-images",
      path: "events/debate/a.png",
      writtenAt: ago(30 * H),
    };
    const staged = {
      bucket: "ashwamedh-staging",
      path: "events/debate/b.png",
      writtenAt: ago(3 * H),
    };
    respond = (call) =>
      call.table === "cms_upload_tickets"
        ? {
            data: call.filters.some(([, v]) => v === staged.path)
              ? [{ status: "processing", expires_at: ago(0) }]
              : [],
            error: null,
          }
        : { data: { id: "now-has-a-row" }, error: null };
    const report = await applyCleanup(fakeClient(), plan({ objects: [orphan, staged] }));
    expect(report.skipped).toEqual([
      `ashwamedh-images/${orphan.path}: now has a file row`,
      `ashwamedh-staging/${staged.path}: an upload is active`,
    ]);
    expect(removed).toEqual([]);
  });

  it("reports a failed object removal for the next run (row already gone → orphan)", async () => {
    removeError = "storage unavailable";
    const report = await applyCleanup(fakeClient(), plan({ files: [file(1)] }));
    expect(report.failures[0]).toMatch(/row deleted, object left for the next run/);
    // The next plan sees the object without a row and removes it after the grace.
    const next = planCleanup(
      input({
        objects: [{ bucket: "ashwamedh-images", path: file(1).path, writtenAt: ago(72 * H) }],
      }),
    );
    expect(next.orphans).toHaveLength(1);
  });
});

/* ---------- admin action and CLI ---------- */

class Redirect extends Error {}
let signedIn = false;
vi.mock("@/lib/admin/auth", () => ({
  requireAdmin: async () => {
    if (!signedIn) throw new Redirect("/admin/login");
    return { sub: "admin" };
  },
}));
const serverClient = vi.fn();
vi.mock("@/lib/cms/server", () => ({ cmsAdminClient: () => serverClient() }));

describe("applyCleanupAction", () => {
  it("needs the admin session and an explicit confirmation", async () => {
    const { applyCleanupAction } = await import("@/app/admin/files/actions");
    const form = (confirm?: string) => {
      const data = new FormData();
      if (confirm) data.set("confirm", confirm);
      return data;
    };
    signedIn = false;
    await expect(
      applyCleanupAction({ status: "idle", nonce: 0 }, form("delete-unused-files")),
    ).rejects.toBeInstanceOf(Redirect);
    signedIn = true;
    expect(await applyCleanupAction({ status: "idle", nonce: 0 }, form())).toEqual({
      status: "not-confirmed",
      nonce: 1,
    });
    expect(serverClient).not.toHaveBeenCalled();
  });
});

describe("npm run cms:cleanup", () => {
  it("refuses unknown options before touching anything (only --apply deletes)", async () => {
    const run = promisify(execFile);
    const error = await run(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "scripts/cms-cleanup.mts", "--force"],
      {
        env: { ...process.env, SUPABASE_URL: "", SUPABASE_SERVICE_ROLE_KEY: "" },
      },
    ).catch((e: { code: number; stderr: string }) => e);
    expect(error).toMatchObject({
      code: 2,
      stderr: expect.stringMatching(/Unknown option\(s\): --force/),
    });
  }, 30_000);
});

describe("loadCleanupInputs", () => {
  it("counts files used by gallery items as in use (10.6), and tolerates the missing table before it", async () => {
    const { loadCleanupInputs } = await import("@/lib/cms/cleanup");
    const make = (gallery: { data: unknown; error: unknown }) =>
      ({
        from: (table: string) => {
          const reply =
            table === "gallery_items"
              ? gallery
              : table === "events_content"
                ? { data: [{ image_file_id: U(1), guidelines_file_id: null }], error: null }
                : { data: [], error: null };
          const b = {
            select: () => b,
            in: () => b,
            then: (r: (v: unknown) => unknown) => Promise.resolve(reply).then(r),
          };
          return b;
        },
        storage: { from: () => ({ list: async () => ({ data: [], error: null }) }) },
      }) as never;
    const withGallery = await loadCleanupInputs(
      make({ data: [{ file_id: U(2) }], error: null }),
      NOW,
    );
    expect([...withGallery.referenced].sort()).toEqual([U(1), U(2)]);
    const before = await loadCleanupInputs(
      make({ data: null, error: { message: "missing", code: "PGRST205" } }),
      NOW,
    );
    expect([...before.referenced]).toEqual([U(1)]);
    await expect(
      loadCleanupInputs(make({ data: null, error: { message: "down", code: "57P01" } }), NOW),
    ).rejects.toThrow(/Loading gallery items failed/);
  });
});
