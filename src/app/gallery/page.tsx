import type { Metadata } from "next";
import { ImageOff } from "lucide-react";
import { ComingSoonPanel } from "@/components/sections/coming-soon-panel";
import { GalleryGrid } from "@/components/sections/gallery-grid";
import { PageHeader } from "@/components/sections/page-header";
import { loadPublishedGallery } from "@/lib/cms/collections";
import { placeholders } from "@/lib/display";

export const metadata: Metadata = {
  title: "Gallery",
  alternates: { canonical: "/gallery" },
};

/**
 * Gallery (OD-09): Coming Soon until official imagery is published (Phase 10.6: CMS, published
 * items only). No stock or reference photos (D5).
 */
export default async function GalleryPage() {
  const items = await loadPublishedGallery();
  return (
    <>
      <PageHeader title="Gallery" />
      <div className="container-site max-w-4xl pb-16 lg:pb-24">
        {items.length > 0 ? (
          <GalleryGrid items={items} />
        ) : (
          <ComingSoonPanel
            icon={<ImageOff aria-hidden strokeWidth={1.5} className="size-5 text-fg-muted" />}
          >
            {placeholders.gallery}
          </ComingSoonPanel>
        )}
      </div>
    </>
  );
}
