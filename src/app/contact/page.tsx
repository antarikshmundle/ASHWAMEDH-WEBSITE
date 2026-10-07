import type { Metadata } from "next";
import { ArrowLink } from "@/components/ui/button";
import { ContactList } from "@/components/ui/contact-list";
import { PageHeader } from "@/components/sections/page-header";

export const metadata: Metadata = {
  title: "Contact",
  alternates: { canonical: "/contact" },
};

/** Contact (docs/ux/page-structures.md): all details TBA; no contact form (no backend). */
export default function ContactPage() {
  return (
    <>
      <PageHeader title="Contact" />
      <div data-vertical="brand" className="container-site max-w-3xl pb-16 lg:pb-24">
        <ContactList variant="cards" />
        <div className="mt-8 flex justify-center">
          <ArrowLink href="/venue">Campus and venue information</ArrowLink>
        </div>
      </div>
    </>
  );
}
