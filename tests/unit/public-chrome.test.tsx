import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PublicChrome } from "@/components/layout/public-chrome";

let segment: string | null = null;
vi.mock("next/navigation", () => ({ useSelectedLayoutSegment: () => segment }));

describe("public site chrome (Phase 10.1)", () => {
  const render = () =>
    renderToString(
      <PublicChrome>
        <nav>site header</nav>
      </PublicChrome>,
    );

  it("renders the public header/footer unchanged, with no extra markup", () => {
    for (const s of [null, "events", "technomedh", "/_not-found"]) {
      segment = s;
      expect(render(), String(s)).toBe("<nav>site header</nav>");
    }
  });

  it("hides them in the admin area", () => {
    segment = "admin";
    expect(render()).toBe("");
  });
});
