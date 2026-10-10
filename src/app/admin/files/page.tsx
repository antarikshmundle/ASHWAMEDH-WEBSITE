import type { Metadata } from "next";
import Link from "next/link";
import { CleanupControl } from "@/components/admin/cleanup-control";
import { CmsUnavailable } from "@/components/admin/cms-notices";
import { requireAdmin } from "@/lib/admin/auth";
import { loadCleanupInputs, planCleanup, type CleanupPlan } from "@/lib/cms/cleanup";
import { cmsAdminClient } from "@/lib/cms/server";
import { formatIst } from "@/lib/format-ist";

export const metadata: Metadata = { title: "Files" };

const SHOWN = 50;

/**
 * Files (Phase 10.4.6): a dry run of the media cleanup, and the button that applies it. Event
 * images and guidelines PDFs themselves are managed in each event's editor.
 */
export default async function FilesPage() {
  await requireAdmin();
  let plan: CleanupPlan | undefined;
  try {
    const { client } = cmsAdminClient();
    plan = planCleanup(await loadCleanupInputs(client));
  } catch (error) {
    console.error(`[cms] cleanup dry run failed: ${(error as Error).message}`);
  }

  const items = plan
    ? [
        ...plan.files.map((f) => ({
          key: `f-${f.id}`,
          what: "Unused file",
          path: `${f.bucket}/${f.path}`,
          when: `unused since ${formatIst(f.unusedSince)}`,
        })),
        ...plan.orphans.map((o) => ({
          key: `o-${o.bucket}/${o.path}`,
          what: "Leftover object",
          path: `${o.bucket}/${o.path}`,
          when: `written ${formatIst(o.writtenAt)}`,
        })),
        ...plan.staging.map((o) => ({
          key: `s-${o.path}`,
          what: "Old upload",
          path: `${o.bucket}/${o.path}`,
          when: `written ${formatIst(o.writtenAt)}`,
        })),
      ]
    : [];

  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center type-meta text-fg-secondary hover:text-fg"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-2 type-h2 text-fg">Files</h1>
      <p className="mt-2 type-body-sm text-fg-secondary">
        Event images and guidelines PDFs are added, replaced and removed in each{" "}
        <Link href="/admin/events" className="underline underline-offset-4">
          event’s editor
        </Link>
        . A removed or replaced file is kept for 24 hours (so it can be restored) and is then
        deleted here.
      </p>

      {!plan && <CmsUnavailable />}
      {plan && (
        <section aria-labelledby="cleanup-title" className="mt-10">
          <h2 id="cleanup-title" className="type-title text-fg">
            Unused files
          </h2>
          <p className="mt-1 type-body-sm text-fg-muted">
            Checked {formatIst(plan.now)}. Never deleted: files an event uses, anything removed or
            uploaded within the last 24 hours, and anything an upload in progress needs. Kept now:{" "}
            {plan.kept.inUse} in use, {plan.kept.inGrace} within 24 hours, {plan.kept.activeUpload}{" "}
            with an upload in progress.
          </p>
          {items.length === 0 ? (
            <p className="mt-4 type-body-sm text-fg">Nothing to delete.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {items.slice(0, SHOWN).map((item) => (
                <li
                  key={item.key}
                  className="rounded-lg border border-line bg-surface px-4 py-2 type-body-sm"
                >
                  <span className="text-fg">{item.what}</span>
                  <span className="text-fg-muted">
                    {" · "}
                    <code className="break-all">{item.path}</code>
                    {" · "}
                    {item.when}
                  </span>
                </li>
              ))}
              {items.length > SHOWN && (
                <li className="type-body-sm text-fg-muted">…and {items.length - SHOWN} more.</li>
              )}
            </ul>
          )}
          <CleanupControl count={items.length} />
          <p className="mt-4 type-meta text-fg-muted">
            Deleting a file stops it being served from storage, but copies already cached by the
            Supabase CDN or the site’s image optimizer can remain reachable for a while. See the
            removal runbook in the CMS documentation.
          </p>
        </section>
      )}
    </div>
  );
}
