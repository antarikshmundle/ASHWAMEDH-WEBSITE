import type { Metadata } from "next";
import Link from "next/link";
import { CmsUnavailable, PublishingNotice } from "@/components/admin/cms-notices";
import { GalleryManager } from "@/components/admin/gallery-manager";
import { requireAdmin } from "@/lib/admin/auth";
import { listGalleryForAdmin, type AdminGalleryItem } from "@/lib/cms/collections";
import { FILE_RULES } from "@/lib/cms/upload-policy";

export const metadata: Metadata = { title: "Gallery" };

/** Gallery (Phase 10.6): official images with caption and source; draft / published, ordered. */
export default async function AdminGalleryPage() {
  await requireAdmin();
  let items: AdminGalleryItem[] | null | undefined;
  try {
    items = await listGalleryForAdmin();
  } catch (error) {
    console.error(`[cms] loading the gallery failed: ${(error as Error).message}`);
  }
  return (
    <div>
      <Link
        href="/admin"
        className="inline-flex min-h-11 items-center type-meta text-fg-secondary hover:text-fg"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-2 type-h2 text-fg">Gallery</h1>
      <p className="mt-2 type-body-sm text-fg-secondary">
        Official ASHWAMEDH photographs only — never stock images. Images from a previous edition
        need the edition / year in the caption and a verified source.
      </p>
      <PublishingNotice />
      {items === undefined && <CmsUnavailable />}
      {items === null && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-accent bg-surface-2 px-4 py-3 type-body-sm text-fg"
        >
          The gallery is not set up in the database yet. Apply the Phase 10.6 migration, then
          reload.
        </p>
      )}
      {items && (
        <GalleryManager
          maxBytes={FILE_RULES["gallery-image"].maxBytes}
          types={[...FILE_RULES["gallery-image"].types]}
          items={items.map((item) => ({
            id: item.id,
            version: item.updated_at,
            caption: item.caption,
            altText: item.file?.alt_text ?? "",
            status: item.status === "published" ? "published" : "draft",
            url: item.url,
            sourceKind: item.source_kind,
            sourceReference: item.source_reference,
            sourceDate: item.source_date,
          }))}
        />
      )}
    </div>
  );
}
