import { afterEach, describe, expect, it, vi } from "vitest";
import { eventInventory, events } from "@/data/events";
import { publicFileUrl } from "@/lib/cms/client";
import {
  CmsConfigError,
  contentSourceMode,
  readSupabaseCredentials,
  requireSupabaseCredentials,
} from "@/lib/cms/config";
import { identityToSeedRows, recordToDetails } from "@/lib/cms/mapping";
import { EVENTS_TAG, eventTag, type EventContentRecord } from "@/lib/cms/schema";
import { registrationState } from "@/lib/display";

const URL_ = "https://abcd1234.supabase.co";
const KEY = "service-role-key-for-tests-only-0123456789";

const emptyRecord = (slug: string): EventContentRecord => ({
  ...identityToSeedRows(
    eventInventory.find((e) => e.slug === slug)!,
    undefined,
  ).event,
  event_coordinators: [],
  guidelines_file: null,
  image_file: null,
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("CMS configuration", () => {
  it("defaults to the repository and needs no credentials", () => {
    expect(contentSourceMode({})).toBe("repository");
    expect(contentSourceMode({ CMS_CONTENT_SOURCE: "database" })).toBe("database");
    expect(() => contentSourceMode({ CMS_CONTENT_SOURCE: "supabase" })).toThrow(CmsConfigError);
  });

  it("accepts only https project URLs (http only for a local Supabase) and a real key", () => {
    const creds = (url: string, key = KEY) =>
      readSupabaseCredentials({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key });
    expect(creds(URL_)).toEqual({ url: URL_, serviceRoleKey: KEY });
    expect(creds(`${URL_}/`)?.url).toBe(URL_);
    expect(creds("http://127.0.0.1:54321")?.url).toBe("http://127.0.0.1:54321");
    for (const bad of [
      "http://abcd.supabase.co",
      "ftp://x",
      `${URL_}/rest/v1`,
      "https://u:p@x.co",
      "nope",
    ])
      expect(creds(bad), bad).toBeNull();
    expect(creds(URL_, "short")).toBeNull();
    expect(() => requireSupabaseCredentials({})).toThrow(/SUPABASE_URL/);
  });
});

describe("rows ⇄ domain (NULL / TBA contract, provenance)", () => {
  it("treats a row without content as an event without details (all TBA)", () => {
    expect(recordToDetails(emptyRecord("hackathon"), URL_)).toBeUndefined();
  });

  it("refuses stored content without a source", () => {
    expect(() => recordToDetails({ ...emptyRecord("hackathon"), venue: "Hall A" }, URL_)).toThrow(
      /no source/,
    );
  });

  it("maps content, ordered coordinators, provenance and stored files", () => {
    const details = recordToDetails(
      {
        ...emptyRecord("hackathon"),
        venue: "Main Auditorium",
        registration_status: "open",
        registration_url: "https://forms.gle/AbC123xyz",
        source_kind: "official-pdf",
        source_reference: "IT_Hackathon_2026.pdf",
        source_date: "2026-11-02",
        guidelines_file: { bucket: "ashwamedh-documents", path: "events/hackathon/x.pdf" },
        event_coordinators: [
          { name: "B", designation: null, phone: null, email: null, sort_order: 1 },
          {
            name: "A",
            designation: "Faculty Coordinator",
            phone: "+91 98765 43210",
            email: null,
            sort_order: 0,
          },
        ],
      },
      URL_,
    );
    expect(details).toMatchObject({
      source: { kind: "official-pdf", reference: "IT_Hackathon_2026.pdf", date: "2026-11-02" },
      venue: "Main Auditorium",
      status: "open",
      pdf: `${URL_}/storage/v1/object/public/ashwamedh-documents/events/hackathon/x.pdf`,
    });
    expect(details?.coordinators?.map((c) => c.name)).toEqual(["A", "B"]);
    expect(details?.teamSize).toBeUndefined();
  });

  it("builds public file URLs without letting the path escape", () => {
    expect(publicFileUrl(URL_, "ashwamedh-images", "gallery/a b.png")).toBe(
      `${URL_}/storage/v1/object/public/ashwamedh-images/gallery/a%20b.png`,
    );
  });
});

/* ---------- Public loader ---------- */

function postgrestStub(rows: EventContentRecord[]) {
  const calls: { url: string; init: RequestInit & { next?: { tags?: string[] } } }[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push({ url, init });
    const slug = new URL(url).searchParams.get("event_slug")?.replace(/^eq\./, "");
    const body = slug ? rows.filter((r) => r.event_slug === slug) : rows;
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  return calls;
}

describe("public event loader", () => {
  it("repository mode returns exactly today's records, without network access", async () => {
    const calls = postgrestStub([]);
    const { loadEvents, loadEvent, loadEventsByVertical } = await import("@/lib/cms/events");
    expect(await loadEvents()).toEqual(events);
    expect(await loadEvent("tug-of-war")).toEqual(events.find((e) => e.slug === "tug-of-war"));
    expect(await loadEventsByVertical("sports")).toHaveLength(11);
    expect(await loadEvent("not-an-event")).toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it("database mode fails loudly without credentials", async () => {
    vi.stubEnv("CMS_CONTENT_SOURCE", "database");
    const { loadEvents } = await import("@/lib/cms/events");
    await expect(loadEvents()).rejects.toThrow(/Supabase is not configured/);
  });

  it("database mode reads tagged, cached content and keeps identity from the repository", async () => {
    vi.stubEnv("CMS_CONTENT_SOURCE", "database");
    vi.stubEnv("SUPABASE_URL", URL_);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", KEY);
    const rows = eventInventory.map((e) => emptyRecord(e.slug));
    const hackathon = rows.find((r) => r.event_slug === "hackathon")!;
    Object.assign(hackathon, {
      venue: "Main Auditorium",
      source_kind: "owner-confirmed",
      source_reference: "Test fixture",
      source_date: "2026-10-08",
    });
    rows.push({ ...emptyRecord("debate"), event_slug: "not-in-inventory" });
    const calls = postgrestStub(rows);
    const { loadEvents, loadEvent } = await import("@/lib/cms/events");

    const all = await loadEvents();
    expect(all.map((e) => [e.slug, e.name, e.category, e.department])).toEqual(
      events.map((e) => [e.slug, e.name, e.category, e.department]),
    );
    expect(all.find((e) => e.slug === "hackathon")?.venue).toBe("Main Auditorium");
    expect(all.find((e) => e.slug === "debate")?.venue).toBeNull();
    expect(calls[0]?.init).toMatchObject({ cache: "force-cache", next: { tags: [EVENTS_TAG] } });
    expect(calls[0]?.url).toContain(`${URL_}/rest/v1/events_content`);

    expect((await loadEvent("hackathon"))?.venue).toBe("Main Auditorium");
    expect(calls[1]?.init).toMatchObject({ next: { tags: [eventTag("hackathon")] } });
    expect(new URL(calls[1]!.url).searchParams.get("event_slug")).toBe("eq.hackathon");
  });

  it("database mode keeps registration validation: an unsafe stored link fails, never renders", async () => {
    vi.stubEnv("CMS_CONTENT_SOURCE", "database");
    vi.stubEnv("SUPABASE_URL", URL_);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", KEY);
    const row = {
      ...emptyRecord("hackathon"),
      registration_status: "open" as const,
      registration_url: "https://evil.example/phish",
      source_kind: "owner-confirmed" as const,
      source_reference: "Test fixture",
      source_date: "2026-10-08",
    };
    postgrestStub([row]);
    const { loadEvent } = await import("@/lib/cms/events");
    await expect(loadEvent("hackathon")).rejects.toThrow(/registrationLink .* not allowed/);
  });

  it("database mode shows Register Now only for open + official Google Form", async () => {
    vi.stubEnv("CMS_CONTENT_SOURCE", "database");
    vi.stubEnv("SUPABASE_URL", URL_);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", KEY);
    const base = {
      ...emptyRecord("hackathon"),
      registration_url: "https://forms.gle/AbC123xyz",
      source_kind: "official-form" as const,
      source_reference: "IT Hackathon form",
      source_date: "2026-10-08",
    };
    for (const [status, kind] of [
      ["not-open", "opening-soon"],
      ["open", "open"],
      ["closed", "closed"],
    ] as const) {
      postgrestStub([{ ...base, registration_status: status }]);
      vi.resetModules();
      const { loadEvent } = await import("@/lib/cms/events");
      expect(registrationState((await loadEvent("hackathon"))!).kind, status).toBe(kind);
    }
  });
});

/* ---------- Secret safety ---------- */

describe("CMS secret safety", async () => {
  const { readdirSync, readFileSync, statSync } = await import("node:fs");
  const { join } = await import("node:path");
  const SRC = join(process.cwd(), "src");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : [];
    });

  it("keeps Supabase and the CMS out of client components", () => {
    for (const file of files(SRC)) {
      const text = readFileSync(file, "utf8");
      if (/^["']use client["']/.test(text))
        expect(text, file).not.toMatch(/@\/lib\/cms|@supabase\/|SUPABASE_|SERVICE_ROLE/);
    }
  });

  it("never exposes Supabase settings as public env variables", () => {
    for (const file of [...files(SRC), join(process.cwd(), ".env.example")])
      expect(readFileSync(file, "utf8"), file).not.toMatch(/NEXT_PUBLIC_SUPABASE|NEXT_PUBLIC_CMS/);
  });

  it("marks every module that holds the service-role client as server-only", () => {
    for (const name of ["server.ts", "events.ts", "files.ts", "revalidate.ts"])
      expect(readFileSync(join(SRC, "lib", "cms", name), "utf8"), name).toMatch(
        /^import "server-only";/,
      );
  });
});
