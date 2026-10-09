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
  it("saves through cms_save_event atomically, rejects stale versions, and is reverted", async () => {
    const slug = "carrom";
    const read = async () => {
      const { data, error } = await client
        .from(CMS_TABLES.events)
        .select("venue, source_kind, updated_at")
        .eq("event_slug", slug)
        .single();
      if (error) throw new Error(error.message);
      return data as { venue: string | null; source_kind: string | null; updated_at: string };
    };
    const before = await read();
    const save = (version: string, content: object, coordinators: object[] = []) =>
      client.rpc("cms_save_event", {
        p_slug: slug,
        p_expected_updated_at: version,
        p_content: content,
        p_coordinators: coordinators,
      });
    const qa = {
      venue: "QA-TEMP — not official (reverted)",
      registration_status: "not-open",
      source_kind: "owner-confirmed",
      source_reference: "QA temporary check",
      source_date: "2026-10-09",
    };
    const revisionIds = async () =>
      new Set(
        (
          (await client.from("events_content_revisions").select("id").eq("event_slug", slug))
            .data ?? []
        ).map((r: { id: string }) => r.id),
      );
    const existingRevisions = await revisionIds();
    try {
      const saved = await save(before.updated_at, qa, [
        { name: "QA Temp", designation: null, phone: null, email: null, sort_order: 0 },
      ]);
      expect(saved.error).toBeNull();
      expect((await read()).venue).toBe(qa.venue);
      const stale = await save(before.updated_at, { registration_status: "not-open" });
      expect(stale.error?.message).toMatch(/cms_version_conflict/);
      const invalid = await save((await read()).updated_at, { ...qa, registration_status: "open" });
      expect(invalid.error).not.toBeNull();
      expect((await read()).venue).toBe(qa.venue);
    } finally {
      const reverted = await save(
        (await read()).updated_at,
        { registration_status: "not-open" },
        [],
      );
      expect(reverted.error).toBeNull();
      const after = await read();
      expect(after.venue).toBeNull();
      expect(after.source_kind).toBeNull();
      // Remove the history rows this test created (they hold only QA text).
      const created = [...(await revisionIds())].filter((id) => !existingRevisions.has(id));
      if (created.length) await client.from("events_content_revisions").delete().in("id", created);
      expect([...(await revisionIds())].sort()).toEqual([...existingRevisions].sort());
      const coords = await client.from(CMS_TABLES.coordinators).select("id").eq("event_slug", slug);
      expect(coords.data).toEqual([]);
    }
  });
});
