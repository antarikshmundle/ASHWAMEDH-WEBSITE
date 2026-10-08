import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { EventCard } from "@/components/cards/event-card";
import { VerticalCard } from "@/components/cards/vertical-card";
import { events } from "@/data/events";
import { verticals } from "@/data/verticals";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const SRC = join(process.cwd(), "src");
const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });

/** Interaction-state transforms: hover / press / focus movement, lift and scale. */
const STATE_TRANSFORM =
  /(?<prefix>(?:[\w-]+:)*)(?:hover|group-hover|active|focus-visible|group-focus-visible):-?(?:translate|scale|rotate)-/g;

describe("reduced motion (docs/design-system/motion.md, Phase 8.1)", () => {
  it("gates every hover/press/focus transform behind motion-safe", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      for (const match of readFileSync(file, "utf8").matchAll(STATE_TRANSFORM)) {
        if (!match.groups?.prefix?.includes("motion-safe:"))
          offenders.push(`${file.slice(SRC.length + 1)}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("does not run entrance animations at all under reduced motion", () => {
    const css = readFileSync(join(SRC, "styles", "globals.css"), "utf8");
    const utilities = [...css.matchAll(/@utility (enter-[\w-]+) \{([\s\S]*?)\n\}/g)];
    expect(utilities.map((u) => u[1])).toEqual(["enter-rise", "enter-fade", "enter-item"]);
    for (const [, name, body] of utilities)
      expect(body, name).toMatch(
        /@media \(prefers-reduced-motion: reduce\) \{\s*animation: none;\s*\}/,
      );
  });
});

describe("keyboard focus parity (Phase 8.2)", () => {
  const classOf = (markup: string) => markup.match(/^<a [^>]*class="([^"]+)"/)?.[1] ?? "";

  it("gives vertical cards the hover glow on keyboard focus, without the lift", () => {
    const cls = classOf(renderToString(<VerticalCard vertical={verticals[0]!} />));
    expect(cls).toContain("hover:glow-md");
    expect(cls).toContain("focus-visible:glow-md");
    expect(cls).not.toMatch(/focus-visible:-?translate/);
  });

  it("gives event cards the hover border and shadow on keyboard focus, without the lift", () => {
    const cls = classOf(renderToString(<EventCard event={events[0]!} />));
    expect(cls).toContain("focus-visible:border-accent/55");
    expect(cls).toContain("focus-visible:shadow-card");
    expect(cls).not.toMatch(/focus-visible:-?translate/);
  });
});
