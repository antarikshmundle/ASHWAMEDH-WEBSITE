import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Phase 10.4.3: the event media service with a recording fake of Supabase (database, RPCs and
 * Storage). Checks the admin gate, ticket binding, validation before promotion, the
 * compensation / recovery paths and idempotent finalization. Images are real (sharp).
 */

/* ---------- mocks: admin session, refresh, Supabase ---------- */

class Redirect extends Error {}
let signedIn = true;
vi.mock("@/lib/admin/auth", () => ({
  requireAdmin: async () => {
    if (!signedIn) throw new Redirect("/admin/login");
    return { sub: "admin" };
  },
}));
const expireEventContent = vi.fn();
vi.mock("@/lib/cms/revalidate", () => ({
  expireEventContent: (slug: string) => expireEventContent(slug),
}));

interface Call {
  table: string;
  op: "select" | "insert" | "update";
  payload?: Record<string, unknown>;
  filters: [string, unknown][];
  or?: string;
}
type Reply = { data: unknown; error: { message: string; code?: string } | null };
const calls: Call[] = [];
let respond: (call: Call) => Reply;

function query(table: string) {
  const call: Call = { table, op: "select", filters: [] };
  const builder = {
    select: () => builder,
    insert: (payload: Record<string, unknown>) => (
      (call.op = "insert"),
      (call.payload = payload),
      builder
    ),
    update: (payload: Record<string, unknown>) => (
      (call.op = "update"),
      (call.payload = payload),
      builder
    ),
    eq: (column: string, value: unknown) => (call.filters.push([column, value]), builder),
    or: (filter: string) => ((call.or = filter), builder),
    maybeSingle: () => builder,
    single: () => builder,
    then: (resolve: (r: Reply) => unknown, reject: (e: unknown) => unknown) => {
      calls.push(call);
      return Promise.resolve()
        .then(() => respond(call))
        .then(resolve, reject);
    },
  };
  return builder;
}
const filter = (call: Call, column: string) => call.filters.find(([c]) => c === column)?.[1];

const rpc = vi.fn<(fn: string, args: Record<string, unknown>) => Promise<Reply>>();
const storageCalls: [string, string, ...unknown[]][] = [];
const storage = {
  createSignedUploadUrl: vi.fn<(path: string, options?: unknown) => Promise<Reply>>(),
  download: vi.fn<(path: string) => Promise<Reply>>(),
  upload: vi.fn<(path: string, body: Uint8Array, options: unknown) => Promise<Reply>>(),
  remove: vi.fn<(paths: string[]) => Promise<Reply>>(),
};
vi.mock("@/lib/cms/server", () => ({
  cmsAdminClient: () => ({
    client: {
      from: (table: string) => query(table),
      rpc: (fn: string, args: Record<string, unknown>) => rpc(fn, args),
      storage: {
        from: (bucket: string) =>
          Object.fromEntries(
            Object.entries(storage).map(([name, fn]) => [
              name,
              (...args: unknown[]) => {
                storageCalls.push([bucket, name, ...args]);
                return (fn as (...a: unknown[]) => unknown)(...args);
              },
            ]),
          ),
      },
    },
    credentials: { url: "https://x.supabase.co", serviceRoleKey: "k" },
  }),
}));

/* ---------- fixtures ---------- */

const VERSION = "2026-10-10T10:00:00.123456+00:00";
const NEW_VERSION = "2026-10-10T10:05:00.5+00:00";
const TICKET = "0b9f5d4e-8c5a-4f6e-9a1b-2c3d4e5f6a7b";
const FILE_ID = "5c1e9d3a-7b2f-4c8e-9d1a-3e5f7a9b1c2d";
const PATH = "events/rocketry/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.png";
const PDF_PATH = "events/rocketry/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.pdf";
const PDF = new TextEncoder().encode("%PDF-1.7\n1 0 obj\n%%EOF\n");
let PNG: Uint8Array;

const ticket = (over: Record<string, unknown> = {}) => ({
  id: TICKET,
  event_slug: "rocketry",
  kind: "image",
  object_path: PATH,
  original_name: "Poster.png",
  declared_type: "image/png",
  declared_size: PNG.byteLength,
  status: "processing",
  issued_at: "2026-10-10T10:00:00+00:00",
  expires_at: "2026-10-10T10:15:00+00:00",
  processing_at: "2026-10-10T10:01:00.000+00:00",
  finished_at: null,
  file_id: null,
  failure: null,
  ...over,
});
let claimed: Record<string, unknown> | null;
let stored: Record<string, unknown> | null;
let eventRow: Record<string, unknown> | null;

const blob = (bytes: Uint8Array) => ({ arrayBuffer: async () => bytes.slice().buffer });
const finalizeReply = (repeated = false): Reply => ({
  data: { file_id: FILE_ID, updated_at: NEW_VERSION, repeated },
  error: null,
});

beforeEach(async () => {
  PNG ??= new Uint8Array(
    await sharp({ create: { width: 30, height: 20, channels: 3, background: "#c82a5a" } })
      .png()
      .toBuffer(),
  );
  signedIn = true;
  vi.clearAllMocks();
  calls.length = 0;
  storageCalls.length = 0;
  claimed = ticket();
  stored = null;
  eventRow = { source_kind: "owner-confirmed", image_file_id: FILE_ID };
  respond = (call) => {
    if (call.table === "events_content") return { data: eventRow, error: null };
    if (call.table === "cms_upload_tickets") {
      if (call.op === "insert")
        return { data: { id: TICKET, expires_at: "2026-10-10T10:15:00+00:00" }, error: null };
      if (call.op === "update" && call.or) return { data: claimed, error: null };
      if (call.op === "update") return { data: [{ id: TICKET }], error: null };
      return { data: stored, error: null };
    }
    if (call.table === "cms_files") return { data: [{ id: FILE_ID }], error: null };
    throw new Error(`unexpected table ${call.table}`);
  };
  rpc.mockResolvedValue(finalizeReply());
  storage.createSignedUploadUrl.mockResolvedValue({
    data: {
      signedUrl: `https://x.supabase.co/storage/v1/object/upload/sign/ashwamedh-staging/${PATH}?token=t`,
      path: PATH,
      token: "t",
    },
    error: null,
  });
  storage.download.mockImplementation(async () => ({ data: blob(PNG), error: null }));
  storage.upload.mockResolvedValue({ data: { path: PATH }, error: null });
  storage.remove.mockResolvedValue({ data: [], error: null });
});

const ticketUpdates = () =>
  calls.filter((c) => c.table === "cms_upload_tickets" && c.op === "update" && !c.or);
const publicWrites = () =>
  storageCalls.filter(([bucket, method]) => bucket !== "ashwamedh-staging" && method === "upload");
const removed = (bucket: string) =>
  storageCalls.filter(([b, m]) => b === bucket && m === "remove").map(([, , paths]) => paths);

/* ---------- 1. upload tickets ---------- */

describe("requestMediaUpload", () => {
  const request = (over: Record<string, unknown> = {}) => ({
    slug: "rocketry",
    kind: "image",
    filename: "Poster.png",
    type: "image/png",
    size: 1000,
    version: VERSION,
    ...over,
  });

  it("needs an admin session before anything else", async () => {
    signedIn = false;
    const { requestMediaUpload } = await import("@/lib/cms/media-admin");
    await expect(requestMediaUpload(request())).rejects.toBeInstanceOf(Redirect);
    expect(calls).toEqual([]);
    expect(storageCalls).toEqual([]);
  });

  it("issues a ticket bound to the event, kind and a server-generated staging path", async () => {
    const { requestMediaUpload } = await import("@/lib/cms/media-admin");
    const result = await requestMediaUpload({
      ...request(),
      // Anything else the browser sends is ignored.
      ...({ path: "../../secret.png", bucket: "ashwamedh-images" } as object),
    });
    expect(result).toMatchObject({ ok: true, ticketId: TICKET, contentType: "image/png" });

    const check = calls[0]!;
    expect(check).toMatchObject({ table: "events_content", op: "select" });
    expect(filter(check, "updated_at")).toBe(VERSION);
    const insert = calls.find((c) => c.op === "insert")!;
    expect(insert.payload).toMatchObject({
      event_slug: "rocketry",
      kind: "image",
      original_name: "Poster.png",
      declared_type: "image/png",
      declared_size: 1000,
    });
    const path = insert.payload!.object_path as string;
    expect(path).toMatch(/^events\/rocketry\/[0-9a-f-]{36}\.png$/);
    expect(storageCalls).toEqual([["ashwamedh-staging", "createSignedUploadUrl", path]]);
  });

  it("refuses unknown events, bad files, stale versions and events without a source (D3)", async () => {
    const { requestMediaUpload } = await import("@/lib/cms/media-admin");
    expect(await requestMediaUpload(request({ slug: "not-an-event" }))).toMatchObject({
      reason: "missing",
    });
    expect(
      await requestMediaUpload(request({ type: "image/svg+xml", filename: "a.svg" })),
    ).toMatchObject({ reason: "invalid" });
    expect(await requestMediaUpload(request({ size: 6 * 1024 * 1024 }))).toMatchObject({
      reason: "invalid",
      error: expect.stringMatching(/5 MB/),
    });
    expect(calls).toEqual([]);

    respond = (call) =>
      filter(call, "updated_at")
        ? { data: null, error: null }
        : { data: { event_slug: "rocketry" }, error: null };
    expect(await requestMediaUpload(request())).toMatchObject({ reason: "conflict" });

    respond = () => ({ data: { source_kind: null }, error: null });
    expect(await requestMediaUpload(request())).toMatchObject({ reason: "needs-source" });
    expect(calls.some((c) => c.op === "insert")).toBe(false);
    expect(storageCalls).toEqual([]);
  });

  it("closes the ticket when no signed URL can be created", async () => {
    storage.createSignedUploadUrl.mockResolvedValue({ data: null, error: { message: "down" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { requestMediaUpload } = await import("@/lib/cms/media-admin");
    expect(await requestMediaUpload(request())).toMatchObject({ ok: false, reason: "failed" });
    expect(ticketUpdates()[0]).toMatchObject({ payload: { status: "failed" } });
    expect(filter(ticketUpdates()[0]!, "status")).toBe("issued");
  });
});

/* ---------- 2. finalize ---------- */

describe("finalizeMediaUpload", () => {
  const finalize = async (over: Record<string, unknown> = {}) => {
    const { finalizeMediaUpload } = await import("@/lib/cms/media-admin");
    return finalizeMediaUpload({
      slug: "rocketry",
      kind: "image",
      ticketId: TICKET,
      version: VERSION,
      altText: "  Rocket   on the launch pad ",
      ...over,
    });
  };

  it("needs an admin session and a well-formed request", async () => {
    signedIn = false;
    await expect(finalize()).rejects.toBeInstanceOf(Redirect);
    signedIn = true;
    expect(await finalize({ ticketId: "../x" })).toMatchObject({ reason: "invalid" });
    expect(await finalize({ kind: "logo" })).toMatchObject({ reason: "invalid" });
    expect(await finalize({ slug: "nope" })).toMatchObject({ reason: "missing" });
    expect(await finalize({ altText: "x".repeat(301) })).toMatchObject({ reason: "invalid" });
    expect(calls).toEqual([]);
  });

  it("claims the ticket for its event and kind, only if unexpired or stale", async () => {
    await finalize();
    const claim = calls[0]!;
    expect(claim).toMatchObject({
      table: "cms_upload_tickets",
      op: "update",
      payload: { status: "processing" },
    });
    expect(claim.filters).toEqual([
      ["id", TICKET],
      ["event_slug", "rocketry"],
      ["kind", "image"],
    ]);
    expect(claim.or).toMatch(
      /^and\(status\.eq\.issued,expires_at\.gt\."[^"]+"\),and\(status\.eq\.processing,processing_at\.lt\."[^"]+"\)$/,
    );
    const [now, stale] = [...claim.or!.matchAll(/"([^"]+)"/g)].map((m) => Date.parse(m[1]!));
    expect(now! - stale!).toBe(10 * 60 * 1000);
  });

  it("validates the stored bytes, promotes them and links the file in one RPC", async () => {
    const result = await finalize();
    expect(result).toEqual({ ok: true, fileId: FILE_ID, version: NEW_VERSION, repeated: false });

    expect(storageCalls.map(([b, m]) => `${b}:${m}`)).toEqual([
      "ashwamedh-staging:download",
      "ashwamedh-images:upload",
      "ashwamedh-staging:remove",
    ]);
    const [, , path, body, options] = publicWrites()[0]!;
    expect(path).toBe(PATH);
    expect(body).toEqual(PNG);
    // One day (approved in 10.4.4 review); storage-js sends it as "Cache-Control: max-age=86400".
    expect(options).toEqual({ contentType: "image/png", cacheControl: "86400", upsert: true });
    expect(rpc).toHaveBeenCalledWith("cms_finalize_upload", {
      p_ticket_id: TICKET,
      p_slug: "rocketry",
      p_kind: "image",
      p_expected_updated_at: VERSION,
      p_file: {
        mime_type: "image/png",
        size_bytes: PNG.byteLength,
        alt_text: "Rocket on the launch pad",
        width: 30,
        height: 20,
      },
    });
    expect(expireEventContent).toHaveBeenCalledWith("rocketry");
  });

  it("finalizes a guidelines PDF into the documents bucket without image fields", async () => {
    claimed = ticket({
      kind: "guidelines",
      object_path: PDF_PATH,
      original_name: "Rules.pdf",
      declared_type: "application/pdf",
      declared_size: PDF.byteLength,
    });
    storage.download.mockImplementation(async () => ({ data: blob(PDF), error: null }));
    expect(await finalize({ kind: "guidelines", altText: "ignored" })).toMatchObject({ ok: true });
    expect(publicWrites()[0]!.slice(0, 3)).toEqual(["ashwamedh-documents", "upload", PDF_PATH]);
    expect(rpc.mock.calls[0]![1].p_file).toEqual({
      mime_type: "application/pdf",
      size_bytes: PDF.byteLength,
      alt_text: null,
      width: null,
      height: null,
    });
  });

  it("rejects bad bytes before anything public: ticket failed, staging removed", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const cases: [Uint8Array, RegExp][] = [
      [new TextEncoder().encode("<html><script>alert(1)</script>"), /not allowed/],
      [PNG.slice(0, -1), /does not match the selected file/], // size differs from the request
    ];
    const broken = PNG.slice();
    broken.set([0x78, 0x9c, 1, 2, 3, 4], broken.length - 30); // inside IDAT; CRC now wrong
    cases.push([broken, /damaged/]);
    for (const [bytes, error] of cases) {
      calls.length = 0;
      storageCalls.length = 0;
      claimed = ticket({ declared_size: bytes.byteLength });
      if (error.source.includes("selected")) claimed = ticket();
      storage.download.mockImplementation(async () => ({ data: blob(bytes), error: null }));
      expect(await finalize()).toMatchObject({
        ok: false,
        reason: "rejected",
        error: expect.stringMatching(error),
      });
      expect(publicWrites()).toEqual([]);
      expect(rpc).not.toHaveBeenCalled();
      expect(ticketUpdates()[0]).toMatchObject({ payload: { status: "failed" } });
      expect(filter(ticketUpdates()[0]!, "status")).toBe("processing");
      expect(removed("ashwamedh-staging")).toEqual([[PATH]]);
    }
  });

  it("rejects an image whose pixel data does not decode (structure intact)", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { crc32, deflateSync } = await import("node:zlib");
    const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
    const chunk = (type: string, data: number[]) => {
      const body = Buffer.from([...Buffer.from(type, "latin1"), ...data]);
      return [...be32(data.length), ...body, ...be32(crc32(body))];
    };
    const bad = new Uint8Array([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...chunk("IHDR", [...be32(30), ...be32(20), 8, 2, 0, 0, 0]),
      ...chunk("IDAT", [...deflateSync(Buffer.alloc(3 * 91))]), // 3 of 20 rows
      ...chunk("IEND", []),
    ]);
    claimed = ticket({ declared_size: bad.byteLength });
    storage.download.mockImplementation(async () => ({ data: blob(bad), error: null }));
    expect(await finalize()).toMatchObject({
      reason: "rejected",
      error: expect.stringMatching(/could not be read/),
    });
    expect(publicWrites()).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("compensates a rolled-back link: public copy removed, ticket failed, no refresh", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const [error, reason] of [
      [{ message: "cms_version_conflict", code: "P0001" }, "conflict"],
      [
        {
          message: 'violates check constraint "events_content_content_needs_source"',
          code: "23514",
        },
        "needs-source",
      ],
      [{ message: "cms_ticket_not_claimed", code: "P0001" }, "invalid"],
      [{ message: "deadlock detected", code: "40P01" }, "failed"],
    ] as const) {
      calls.length = 0;
      storageCalls.length = 0;
      rpc.mockResolvedValueOnce({ data: null, error });
      expect(await finalize()).toMatchObject({ ok: false, reason });
      expect(removed("ashwamedh-images")).toEqual([[PATH]]);
      expect(removed("ashwamedh-staging")).toEqual([[PATH]]);
      expect(ticketUpdates()[0]).toMatchObject({ payload: { status: "failed" } });
    }
    expect(expireEventContent).not.toHaveBeenCalled();
  });

  it("deletes nothing when the outcome is unknown, and recognises a commit", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "TypeError: fetch failed", code: "" },
    });
    stored = { status: "processing" };
    expect(await finalize()).toMatchObject({
      reason: "failed",
      error: expect.stringMatching(/could not be confirmed/),
    });
    expect(removed("ashwamedh-images")).toEqual([]);
    expect(removed("ashwamedh-staging")).toEqual([]);
    expect(ticketUpdates()).toEqual([]); // still processing: retry or recovery claim later

    calls.length = 0;
    storageCalls.length = 0;
    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "TypeError: fetch failed", code: "" },
    });
    rpc.mockResolvedValueOnce(finalizeReply(true));
    stored = { status: "finalized" };
    expect(await finalize()).toMatchObject({ ok: true, fileId: FILE_ID });
    expect(removed("ashwamedh-images")).toEqual([]);
    expect(expireEventContent).toHaveBeenCalledWith("rocketry");
  });

  it("gives the claim back after a temporary Storage problem", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    storage.download.mockResolvedValueOnce({ data: null, error: { message: "Object not found" } });
    expect(await finalize()).toMatchObject({
      reason: "invalid",
      error: expect.stringMatching(/not finished uploading/),
    });
    storage.upload.mockResolvedValueOnce({ data: null, error: { message: "gateway timeout" } });
    expect(await finalize()).toMatchObject({ reason: "failed" });
    const releases = ticketUpdates();
    expect(releases).toHaveLength(2);
    for (const release of releases) {
      expect(release.payload).toEqual({ status: "issued", processing_at: null });
      expect(filter(release, "status")).toBe("processing");
      expect(filter(release, "processing_at")).toBe(claimed!.processing_at);
    }
    expect(rpc).not.toHaveBeenCalled();
    expect(removed("ashwamedh-staging")).toEqual([]);
  });

  it("explains a ticket it cannot claim, and repeats a finalized one idempotently", async () => {
    claimed = null;
    stored = ticket({ status: "finalized", file_id: FILE_ID });
    rpc.mockResolvedValueOnce(finalizeReply(true));
    expect(await finalize()).toEqual({
      ok: true,
      fileId: FILE_ID,
      version: NEW_VERSION,
      repeated: true,
    });
    expect(storageCalls).toEqual([]);

    stored = ticket({ status: "failed" });
    expect(await finalize()).toMatchObject({ reason: "rejected" });
    stored = ticket({ status: "processing" });
    expect(await finalize()).toMatchObject({ reason: "busy" });
    stored = ticket({ event_slug: "hackathon" });
    expect(await finalize()).toMatchObject({ reason: "invalid" });
    stored = ticket({ kind: "guidelines" });
    expect(await finalize()).toMatchObject({ reason: "invalid" });
    stored = null;
    expect(await finalize()).toMatchObject({ reason: "invalid" });

    storageCalls.length = 0;
    stored = ticket({ status: "issued" }); // not claimable: expired
    expect(await finalize()).toMatchObject({ reason: "expired" });
    expect(ticketUpdates().at(-1)).toMatchObject({
      payload: { status: "failed", failure: "Expired." },
    });
    expect(filter(ticketUpdates().at(-1)!, "status")).toBe("issued"); // never a claimed one
    expect(removed("ashwamedh-staging")).toEqual([[PATH]]);
    expect(publicWrites()).toEqual([]);
  });
});

/* ---------- 3. remove, alt text, restore ---------- */

describe("removeEventMedia", () => {
  it("unlinks through the versioned RPC (nothing deleted) and refreshes the event", async () => {
    rpc.mockResolvedValueOnce({ data: NEW_VERSION, error: null });
    const { removeEventMedia } = await import("@/lib/cms/media-admin");
    expect(
      await removeEventMedia({ slug: "rocketry", kind: "guidelines", version: VERSION }),
    ).toEqual({
      ok: true,
      version: NEW_VERSION,
    });
    expect(rpc).toHaveBeenCalledWith("cms_set_event_media", {
      p_slug: "rocketry",
      p_expected_updated_at: VERSION,
      p_kind: "guidelines",
      p_file_id: null,
    });
    expect(storageCalls).toEqual([]);
    expect(expireEventContent).toHaveBeenCalledWith("rocketry");

    rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "cms_version_conflict", code: "P0001" },
    });
    expect(
      await removeEventMedia({ slug: "rocketry", kind: "image", version: VERSION }),
    ).toMatchObject({
      reason: "conflict",
    });
    expect(expireEventContent).toHaveBeenCalledTimes(1);
    signedIn = false;
    await expect(
      removeEventMedia({ slug: "rocketry", kind: "image", version: VERSION }),
    ).rejects.toBeInstanceOf(Redirect);
  });
});

describe("updateEventImageAlt", () => {
  it("sets the alt text of the event's own image only", async () => {
    const { updateEventImageAlt } = await import("@/lib/cms/media-admin");
    expect(await updateEventImageAlt({ slug: "rocketry", altText: " Rocket\non  pad " })).toEqual({
      ok: true,
    });
    const update = calls.find((c) => c.table === "cms_files")!;
    expect(update.payload).toEqual({ alt_text: "Rocket on pad" });
    expect(update.filters).toEqual([
      ["id", FILE_ID],
      ["category", "event-image"],
    ]);
    expect(await updateEventImageAlt({ slug: "rocketry", altText: "   " })).toEqual({ ok: true });
    expect(calls.filter((c) => c.table === "cms_files").at(-1)!.payload).toEqual({
      alt_text: null,
    });

    expect(await updateEventImageAlt({ slug: "rocketry", altText: "x".repeat(301) })).toMatchObject(
      {
        reason: "invalid",
      },
    );
    eventRow = { image_file_id: null };
    expect(await updateEventImageAlt({ slug: "rocketry", altText: "A" })).toMatchObject({
      reason: "invalid",
      error: expect.stringMatching(/no uploaded image/),
    });
  });
});

describe("normalizeAltText", () => {
  it("trims, single-spaces, limits to 300 characters and refuses control characters", async () => {
    const { normalizeAltText } = await import("@/lib/cms/media-admin");
    expect(normalizeAltText("  a \t b\n c ")).toEqual({ ok: true, value: "a b c" });
    expect(normalizeAltText("")).toEqual({ ok: true, value: null });
    expect(normalizeAltText(null)).toEqual({ ok: true, value: null });
    expect(normalizeAltText("x".repeat(300))).toMatchObject({ ok: true });
    expect(normalizeAltText("x".repeat(301))).toEqual({ ok: false });
    expect(normalizeAltText("a\u0000b")).toEqual({ ok: false });
    expect(normalizeAltText(42)).toEqual({ ok: false });
  });
});

describe("media Server Actions", () => {
  it("check the session and pass only primitive values on", async () => {
    const actions = await import("@/app/admin/events/media-actions");
    signedIn = false;
    await expect(
      actions.requestMediaUploadAction("rocketry", {
        kind: "image",
        filename: "a.png",
        type: "image/png",
        size: 1,
        version: VERSION,
      }),
    ).rejects.toBeInstanceOf(Redirect);
    await expect(
      actions.finalizeMediaUploadAction("rocketry", {
        kind: "image",
        ticketId: TICKET,
        version: VERSION,
      }),
    ).rejects.toBeInstanceOf(Redirect);
    await expect(
      actions.removeEventMediaAction("rocketry", { kind: "image", version: VERSION }),
    ).rejects.toBeInstanceOf(Redirect);
    await expect(
      actions.updateEventImageAltAction("rocketry", { altText: "A" }),
    ).rejects.toBeInstanceOf(Redirect);
    expect(calls).toEqual([]);

    signedIn = true;
    expect(
      await actions.requestMediaUploadAction("rocketry", {
        kind: "image",
        filename: "a.png",
        type: "image/png",
        size: "1000",
        version: VERSION,
      }),
    ).toMatchObject({ ok: false, reason: "invalid" });
    expect(
      await actions.finalizeMediaUploadAction("rocketry", {
        kind: { toString: () => "image" },
        ticketId: TICKET,
        version: VERSION,
      }),
    ).toMatchObject({ ok: false, reason: "invalid" });
    expect(calls).toEqual([]);
  });
});
