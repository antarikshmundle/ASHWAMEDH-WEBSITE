import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseCredentials } from "./config";

/**
 * Supabase client factory (Phase 10.2). Always the service role, therefore SERVER ONLY:
 * app code goes through src/lib/cms/server.ts ("server-only"); the seed script calls this
 * directly. Client components must never import src/lib/cms (enforced by a unit test).
 *
 * Supabase Auth is not used — admin sign-in is the project's own (src/lib/admin).
 */
export function createCmsClient(
  credentials: SupabaseCredentials,
  fetchImpl?: typeof fetch,
): SupabaseClient {
  return createClient(credentials.url, credentials.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: fetchImpl ? { fetch: fetchImpl } : undefined,
  });
}

/** Public URL of a file in a public bucket (the website links to it directly). */
export function publicFileUrl(projectUrl: string, bucket: string, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${projectUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encoded}`;
}
