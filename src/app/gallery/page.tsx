import type { Metadata } from "next";
import { ImageOff } from "lucide-react";
import { ComingSoonPanel } from "@/components/sections/coming-soon-panel";
import { PageHeader } from "@/components/sections/page-header";
import { placeholders } from "@/lib/display";

export const metadata: Metadata = {
  title: "Gallery",
  alternates: { canonical: "/gallery" },
};

/** Gallery (OD-09): Coming Soon until official imagery exists. No stock or reference photos (D5). */
export default function GalleryPage() {
  return (
    <>
      <PageHeader title="Gallery" />
      <div className="container-site max-w-4xl pb-16 lg:pb-24">
        <ComingSoonPanel
          icon={<ImageOff aria-hidden strokeWidth={1.5} className="size-5 text-fg-muted" />}
        >
          {placeholders.gallery}
        </ComingSoonPanel>
      </div>
    </>
  );
}
