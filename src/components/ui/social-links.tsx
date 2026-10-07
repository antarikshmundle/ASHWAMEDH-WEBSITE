import { Globe } from "lucide-react";
import { socialLinks } from "@/data/festival";

/**
 * Official social handles (OD-08). Renders nothing until official links exist — never a
 * placeholder `#`. Buttons follow the reserved spec (docs/design-system/components.md):
 * 40 × 40 round, control border. Only https links are rendered.
 */
export function SocialLinks() {
  const links = socialLinks.filter((link) => link.href.startsWith("https://"));
  if (links.length === 0) return null;

  return (
    <ul aria-label="Social media" className="flex flex-wrap gap-3">
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            title={link.label}
            className="flex size-10 items-center justify-center rounded-full border border-line-control text-fg-secondary transition-colors hover:border-accent/55 hover:text-fg"
          >
            <Globe aria-hidden strokeWidth={1.5} className="size-[18px]" />
            <span className="sr-only">{link.label} (opens in new tab)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
