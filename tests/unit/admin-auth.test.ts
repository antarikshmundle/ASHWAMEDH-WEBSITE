import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readAdminConfig, type AdminConfig } from "@/lib/admin/config";
import { hashPassword, parsePasswordHash, verifyPassword } from "@/lib/admin/password";
import {
  clearLoginFailures,
  clientKey,
  isLoginLocked,
  LOGIN_WINDOW_MS,
  recordLoginFailure,
  resetLoginThrottle,
} from "@/lib/admin/rate-limit";
import {
  issueSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  verifySessionToken,
} from "@/lib/admin/session";

/* ---------- Next.js request APIs, mocked for the Server Action tests ---------- */

const jar = new Map<string, { value: string; options: Record<string, unknown> }>();
let requestHeaders = new Headers();
let cookieReads = 0;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      cookieReads += 1;
      return jar.has(name) ? { name, value: jar.get(name)!.value } : undefined;
    },
    set: (name: string, value: string, options: Record<string, unknown>) =>
      jar.set(name, { value, options }),
  }),
  headers: async () => requestHeaders,
}));

class Redirect extends Error {
  constructor(public url: string) {
    super(`redirect ${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));

const PASSWORD = "correct horse battery staple";
const SECRET = "s".repeat(24) + "-test-session-secret-0123456789";
let HASH = "";
let config: AdminConfig;

beforeAll(async () => {
  HASH = await hashPassword(PASSWORD);
  config = { username: "admin", passwordHash: HASH, sessionSecret: SECRET };
});

function stubAdminEnv(overrides: Record<string, string> = {}) {
  vi.stubEnv("ADMIN_USERNAME", "admin");
  vi.stubEnv("ADMIN_PASSWORD_HASH", HASH);
  vi.stubEnv("ADMIN_SESSION_SECRET", SECRET);
  for (const [key, value] of Object.entries(overrides)) vi.stubEnv(key, value);
}

beforeEach(() => {
  jar.clear();
  requestHeaders = new Headers({ "x-forwarded-for": "203.0.113.7" });
  resetLoginThrottle();
});
afterEach(() => vi.unstubAllEnvs());

const caught = async (fn: () => Promise<unknown>) => {
  try {
    await fn();
  } catch (error) {
    if (error instanceof Redirect) return error.url;
    throw error;
  }
  return null;
};

/* ---------- Password hashing ---------- */

describe("admin password hashing", () => {
  it("verifies the right password and rejects others", async () => {
    expect(HASH).toMatch(/^scrypt:32768:8:1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
    expect(await verifyPassword(PASSWORD, HASH)).toBe(true);
    expect(await verifyPassword("correct horse battery stapl", HASH)).toBe(false);
    expect(await verifyPassword("", HASH)).toBe(false);
  });

  it("uses a fresh salt for every hash", async () => {
    expect(await hashPassword(PASSWORD)).not.toBe(HASH);
  });

  it("refuses short passwords and malformed or weak hashes", async () => {
    await expect(hashPassword("short")).rejects.toThrow(/12/);
    for (const bad of [
      "",
      "plaintext-password",
      HASH.replace("scrypt", "md5"),
      HASH.replace(":32768:", ":1024:"),
      HASH.replace(":32768:", ":30000:"),
      HASH.split(":").slice(0, 5).join(":"),
      `${HASH}:extra`,
    ]) {
      expect(parsePasswordHash(bad), bad).toBeNull();
      expect(await verifyPassword(PASSWORD, bad)).toBe(false);
    }
  });

  it("matches hashes made by `npm run admin:hash`", async () => {
    const out = execFileSync(process.execPath, ["scripts/admin-password-hash.mjs"], {
      input: PASSWORD,
      encoding: "utf8",
    }).trim();
    expect(await verifyPassword(PASSWORD, out)).toBe(true);
  });
});

/* ---------- Configuration ---------- */

describe("admin configuration", () => {
  it("is complete only with a username, a valid hash and a long secret", () => {
    const env = {
      ADMIN_USERNAME: "admin",
      ADMIN_PASSWORD_HASH: HASH,
      ADMIN_SESSION_SECRET: SECRET,
    };
    expect(readAdminConfig(env)).toEqual(config);
    expect(readAdminConfig({ ...env, ADMIN_USERNAME: " " })).toBeNull();
    expect(readAdminConfig({ ...env, ADMIN_PASSWORD_HASH: PASSWORD })).toBeNull();
    expect(readAdminConfig({ ...env, ADMIN_SESSION_SECRET: "too-short" })).toBeNull();
    expect(readAdminConfig({})).toBeNull();
  });
});

/* ---------- Session tokens ---------- */

describe("admin session tokens", () => {
  const now = 1_800_000_000;

  it("round-trips and expires after the session lifetime", async () => {
    const token = await issueSessionToken(config, now);
    expect(await verifySessionToken(token, config, now)).toMatchObject({ sub: "admin", iat: now });
    expect(await verifySessionToken(token, config, now + SESSION_TTL_SECONDS - 1)).not.toBeNull();
    expect(await verifySessionToken(token, config, now + SESSION_TTL_SECONDS)).toBeNull();
  });

  it("rejects tampered, foreign, future-dated and malformed tokens", async () => {
    const token = await issueSessionToken(config, now);
    const [payload, signature] = token.split(".") as [string, string];
    const forged = Buffer.from(
      JSON.stringify({ sub: "admin", iat: now, exp: now + 10 * SESSION_TTL_SECONDS, pv: "x" }),
    ).toString("base64url");
    for (const bad of [
      `${forged}.${signature}`,
      `${payload}.${signature.slice(0, -2)}AA`,
      `${payload}`,
      `${payload}.${signature}.x`,
      "",
      "a".repeat(5000),
    ])
      expect(await verifySessionToken(bad, config, now), bad.slice(0, 20)).toBeNull();
    expect(
      await verifySessionToken(token, { ...config, sessionSecret: SECRET + "x" }, now),
    ).toBeNull();
    expect(
      await verifySessionToken(await issueSessionToken(config, now + 600), config, now),
    ).toBeNull();
  });

  it("signs everyone out when the password changes", async () => {
    const token = await issueSessionToken(config, now);
    const changed = { ...config, passwordHash: await hashPassword("a brand new password!") };
    expect(await verifySessionToken(token, changed, now)).toBeNull();
  });
});

/* ---------- Throttling ---------- */

describe("sign-in throttle", () => {
  it("locks a client after 5 failures for 15 minutes", () => {
    const t = 1_000_000;
    for (let i = 0; i < 4; i++) recordLoginFailure("a", t);
    expect(isLoginLocked("a", t)).toBe(false);
    recordLoginFailure("a", t);
    expect(isLoginLocked("a", t)).toBe(true);
    expect(isLoginLocked("b", t)).toBe(false);
    expect(isLoginLocked("a", t + LOGIN_WINDOW_MS + 1)).toBe(false);
  });

  it("clears on success and locks globally against spoofed addresses", () => {
    for (let i = 0; i < 4; i++) recordLoginFailure("a");
    clearLoginFailures("a");
    recordLoginFailure("a");
    expect(isLoginLocked("a")).toBe(false);
    for (let i = 0; i < 50; i++) recordLoginFailure(`spoof-${i}`);
    expect(isLoginLocked("someone-new")).toBe(true);
  });

  it("keys clients by the platform address header", () => {
    expect(clientKey(new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe(
      "1.1.1.1",
    );
    expect(clientKey(new Headers({ "x-forwarded-for": "2.2.2.2, 10.0.0.1" }))).toBe("2.2.2.2");
    expect(clientKey(new Headers())).toBe("unknown");
  });
});

/* ---------- Server Actions ---------- */

const form = (username: string, password: string) => {
  const data = new FormData();
  data.set("username", username);
  data.set("password", password);
  return data;
};

describe("login and logout actions", () => {
  it("signs in with the right credentials and sets a hardened session cookie", async () => {
    stubAdminEnv();
    const { loginAction } = await import("@/app/admin/actions");
    expect(await caught(() => loginAction(form("admin", PASSWORD)))).toBe("/admin");
    const cookie = jar.get(SESSION_COOKIE);
    expect(cookie?.options).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      path: "/admin",
      maxAge: SESSION_TTL_SECONDS,
    });
    expect(await verifySessionToken(cookie?.value, config)).not.toBeNull();
  });

  it("rejects wrong credentials without setting a cookie", async () => {
    stubAdminEnv();
    const { loginAction } = await import("@/app/admin/actions");
    expect(await caught(() => loginAction(form("admin", "wrong password here")))).toBe(
      "/admin/login?error=invalid",
    );
    expect(await caught(() => loginAction(form("Admin", PASSWORD)))).toBe(
      "/admin/login?error=invalid",
    );
    expect(jar.has(SESSION_COOKIE)).toBe(false);
  });

  it("locks the client after repeated failures, even for the right password", async () => {
    stubAdminEnv();
    const { loginAction } = await import("@/app/admin/actions");
    for (let i = 0; i < 4; i++) await caught(() => loginAction(form("admin", "nope nope nope")));
    expect(await caught(() => loginAction(form("admin", "nope nope nope")))).toBe(
      "/admin/login?error=locked",
    );
    expect(await caught(() => loginAction(form("admin", PASSWORD)))).toBe(
      "/admin/login?error=locked",
    );
    expect(jar.has(SESSION_COOKIE)).toBe(false);
  });

  it("refuses to sign in when the server is not configured", async () => {
    stubAdminEnv({ ADMIN_SESSION_SECRET: "" });
    const { loginAction } = await import("@/app/admin/actions");
    expect(await caught(() => loginAction(form("admin", PASSWORD)))).toBe(
      "/admin/login?error=config",
    );
    expect(jar.has(SESSION_COOKIE)).toBe(false);
  });

  it("signs out by expiring the cookie on the same path", async () => {
    stubAdminEnv();
    const { logoutAction } = await import("@/app/admin/actions");
    jar.set(SESSION_COOKIE, { value: await issueSessionToken(config), options: {} });
    expect(await caught(() => logoutAction())).toBe("/admin/login?signedOut=1");
    expect(jar.get(SESSION_COOKIE)).toMatchObject({
      value: "",
      options: { maxAge: 0, path: "/admin" },
    });
  });

  it("requireAdmin() redirects without a valid session and passes with one", async () => {
    stubAdminEnv();
    const { requireAdmin } = await import("@/lib/admin/auth");
    expect(await caught(() => requireAdmin())).toBe("/admin/login");
    jar.set(SESSION_COOKIE, { value: "forged.token", options: {} });
    expect(await caught(() => requireAdmin())).toBe("/admin/login");
    jar.set(SESSION_COOKIE, { value: await issueSessionToken(config), options: {} });
    expect(await requireAdmin()).toMatchObject({ sub: "admin" });
  });

  it("reads the session cookie even without configuration (keeps admin pages request-time)", async () => {
    const { getAdminSession } = await import("@/lib/admin/auth");
    cookieReads = 0;
    expect(await getAdminSession()).toBeNull();
    expect(cookieReads).toBe(1);
  });
});

/* ---------- Proxy ---------- */

describe("admin proxy (optimistic check)", () => {
  async function run(path: string, token?: string) {
    const { NextRequest } = await import("next/server");
    const { proxy, config: proxyConfig } = await import("@/proxy");
    const request = new NextRequest(`http://localhost:3000${path}`, {
      headers: token ? { cookie: `${SESSION_COOKIE}=${token}` } : {},
    });
    return { response: await proxy(request), matcher: proxyConfig.matcher };
  }

  it("only runs on admin routes", async () => {
    const { matcher } = await run("/admin");
    expect(matcher).toEqual(["/admin", "/admin/:path*"]);
  });

  it("sends signed-out visitors to the sign-in page, marked noindex and no-store", async () => {
    stubAdminEnv();
    for (const path of ["/admin", "/admin/events"]) {
      const { response } = await run(path);
      expect(response.status, path).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost:3000/admin/login");
      expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect((await run("/admin/login")).response.headers.get("location")).toBeNull();
    expect((await run("/admin", "forged.token")).response.status).toBe(307);
  });

  it("lets a valid session through and skips the sign-in page", async () => {
    stubAdminEnv();
    const token = await issueSessionToken(config);
    expect((await run("/admin", token)).response.headers.get("location")).toBeNull();
    expect((await run("/admin/login", token)).response.headers.get("location")).toBe(
      "http://localhost:3000/admin",
    );
  });

  it("treats every request as signed out when the server is not configured", async () => {
    const token = await issueSessionToken(config);
    expect((await run("/admin", token)).response.status).toBe(307);
  });
});

/* ---------- Secret safety ---------- */

describe("admin secret safety", () => {
  const SRC = join(process.cwd(), "src");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : [];
    });

  it("keeps admin code and secrets out of client components", () => {
    for (const file of files(SRC)) {
      const text = readFileSync(file, "utf8");
      if (/^["']use client["']/.test(text))
        expect(text, file).not.toMatch(/@\/lib\/admin|ADMIN_|SESSION_SECRET/);
    }
  });

  it("never exposes admin settings as public env variables", () => {
    for (const file of files(SRC))
      expect(readFileSync(file, "utf8"), file).not.toMatch(/NEXT_PUBLIC_ADMIN/);
    expect(readFileSync(join(SRC, "lib", "admin", "auth.ts"), "utf8")).toMatch(
      /^import "server-only";/,
    );
  });
});
