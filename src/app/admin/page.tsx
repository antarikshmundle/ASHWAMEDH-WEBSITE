import type { Metadata } from "next";
import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { PublishingNotice } from "@/components/admin/cms-notices";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata: Metadata = { title: "Dashboard" };

/** Content areas of the CMS (docs/architecture/admin-cms.md); `href` once a section is editable. */
const sections: readonly { name: string; href?: string }[] = [
  { name: "Events", href: "/admin/events" },
  { name: "Schedule", href: "/admin/settings#schedule" },
  { name: "Cultural Night", href: "/admin/settings#cultural-night" },
  { name: "Files", href: "/admin/files" },
  { name: "Gallery", href: "/admin/gallery" },
  { name: "Team", href: "/admin/team" },
  { name: "Festival Settings", href: "/admin/settings" },
  { name: "Contact / Footer", href: "/admin/settings#contact" },
  { name: "Settings" },
];

const tile =
  "flex min-h-14 items-center justify-between rounded-lg border border-line bg-surface px-4";

/** Admin dashboard (Phase 10.1, Events editor since 10.3). */
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
      <PublishingNotice />

      <h2 className="mt-10 type-title text-fg">Content sections</h2>
      <p className="mt-1 type-body-sm text-fg-muted">
        Events (with their images and guidelines PDFs), Files and the festival settings (schedule,
        Cultural Night, contact, social links, taglines), Gallery and Team can be managed now.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {sections.map(({ name, href }) => (
          <li key={name}>
            {href ? (
              <Link
                href={href}
                className={`${tile} hover:border-accent/55 focus-visible:border-accent/55`}
              >
                <span className="type-body text-fg">{name}</span>
                <span className="type-meta text-accent">Edit →</span>
              </Link>
            ) : (
              <div className={tile}>
                <span className="type-body text-fg">{name}</span>
                <span className="type-meta text-fg-muted">Not available yet</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
