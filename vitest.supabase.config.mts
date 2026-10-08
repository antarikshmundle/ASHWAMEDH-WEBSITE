import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Real Supabase integration tests (Phase 10.2): `npm run test:supabase`.
 * Needs a migrated Supabase project in SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (or .env.local).
 * Kept out of `npm test`, which must run without credentials.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": "next/dist/compiled/server-only/empty.js",
    },
  },
  test: {
    environment: "node",
    include: ["tests/supabase/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
