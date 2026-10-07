import type { Metadata } from "next";
import { UsersRound } from "lucide-react";
import { ComingSoonPanel } from "@/components/sections/coming-soon-panel";
import { PageHeader } from "@/components/sections/page-header";
import { placeholders } from "@/lib/display";

export const metadata: Metadata = {
  title: "Team",
  alternates: { canonical: "/team" },
};

/** Organising committee (OD-09): Coming Soon until announced. No placeholder people. */
export default function TeamPage() {
  return (
    <>
      <PageHeader title="Team" />
      <div className="container-site max-w-4xl pb-16 lg:pb-24">
        <ComingSoonPanel
          icon={<UsersRound aria-hidden strokeWidth={1.5} className="size-5 text-fg-muted" />}
        >
          {placeholders.team}
        </ComingSoonPanel>
      </div>
    </>
  );
}
