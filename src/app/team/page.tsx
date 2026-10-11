import type { Metadata } from "next";
import { UsersRound } from "lucide-react";
import { ComingSoonPanel } from "@/components/sections/coming-soon-panel";
import { PageHeader } from "@/components/sections/page-header";
import { TeamList } from "@/components/sections/team-list";
import { loadPublishedTeam } from "@/lib/cms/collections";
import { placeholders } from "@/lib/display";

export const metadata: Metadata = {
  title: "Team",
  alternates: { canonical: "/team" },
};

/**
 * Organising committee (OD-09): Coming Soon until announced (Phase 10.6: CMS, published members
 * only). No placeholder people, no photos.
 */
export default async function TeamPage() {
  const groups = await loadPublishedTeam();
  return (
    <>
      <PageHeader title="Team" />
      <div className="container-site max-w-4xl pb-16 lg:pb-24">
        {groups.length > 0 ? (
          <TeamList groups={groups} />
        ) : (
          <ComingSoonPanel
            icon={<UsersRound aria-hidden strokeWidth={1.5} className="size-5 text-fg-muted" />}
          >
            {placeholders.team}
          </ComingSoonPanel>
        )}
      </div>
    </>
  );
}
