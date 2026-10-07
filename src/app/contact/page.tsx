import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { ArrowLink } from "@/components/ui/button";
import { PageHeader } from "@/components/sections/page-header";
import { contact } from "@/data/festival";
import { fact } from "@/lib/display";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
};

/** Contact (docs/ux/page-structures.md): all details TBA; no contact form (no backend). */
export default function ContactPage() {
  const rows = [
    { icon: Phone, label: "Phone", value: contact.phone },
    { icon: MessageCircle, label: "WhatsApp", value: contact.whatsapp },
    { icon: Mail, label: "Email", value: contact.email },
  ];
  return (
    <>
      <PageHeader title="Contact" />
      <div data-vertical="brand" className="container-site max-w-3xl pb-16 lg:pb-24">
        <ul className="grid gap-3 sm:grid-cols-3">
          {rows.map(({ icon: Icon, label, value }) => (
            <li
              key={label}
              className="flex items-center gap-4 rounded-lg border border-line bg-surface p-5"
            >
              <span className="flex size-10 items-center justify-center rounded-sm bg-accent/12">
                <Icon aria-hidden strokeWidth={1.5} className="size-5 text-accent" />
              </span>
              <span className="flex flex-col">
                <span className="type-chip-value text-fg-muted">
                  <span className="sr-only">{label}: </span>
                  {fact(value)}
                </span>
                <span aria-hidden className="type-chip-label text-fg-muted">
                  {label}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex justify-center">
          <ArrowLink href="/venue">Campus and venue information</ArrowLink>
        </div>
      </div>
    </>
  );
}
