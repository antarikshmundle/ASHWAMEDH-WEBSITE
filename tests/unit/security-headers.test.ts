import { describe, expect, it } from "vitest";

/** Phase 10.7: baseline security headers on every route; no CSP or HSTS in this phase. */
describe("security headers", () => {
  it("sends nosniff, a referrer policy and anti-framing on every path", async () => {
    const { default: config, SECURITY_HEADERS } = await import("../../next.config");
    const rules = await config.headers!();
    expect(rules).toEqual([{ source: "/:path*", headers: SECURITY_HEADERS }]);
    const headers = Object.fromEntries(SECURITY_HEADERS.map((h) => [h.key, h.value]));
    expect(headers).toEqual({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Frame-Options": "DENY",
    });
    expect(Object.keys(headers)).not.toContain("Strict-Transport-Security");
    expect(Object.keys(headers)).not.toContain("Content-Security-Policy");
  });
});
