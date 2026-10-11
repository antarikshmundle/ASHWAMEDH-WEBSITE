import type { Metadata } from "next";
import Link from "next/link";
import { CmsUnavailable, PublishingNotice } from "@/components/admin/cms-notices";
import { TeamManager } from "@/components/admin/team-manager";
import { requireAdmin } from "@/lib/admin/auth";
import { listTeamForAdmin, type AdminTeamMember } from "@/lib/cms/collections";

export const metadata: Metadata = { title: "Team" };

/** Team (Phase 10.6): organising committee — names, roles, groups; draft / published, ordered. */
export default async function AdminTeamPage() {
  await requireAdmin();
  let members: AdminTeamMember[] | null | undefined;
  try {
    members = await listTeamForAdmin();
  } catch (error) {
    console.error(`[cms] loading the team failed: ${(error as Error).message}`);
  }
  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center type-meta text-fg-secondary hover:text-fg"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-2 type-h2 text-fg">Team</h1>
      <p className="mt-2 type-body-sm text-fg-secondary">
        The officially announced organising committee: names and roles only. No photos and no
        personal phone numbers or email addresses.
      </p>
      <PublishingNotice />
      {members === undefined && <CmsUnavailable />}
      {members === null && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-accent bg-surface-2 px-4 py-3 type-body-sm text-fg"
        >
          The team is not set up in the database yet. Apply the Phase 10.6 migration, then reload.
        </p>
      )}
      {members && (
        <TeamManager
          members={members.map((m) => ({
            id: m.id,
            version: m.updated_at,
            name: m.name,
            role: m.role,
            groupLabel: m.group_label,
            status: m.status === "published" ? "published" : "draft",
            sourceKind: m.source_kind,
            sourceReference: m.source_reference,
            sourceDate: m.source_date,
          }))}
        />
      )}
    </div>
  );
}
