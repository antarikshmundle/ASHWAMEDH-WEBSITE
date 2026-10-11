import type { PublicTeamGroup } from "@/lib/cms/collections";

/**
 * Published organising committee (Phase 10.6, approved layout): a heading per group, then cards
 * with name and role. No photos and no personal contact details.
 */
export function TeamList({ groups }: { groups: PublicTeamGroup[] }) {
  return (
    <div className="flex flex-col gap-10">
      {groups.map((group, i) => (
        <section key={group.label} aria-labelledby={`team-group-${i}`}>
          <h2 id={`team-group-${i}`} className="type-title text-fg">
            {group.label}
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.members.map((member) => (
              <li key={member.id} className="rounded-xl border border-line bg-surface px-5 py-4">
                <p className="type-h3 text-fg normal-case">{member.name}</p>
                <p className="mt-1 type-meta text-fg-muted">{member.role}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
