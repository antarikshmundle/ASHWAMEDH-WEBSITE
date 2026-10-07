import Link from "next/link";
import { CollegeLockup } from "@/components/ui/college-lockup";
import { ContactList } from "@/components/ui/contact-list";
import { CopyPlaceholder } from "@/components/ui/copy-placeholder";
import { AshwamedhLogo } from "@/components/ui/logos";
import { SocialLinks } from "@/components/ui/social-links";
import { footerQuickLinks } from "@/data/navigation";
import { site } from "@/data/site";
import { verticals } from "@/data/verticals";

/** Footer (reference panel 09, docs/ux/navigation.md §14). Brand accent only. */
export function SiteFooter() {
  return (
    <footer data-vertical="brand" className="border-t border-line-subtle bg-base">
      <div className="container-site grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-8 lg:py-16">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <Link href="/" className="w-fit">
            <AshwamedhLogo width={180} alt="ASHWAMEDH 2026, home" />
          </Link>
          <p className="type-micro text-fg-muted">{site.festLine}</p>
          {/* OD-07: description copy area kept, reference text not used */}
          <CopyPlaceholder lines={2} className="max-w-64" />
          {/* OD-08: renders nothing until official handles exist */}
          <SocialLinks />
        </div>

        {/* Quick links + Events side by side on mobile */}
        <div className="grid grid-cols-2 gap-8 sm:col-span-1 lg:contents">
          <FooterColumn title="Quick Links">
            <FooterLinks items={footerQuickLinks} />
          </FooterColumn>
          <FooterColumn title="Events">
            <FooterLinks items={verticals.map((v) => ({ href: v.href, label: v.shortName }))} />
          </FooterColumn>
        </div>

        {/* Contact + college */}
        <div className="flex flex-col justify-between gap-8">
          <FooterColumn title="Contact">
            <ContactList variant="compact" />
          </FooterColumn>
          <CollegeLockup variant="footer" className="lg:justify-end" />
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 type-nav text-fg">{title}</h2>
      {children}
    </div>
  );
}

function FooterLinks({ items }: { items: readonly { href: string; label: string }[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex min-h-11 items-center type-body-sm text-fg-muted transition-colors hover:text-fg lg:min-h-8"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
