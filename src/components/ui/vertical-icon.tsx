import { Music, Palette, Settings, Sparkles, Trophy, type LucideProps } from "lucide-react";
import type { VerticalInfo } from "@/data/verticals";

/** Lucide component per vertical icon name (docs/design-system/verticals.md). */
export const verticalIcons = { Settings, Palette, Trophy, Music, Sparkles } as const;

/** Vertical icon. Decorative unless a label is passed. */
export function VerticalIcon({
  name,
  ...props
}: { name: VerticalInfo["icon"] | "Sparkles" } & LucideProps) {
  const Icon = verticalIcons[name];
  return <Icon aria-hidden strokeWidth={1.5} {...props} />;
}
