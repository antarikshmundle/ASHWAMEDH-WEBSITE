import type { Metadata } from "next";
import Link from "next/link";
import { CmsUnavailable, PublishingNotice } from "@/components/admin/cms-notices";
import { SettingsEditor } from "@/components/admin/settings-editor";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettingsForEdit } from "@/lib/cms/admin-settings";
import { SETTINGS_LIMITS, rowToFormValues } from "@/lib/cms/settings-form";

export const metadata: Metadata = { title: "Festival settings" };

/**
 * Festival settings (Phase 10.5): contact, social links, Cultural Night dates, schedule times and
 * venues, taglines. Schedule titles, "What's On" and event identity are fixed in the repository.
 */
export default async function SettingsPage() {
  await requireAdmin();
  let row: Awaited<ReturnType<typeof getSettingsForEdit>> | undefined;
  try {
    row = await getSettingsForEdit();
  } catch (error) {
    console.error(`[cms] loading festival settings failed: ${(error as Error).message}`);
  }

  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center type-meta text-fg-secondary hover:text-fg"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-2 type-h2 text-fg">Festival settings</h1>
      <p className="mt-2 type-body-sm text-fg-secondary">
        Contact details, social links, Cultural Night dates, schedule times and venues, and
        taglines. Enter official information only; empty fields keep showing TBA.
      </p>
      <PublishingNotice />
      {row === undefined && <CmsUnavailable />}
      {row === null && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-accent bg-surface-2 px-4 py-3 type-body-sm text-fg"
        >
          The festival settings record does not exist yet. Apply the Phase 10.5 migration, then
          reload.
        </p>
      )}
      {row && (
        <SettingsEditor
          initialValues={rowToFormValues(row)}
          initialVersion={row.updated_at}
          limits={SETTINGS_LIMITS}
        />
      )}
    </div>
  );
}
