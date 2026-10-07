"use client";

import { useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};
const readHash = () => window.location.hash.slice(1);
const serverHash = () => "";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Accessible tabs (WAI-ARIA tabs pattern, manual activation by click / automatic by arrow keys).
 * Deep-linkable via URL hash, e.g. /events/hackathon#rules (docs/ux/event-discovery.md §7).
 */
export function Tabs({ tabs, label }: { tabs: readonly TabItem[]; label: string }) {
  // The URL hash is the external source of truth for deep links; a click overrides it.
  const hash = useSyncExternalStore(subscribeToHash, readHash, serverHash);
  const [picked, setPicked] = useState<string | null>(null);
  const fromHash = tabs.some((t) => t.id === hash) ? hash : null;
  const active = picked ?? fromHash ?? tabs[0]?.id ?? "";
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const select = (id: string, focus = false) => {
    setPicked(id);
    window.history.replaceState(null, "", `#${id}`);
    if (focus) tabRefs.current[id]?.focus();
    tabRefs.current[id]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.id === active);
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % tabs.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    const target = tabs[next];
    if (target) select(target.id, true);
  };

  return (
    <div>
      <div className="relative">
        <div
          role="tablist"
          aria-label={label}
          onKeyDown={onKeyDown}
          className="flex [scrollbar-width:none] overflow-x-auto border-b border-line-strong [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const selected = tab.id === active;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(tab.id)}
                className={`relative h-12 shrink-0 rounded-t-md px-4 type-nav transition-colors duration-150 focus-visible:outline-offset-[-2px] ${
                  selected ? "text-fg" : "text-fg-muted hover:text-fg-secondary"
                }`}
              >
                {tab.label}
                <span
                  aria-hidden
                  className={`absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-accent transition-opacity duration-240 ${
                    selected ? "opacity-100" : "opacity-0"
                  }`}
                />
              </button>
            );
          })}
        </div>
        {/* Edge fade hints at horizontal scroll on narrow screens */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-base to-transparent md:hidden"
        />
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`panel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          className="max-w-[72ch] pt-6 focus-visible:rounded-md"
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
