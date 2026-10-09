import { contentSourceMode } from "@/lib/cms/config";

export { formatIst as formatSavedAt } from "@/lib/format-ist";

/**
 * Admin notices (Phase 10.3). Server components — they read server configuration only.
 */

/** Shown while the public site reads repository content: saves do not reach the public site. */
export function PublishingNotice() {
  let mode: string;
  try {
    mode = contentSourceMode();
  } catch {
    mode = "invalid";
  }
  if (mode === "database") return null;
  return (
    <p
      role="note"
      className="mt-6 rounded-md border border-line-strong bg-surface-2 px-4 py-3 type-body-sm text-fg"
    >
      The public site is reading content from the repository (<code>CMS_CONTENT_SOURCE</code> is not{" "}
      <code>database</code>). Changes saved here are kept in the CMS database but will not appear on
      the public site until it reads from the database.
    </p>
  );
}

/** Shown when the CMS database cannot be reached or is not configured. */
export function CmsUnavailable({ detail }: { detail?: string }) {
  return (
    <div
      role="alert"
      className="mt-6 rounded-md border border-line-strong bg-surface-2 px-4 py-3 type-body-sm text-fg"
    >
      <p>The CMS database is not available, so content cannot be loaded or saved right now.</p>
      {detail && <p className="mt-1 text-fg-muted">{detail}</p>}
    </div>
  );
}
