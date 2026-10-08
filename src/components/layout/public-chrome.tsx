"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Renders the public site chrome (header / footer) everywhere except the admin area
 * (Phase 10.1). Adds no markup of its own, so public pages render exactly as before.
 */
export function PublicChrome({ children }: { children: ReactNode }) {
  return useSelectedLayoutSegment() === "admin" ? null : children;
}
