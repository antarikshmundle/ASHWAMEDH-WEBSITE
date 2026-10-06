import { describe, expect, it } from "vitest";
import { resolveSiteUrl } from "@/lib/site-url";

describe("resolveSiteUrl", () => {
  it("falls back to localhost when unset or blank", () => {
    expect(resolveSiteUrl(undefined)).toBe("http://localhost:3000");
    expect(resolveSiteUrl("   ")).toBe("http://localhost:3000");
  });

  it("strips trailing slashes", () => {
    expect(resolveSiteUrl("https://example.org/")).toBe("https://example.org");
    expect(resolveSiteUrl("https://example.org/fest//")).toBe("https://example.org/fest");
  });

  it("rejects invalid or non-http values", () => {
    expect(resolveSiteUrl("not a url")).toBe("http://localhost:3000");
    expect(resolveSiteUrl("ftp://example.org")).toBe("http://localhost:3000");
  });
});
