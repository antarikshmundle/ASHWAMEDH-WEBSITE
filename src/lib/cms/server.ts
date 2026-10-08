import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createCmsClient } from "./client";
import { requireSupabaseCredentials, type SupabaseCredentials } from "./config";

/**
 * Server-only access to the CMS database and storage (Phase 10.2). The service-role key never
 * leaves the server: this module cannot be imported into client code ("server-only").
 */

/** Uncached client for admin reads and writes. Callers must have run requireAdmin() first. */
export function cmsAdminClient(): { client: SupabaseClient; credentials: SupabaseCredentials } {
  const credentials = requireSupabaseCredentials();
  return { client: createCmsClient(credentials), credentials };
}

/**
 * Client for public reads: every request goes through Next.js' data cache with the given tags,
 * so pages stay static and are refreshed only when those tags are expired after an admin save.
 */
export function cmsPublicReadClient(tags: string[]): {
  client: SupabaseClient;
  credentials: SupabaseCredentials;
} {
  const credentials = requireSupabaseCredentials();
  const cachedFetch: typeof fetch = (input, init) =>
    fetch(input, { ...init, cache: "force-cache", next: { tags } });
  return { client: createCmsClient(credentials, cachedFetch), credentials };
}
