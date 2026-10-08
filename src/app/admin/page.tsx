import type { Metadata } from "next";
import { logoutAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Dashboard" };

/** Content areas planned for the CMS (docs/architecture/admin-cms.md). None is editable yet. */
const sections = [
  "Events",
  "Schedule",
  "Cultural Night",
  "Files",
  "Gallery",
  "Team",
  "Festival Settings",
  "Contact / Footer",
  "Settings",
] as const;

/** Admin dashboard (Phase 10.1): authentication smoke test and the planned section list. */
export default async function AdminDashboardPage() {
  await requireAdmin();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="type-h2 text-fg">ASHWAMEDH Admin</h1>
        <form action={logoutAction}>
          <button
            type="submit"
            className="h-11 rounded-md border border-line-control px-5 type-button text-fg hover:border-accent/55"
          >
            Sign out
          </button>
        </form>
      </div>
      <p className="mt-2 type-body text-fg-secondary">Signed in as the festival administrator.</p>

      <h2 className="mt-10 type-title text-fg">Content sections</h2>
      <p className="mt-1 type-body-sm text-fg-muted">
        Editing arrives in the next Phase 10 milestones. The public site still reads its content
        from the repository.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {sections.map((name) => (
          <li
            key={name}
            className="flex min-h-14 items-center justify-between rounded-lg border border-line bg-surface px-4"
          >
            <span className="type-body text-fg">{name}</span>
            <span className="type-meta text-fg-muted">Not available yet</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
