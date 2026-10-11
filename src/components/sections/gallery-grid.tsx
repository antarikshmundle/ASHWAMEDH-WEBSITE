import Image from "next/image";
import type { PublicGalleryItem } from "@/lib/cms/collections";
import { galleryImageSrc } from "@/lib/media";

/**
 * Published gallery images (Phase 10.6, approved layout): 3 / 2 / 1 columns, rounded tiles,
 * caption below, no lightbox. Only exact Storage gallery URLs are rendered (src/lib/media.ts).
 * The caption is visible; alt text is the official description when given, otherwise "".
 */
export function GalleryGrid({ items }: { items: PublicGalleryItem[] }) {
  const shown = items.flatMap((item) => {
    const src = galleryImageSrc(item.src);
    return src ? [{ ...item, src }] : [];
  });
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-5 lg:grid-cols-3">
      {shown.map((item) => (
        <li key={item.id}>
          <figure className="overflow-hidden rounded-xl border border-line bg-surface">
            <div className="relative aspect-[4/3] bg-surface-2">
              <Image
                src={item.src}
                alt={item.alt}
                fill
                sizes="(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="px-4 py-3 type-body-sm text-fg-secondary">
              {item.caption}
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
