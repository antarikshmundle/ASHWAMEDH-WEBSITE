import { createClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

/**
 * Cache lifetime of uploaded public media (approved in the 10.4.4 review): one day at the origin,
 * and what that means for the Next.js image optimizer. Lowering it does NOT purge copies that are
 * already cached (see docs/architecture/admin-cms.md, "Known limitation").
 */

vi.mock("@/lib/admin/auth", () => ({ requireAdmin: async () => ({ sub: "admin" }) }));

describe("public media cache headers", () => {
  it("uploads public media with Cache-Control: max-age=86400 (one day)", async () => {
    const { PUBLIC_CACHE_MAX_AGE } = await import("@/lib/cms/media-admin");
    expect(PUBLIC_CACHE_MAX_AGE).toBe("86400");

    // The real storage-js client turns the option into the header Storage stores and serves.
    const sent: Headers[] = [];
    const fetchSpy = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      sent.push(new Headers(init?.headers));
      return new Response(JSON.stringify({ Key: "ashwamedh-images/events/x/y.png" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const client = createClient("https://abcdefghijklmnop.supabase.co", "service-key", {
      auth: { persistSession: false },
      global: { fetch: fetchSpy as typeof fetch },
    });
    await client.storage
      .from("ashwamedh-images")
      .upload("events/hackathon/0b9f5d4e-8c5a-4f6e-9a1b-2c3d4e5f6a7b.png", new Uint8Array([1]), {
        contentType: "image/png",
        cacheControl: PUBLIC_CACHE_MAX_AGE,
        upsert: true,
      });
    expect(sent[0]!.get("cache-control")).toBe("max-age=86400");
    expect(sent[0]!.get("content-type")).toBe("image/png");
  });

  it("the optimizer keeps optimized copies for max(minimumCacheTTL, origin max-age) = one day", async () => {
    const { getMaxAge } = await import("next/dist/server/image-optimizer");
    const { default: config } = await import("../../next.config");
    const minimumCacheTTL = config.images?.minimumCacheTTL ?? 14_400; // Next.js default: 4 hours
    expect(minimumCacheTTL).toBe(14_400);
    expect(Math.max(minimumCacheTTL, getMaxAge("max-age=86400"))).toBe(86_400);
    // Before the change it was a year.
    expect(Math.max(minimumCacheTTL, getMaxAge("max-age=31536000"))).toBe(31_536_000);
  });
});
