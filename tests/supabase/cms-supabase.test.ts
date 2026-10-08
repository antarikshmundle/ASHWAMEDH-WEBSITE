import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { eventInventory } from "@/data/events";
import { createCmsClient, publicFileUrl } from "@/lib/cms/client";
import { readSupabaseCredentials, type SupabaseCredentials } from "@/lib/cms/config";
import { BUCKETS, CMS_TABLES } from "@/lib/cms/schema";
import { runSeed, supabaseSeedStore } from "@/lib/cms/seed";

/**
 * Real Supabase checks (Phase 10.2). Run against a project that has the migrations applied:
 *   npm run test:supabase
 * Without credentials this suite FAILS on purpose — it is never skipped silently.
 */

let credentials: SupabaseCredentials;
let client: SupabaseClient;

beforeAll(() => {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const found = readSupabaseCredentials();
  if (!found) {
    throw new Error(
      "test:supabase needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for a migrated project.",
    );
  }
  credentials = found;
  client = createCmsClient(found);
});

describe("Supabase CMS (live project)", () => {
  it("seeds exactly one row per frozen event, and a second run changes nothing", async () => {
    const first = await runSeed(supabaseSeedStore(client));
    const second = await runSeed(supabaseSeedStore(client));
    expect(first.totalRows - first.unknownSlugs.length).toBe(eventInventory.length);
    expect(second.inserted).toEqual([]);
    expect(second.totalRows).toBe(first.totalRows);
  });

  it("enforces the registration rules in the database", async () => {
    const slug = eventInventory[0]!.slug;
    const { error } = await client
      .from(CMS_TABLES.events)
      .update({ registration_url: "https://evil.example/form" })
      .eq("event_slug", slug);
    expect(error?.message).toMatch(/check constraint|violates/i);
  });

  it("refuses table access without the service role", async () => {
    const response = await fetch(
      `${credentials.url}/rest/v1/${CMS_TABLES.events}?select=event_slug`,
    );
    expect(response.ok).toBe(false);
  });

  it("stores a PDF publicly readable, refuses anonymous writes, and cleans up", async () => {
    const path = `events/${eventInventory[0]!.slug}/${randomUUID()}.pdf`;
    const pdf = new TextEncoder().encode("%PDF-1.4\n%%EOF\n");
    const upload = await client.storage
      .from(BUCKETS.documents)
      .upload(path, pdf, { contentType: "application/pdf" });
    expect(upload.error).toBeNull();
    try {
      const read = await fetch(publicFileUrl(credentials.url, BUCKETS.documents, path));
      expect(read.status).toBe(200);
      const anonymous = await fetch(
        `${credentials.url}/storage/v1/object/${BUCKETS.documents}/events/x/${randomUUID()}.pdf`,
        { method: "POST", headers: { "content-type": "application/pdf" }, body: pdf },
      );
      expect(anonymous.ok).toBe(false);
      const html = await client.storage
        .from(BUCKETS.documents)
        .upload(`events/x/${randomUUID()}.pdf`, new TextEncoder().encode("<script>"), {
          contentType: "text/html",
        });
      expect(html.error).not.toBeNull();
    } finally {
      await client.storage.from(BUCKETS.documents).remove([path]);
    }
  });
});
