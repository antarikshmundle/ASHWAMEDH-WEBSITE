"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { applyCleanup, loadCleanupInputs, planCleanup } from "@/lib/cms/cleanup";
import { cmsAdminClient } from "@/lib/cms/server";

/**
 * Admin cleanup of unused event media (Phase 10.4.6). The page shows a dry run; this action
 * deletes only after an explicit confirmation, re-plans on the server (nothing from the browser
 * says what to delete) and re-checks every item before deleting it (src/lib/cms/cleanup.ts).
 */

export interface CleanupState {
  status: "idle" | "done" | "not-confirmed" | "error";
  deleted?: { files: number; orphans: number; staging: number };
  skipped?: string[];
  failures?: string[];
  nonce: number;
}

export async function applyCleanupAction(
  previous: CleanupState,
  formData: FormData,
): Promise<CleanupState> {
  await requireAdmin();
  const nonce = (previous?.nonce ?? 0) + 1;
  if (formData.get("confirm") !== "delete-unused-files") return { status: "not-confirmed", nonce };
  try {
    const { client } = cmsAdminClient();
    const report = await applyCleanup(client, planCleanup(await loadCleanupInputs(client)));
    return {
      status: "done",
      deleted: {
        files: report.deleted.files.length,
        orphans: report.deleted.orphans.length,
        staging: report.deleted.staging.length,
      },
      skipped: report.skipped,
      failures: report.failures,
      nonce,
    };
  } catch (error) {
    console.error(`[cms] cleanup failed: ${(error as Error).message}`);
    return { status: "error", nonce };
  }
}
