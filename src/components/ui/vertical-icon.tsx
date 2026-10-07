import { Music, Palette, Settings, Sparkles, Trophy, type LucideProps } from "lucide-react";
import type { VerticalInfo } from "@/data/verticals";

const icons = { Settings, Palette, Trophy, Music, Sparkles } as const;

/** Vertical icon (docs/design-system/verticals.md). Decorative unless a label is passed. */
export function VerticalIcon({
  name,
  ...props
}: { name: VerticalInfo["icon"] | "Sparkles" } & LucideProps) {
  const Icon = icons[name];
  return <Icon aria-hidden strokeWidth={1.5} {...props} />;
}
