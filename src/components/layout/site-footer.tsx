import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { CopyPlaceholder } from "@/components/ui/copy-placeholder";
import { AshwamedhLogo, PceLogo } from "@/components/ui/logos";
import { contact } from "@/data/festival";
import { footerQuickLinks } from "@/data/navigation";
import { site } from "@/data/site";
import { verticals } from "@/data/verticals";
import { fact } from "@/lib/display";

/** Footer (reference panel 09, docs/ux/navigation.md §14). Brand accent only. */
export function SiteFooter() {
  const contactRows = [
    { icon: Phone, label: "Phone", value: contact.phone },
    { icon: MessageCircle, label: "WhatsApp", value: contact.whatsapp },
    { icon: Mail, label: "Email", value: contact.email },
  ];

  return (
    <footer data-vertical="brand" className="border-t border-line-subtle bg-base">
      <div className="container-site grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-8 lg:py-16">
        {/* Brand */}
        <div className="flex flex-col gap-4">
          <Link href="/" className="w-fit">
            <AshwamedhLogo width={180} alt="ASHWAMEDH 2026, home" />
          </Link>
          <p className="type-micro text-fg-muted">PCE&apos;s flagship annual fest</p>
          {/* OD-07: description copy area kept, reference text not used */}
          <CopyPlaceholder lines={2} className="max-w-64" />
          {/* OD-08: social icons hidden until official handles exist */}
        </div>

        {/* Quick links + Events side by side on mobile */}
        <div className="grid grid-cols-2 gap-8 sm:col-span-1 lg:contents">
          <FooterColumn title="Quick Links">
            {footerQuickLinks.map((item) => (
              <FooterLink key={item.href} href={item.href}>
                {item.label}
              </FooterLink>
            ))}
          </FooterColumn>
          <FooterColumn title="Events">
            {verticals.map((v) => (
              <FooterLink key={v.id} href={v.href}>
                {v.shortName}
              </FooterLink>
            ))}
          </FooterColumn>
        </div>

        {/* Contact + college */}
        <div className="flex flex-col justify-between gap-8">
          <FooterColumn title="Contact">
            {contactRows.map(({ icon: Icon, label, value }) => (
              <li
                key={label}
                className="flex min-h-8 items-center gap-3 type-body-sm text-fg-muted"
              >
                <Icon aria-hidden className="size-[18px] shrink-0" />
                <span className="sr-only">{label}: </span>
                {fact(value)}
              </li>
            ))}
          </FooterColumn>
          <div className="flex items-center gap-3 lg:justify-end">
            <PceLogo height={44} />
            <p className="type-micro leading-snug tracking-[0.08em] text-fg-secondary">
              Priyadarshini
              <br />
              College of Engg.
              <br />
              <span className="text-fg-muted">{site.city}</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 type-nav text-fg">{title}</h2>
      <ul className="flex flex-col gap-1">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-11 items-center type-body-sm text-fg-muted transition-colors hover:text-fg lg:min-h-8"
      >
        {children}
      </Link>
    </li>
  );
}
