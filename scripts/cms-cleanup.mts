// Removes unused event media (Phase 10.4.6). DRY RUN by default — it only lists what would go:
//   npm run cms:cleanup              (dry run)
//   npm run cms:cleanup -- --apply   (deletes; every item is re-checked first)
// Keeps everything in use, everything inside the 24-hour grace (1 hour for staging) and anything an
// active upload points to. Safe to run again. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
// (e.g. from .env.local). See docs/architecture/admin-cms.md for the runbook.
import { existsSync } from "node:fs";
import { applyCleanup, loadCleanupInputs, planCleanup } from "@/lib/cms/cleanup";
import { createCmsClient } from "@/lib/cms/client";
import { requireSupabaseCredentials } from "@/lib/cms/config";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const args = process.argv.slice(2);
const unknown = args.filter((a) => a !== "--apply");
if (unknown.length) {
  console.error(`Unknown option(s): ${unknown.join(" ")}. Use --apply to delete; nothing else.`);
  process.exit(2);
}
const apply = args.includes("--apply");

const client = createCmsClient(requireSupabaseCredentials());
const plan = planCleanup(await loadCleanupInputs(client));
const total = plan.files.length + plan.orphans.length + plan.staging.length;

console.log(`${apply ? "APPLY" : "DRY RUN"} at ${plan.now}`);
console.log(`Unused file rows past the grace: ${plan.files.length}`);
for (const f of plan.files) console.log(`  ${f.bucket}/${f.path} (unused since ${f.unusedSince})`);
console.log(`Public objects without a row:    ${plan.orphans.length}`);
for (const o of plan.orphans) console.log(`  ${o.bucket}/${o.path} (written ${o.writtenAt})`);
console.log(`Old staging objects:             ${plan.staging.length}`);
for (const o of plan.staging) console.log(`  ${o.path} (written ${o.writtenAt})`);
const k = plan.kept;
console.log(
  `Kept: ${k.inUse} in use, ${k.inGrace} within the grace, ${k.activeUpload} with an active upload, ${k.outsideEvents} outside events/ and gallery/`,
);

if (!apply) {
  console.log(total ? "Dry run only — re-run with --apply to delete these." : "Nothing to delete.");
} else if (total) {
  const report = await applyCleanup(client, plan);
  console.log(
    `Deleted: ${report.deleted.files.length} files, ${report.deleted.orphans.length} orphaned objects, ${report.deleted.staging.length} staging objects`,
  );
  for (const s of report.skipped) console.log(`  skipped ${s}`);
  for (const f of report.failures) console.error(`  FAILED ${f}`);
  if (report.failures.length) process.exit(1);
} else {
  console.log("Nothing to delete.");
}
