// Seeds the CMS database from the repository (Phase 10.2). Idempotent: inserts only the event
// slugs that have no row yet and never overwrites or deletes. Run after the migrations:
//   npm run cms:seed
// Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment (e.g. from .env.local).
import { existsSync } from "node:fs";
import { createCmsClient } from "@/lib/cms/client";
import { requireSupabaseCredentials } from "@/lib/cms/config";
import { runSeed, supabaseSeedStore } from "@/lib/cms/seed";

// Local runs read .env.local; in CI / production the variables come from the environment.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const credentials = requireSupabaseCredentials();
const result = await runSeed(supabaseSeedStore(createCmsClient(credentials)));

console.log(`Inventory events:        ${result.inventory}`);
console.log(
  `Inserted now:            ${result.inserted.length}${result.inserted.length ? ` (${result.inserted.join(", ")})` : ""}`,
);
console.log(`Already present:         ${result.alreadyPresent}`);
console.log(`Rows in events_content:  ${result.totalRows}`);
if (result.unknownSlugs.length) {
  console.warn(`Rows for unknown slugs (ignored by the site): ${result.unknownSlugs.join(", ")}`);
}
if (result.totalRows - result.unknownSlugs.length !== result.inventory) {
  console.error(
    "Seed check failed: events_content does not hold exactly one row per inventory event.",
  );
  process.exit(1);
}
