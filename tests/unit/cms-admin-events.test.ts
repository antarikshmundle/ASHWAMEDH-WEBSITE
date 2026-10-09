import { beforeEach, describe, expect, it, vi } from "vitest";
import { eventInventory } from "@/data/events";
import { identityToSeedRows } from "@/lib/cms/mapping";

/* ---------- mocks: admin session, Supabase client, cache ---------- */

class Redirect extends Error {}
let signedIn = true;
vi.mock("@/lib/admin/auth", () => ({
  requireAdmin: async () => {
    if (!signedIn) throw new Redirect("/admin/login");
    return { sub: "admin" };
  },
}));

const updateTag = vi.fn();
vi.mock("next/cache", () => ({ updateTag: (tag: string) => updateTag(tag) }));

const VERSION = "2026-10-09 10:00:00.123456+00";
let storedRow: Record<string, unknown> | null;
let rpcResult: { data: unknown; error: { message: string } | null };
let revisionRow: unknown;
const rpc = vi.fn(async () => rpcResult);

function query(result: () => { data: unknown; error: null }) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => Promise.resolve(result()),
    maybeSingle: () => Promise.resolve(result()),
  };
  return builder;
}
vi.mock("@/lib/cms/server", () => ({
  cmsAdminClient: () => ({
    client: {
      rpc,
      from: (table: string) =>
        query(() => ({
          data: table === "events_content_revisions" ? revisionRow : storedRow,
          error: null,
        })),
    },
    credentials: { url: "https://x.supabase.co", serviceRoleKey: "k" },
  }),
}));

const identity = eventInventory.find((e) => e.slug === "hackathon")!;
const emptyRow = () => ({
  ...identityToSeedRows(identity, undefined).event,
  updated_at: VERSION,
  event_coordinators: [],
  guidelines_file: null,
  image_file: null,
});

function form(fields: Record<string, string>, coordinators: string[][] = []) {
  const data = new FormData();
  data.set("version", VERSION);
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  for (const [name, designation, phone, email] of coordinators) {
    data.append("coordinatorName", name ?? "");
    data.append("coordinatorDesignation", designation ?? "");
    data.append("coordinatorPhone", phone ?? "");
    data.append("coordinatorEmail", email ?? "");
  }
  return data;
}
const SOURCE = {
  sourceKind: "official-form",
  sourceReference: "IT Hackathon form",
  sourceDate: "2026-10-08",
};
const idle = { status: "idle" as const, version: VERSION, nonce: 0 };

beforeEach(() => {
  signedIn = true;
  storedRow = emptyRow();
  revisionRow = null;
  rpcResult = { data: "2026-10-09 10:05:00.5+00", error: null };
  vi.clearAllMocks();
});

describe("saveEventAction", () => {
  it("requires an admin session before anything else", async () => {
    signedIn = false;
    const { saveEventAction } = await import("@/app/admin/events/actions");
    await expect(
      saveEventAction("hackathon", idle, form({ venue: "Hall A", ...SOURCE })),
    ).rejects.toBeInstanceOf(Redirect);
    expect(rpc).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("refuses slugs outside the frozen inventory (no event creation)", async () => {
    const { saveEventAction } = await import("@/app/admin/events/actions");
    for (const slug of ["new-event", "cultural-night", "../hackathon"])
      expect(
        (await saveEventAction(slug, idle, form({ venue: "X", ...SOURCE }))).status,
        slug,
      ).toBe("missing");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns field errors and keeps the input when validation fails — the database is not touched", async () => {
    const { saveEventAction } = await import("@/app/admin/events/actions");
    const state = await saveEventAction(
      "hackathon",
      idle,
      form({ registrationStatus: "open", venue: "Hall A", ...SOURCE }),
    );
    expect(state).toMatchObject({
      status: "invalid",
      version: VERSION,
      values: { venue: "Hall A" },
    });
    expect(state.errors?.registrationStatus).toMatch(/only be open/);
    expect(rpc).not.toHaveBeenCalled();
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("saves atomically with the loaded version, then refreshes only that event and the listings", async () => {
    const { saveEventAction } = await import("@/app/admin/events/actions");
    const state = await saveEventAction(
      "hackathon",
      idle,
      form(
        {
          venue: "  Main Auditorium ",
          registrationStatus: "open",
          registrationUrl: "https://forms.gle/AbC123xyz",
          ...SOURCE,
        },
        [["A. Coordinator", "Faculty Coordinator", "+91 98765 43210", ""]],
      ),
    );
    expect(state).toMatchObject({
      status: "saved",
      version: "2026-10-09 10:05:00.5+00",
      values: { venue: "Main Auditorium" },
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = rpc.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(fn).toBe("cms_save_event");
    expect(args).toMatchObject({
      p_slug: "hackathon",
      p_expected_updated_at: VERSION,
      p_content: {
        venue: "Main Auditorium",
        registration_status: "open",
        registration_url: "https://forms.gle/AbC123xyz",
        source_kind: "official-form",
      },
      p_coordinators: [
        {
          name: "A. Coordinator",
          designation: "Faculty Coordinator",
          phone: "+91 98765 43210",
          email: null,
          sort_order: 0,
        },
      ],
    });
    expect(
      Object.keys(args.p_content as object).some((k) => /prize|image|name|slug|department/.test(k)),
    ).toBe(false);
    expect(updateTag.mock.calls.map((c) => c[0])).toEqual(["cms:event:hackathon", "cms:events"]);
  });

  it("reports a version conflict without refreshing anything", async () => {
    rpcResult = { data: null, error: { message: "cms_version_conflict" } };
    const { saveEventAction } = await import("@/app/admin/events/actions");
    const state = await saveEventAction("hackathon", idle, form({ venue: "Hall A", ...SOURCE }));
    expect(state).toMatchObject({ status: "conflict", values: { venue: "Hall A" } });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("reports a database failure, keeps the input, refreshes nothing", async () => {
    rpcResult = { data: null, error: { message: "connection terminated" } };
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { saveEventAction } = await import("@/app/admin/events/actions");
    const state = await saveEventAction("hackathon", idle, form({ venue: "Hall A", ...SOURCE }));
    expect(state).toMatchObject({ status: "error", values: { venue: "Hall A" } });
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("cannot save before the seed has created the row", async () => {
    storedRow = null;
    const { saveEventAction } = await import("@/app/admin/events/actions");
    expect(
      (await saveEventAction("hackathon", idle, form({ venue: "Hall A", ...SOURCE }))).status,
    ).toBe("missing");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("keeps the source required while the event has an image (Phase 10.4 field)", async () => {
    storedRow = {
      ...emptyRow(),
      image_path: "/images/events/hackathon.webp",
      source_kind: "owner-confirmed",
      source_reference: "x",
      source_date: "2026-10-01",
    };
    const { saveEventAction } = await import("@/app/admin/events/actions");
    const state = await saveEventAction("hackathon", idle, form({}));
    expect(state.status).toBe("invalid");
    expect(state.errors?.sourceKind).toBeDefined();
  });
});

describe("restoreRevisionAction", () => {
  it("validates the stored version and saves it like an edit", async () => {
    revisionRow = {
      content: {
        ...identityToSeedRows(identity, undefined).event,
        venue: "Old Hall",
        source_kind: "owner-confirmed",
        source_reference: "Earlier entry",
        source_date: "2026-10-01",
      },
      coordinators: [],
    };
    const { restoreRevisionAction } = await import("@/app/admin/events/actions");
    const state = await restoreRevisionAction(
      "hackathon",
      idle,
      form({ revisionId: "11111111-1111-4111-8111-111111111111" }),
    );
    expect(state).toMatchObject({ status: "restored", values: { venue: "Old Hall" } });
    expect(
      (rpc.mock.calls[0] as unknown as [string, { p_content: object }])[1].p_content,
    ).toMatchObject({ venue: "Old Hall" });
    expect(updateTag).toHaveBeenCalledTimes(2);
  });

  it("refuses unknown revisions and needs an admin session", async () => {
    const { restoreRevisionAction } = await import("@/app/admin/events/actions");
    expect(
      (await restoreRevisionAction("hackathon", idle, form({ revisionId: "not-a-uuid" }))).status,
    ).toBe("invalid");
    signedIn = false;
    await expect(
      restoreRevisionAction(
        "hackathon",
        idle,
        form({ revisionId: "11111111-1111-4111-8111-111111111111" }),
      ),
    ).rejects.toBeInstanceOf(Redirect);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("editorAction (single form entry point)", () => {
  it("routes restore and save by intent, and advances the nonce", async () => {
    revisionRow = {
      content: {
        ...identityToSeedRows(identity, undefined).event,
        venue: "Old Hall",
        source_kind: "owner-confirmed",
        source_reference: "Earlier entry",
        source_date: "2026-10-01",
      },
      coordinators: [],
    };
    const { editorAction } = await import("@/app/admin/events/actions");
    const restored = await editorAction(
      "hackathon",
      { ...idle, nonce: 4 },
      form({ intent: "restore", revisionId: "11111111-1111-4111-8111-111111111111" }),
    );
    expect(restored).toMatchObject({ status: "restored", nonce: 5 });
    const saved = await editorAction("hackathon", restored, form({ venue: "Hall A", ...SOURCE }));
    expect(saved).toMatchObject({ status: "saved", nonce: 6, values: { venue: "Hall A" } });
  });
});
