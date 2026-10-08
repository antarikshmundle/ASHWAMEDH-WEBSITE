import type { AdminConfig } from "./config";

/**
 * Stateless admin session token (Phase 10.1): `<payload>.<signature>`, both base64url, signed
 * with HMAC-SHA-256 (Web Crypto) using ADMIN_SESSION_SECRET. Used by the proxy and the server.
 *
 * - Expires after SESSION_TTL_SECONDS; the cookie carries the same max-age.
 * - `pv` binds the session to the current password hash: changing the password signs everyone
 *   out. Rotating ADMIN_SESSION_SECRET does the same.
 */
export const SESSION_COOKIE = "ashwamedh_admin_session";
export const SESSION_COOKIE_PATH = "/admin";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;
const MAX_TOKEN_LENGTH = 1024;

export interface AdminSession {
  sub: "admin";
  /** Issued at / expires at, in seconds since the epoch. */
  iat: number;
  exp: number;
  /** Credential fingerprint (see above). */
  pv: string;
}

const encoder = new TextEncoder();

function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sign(data: string, secret: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(data));
  return Buffer.from(signature).toString("base64url");
}

/** A short, secret-keyed fingerprint of the password hash (reveals nothing about the hash). */
export async function credentialFingerprint(config: AdminConfig): Promise<string> {
  return (await sign(`pv:${config.passwordHash}`, config.sessionSecret)).slice(0, 22);
}

export async function issueSessionToken(
  config: AdminConfig,
  now = Math.floor(Date.now() / 1000),
): Promise<string> {
  const session: AdminSession = {
    sub: "admin",
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    pv: await credentialFingerprint(config),
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${await sign(payload, config.sessionSecret)}`;
}

const B64URL = /^[A-Za-z0-9_-]+$/;

/** The session for a valid, unexpired token signed for the current credentials; otherwise `null`. */
export async function verifySessionToken(
  token: string | null | undefined,
  config: AdminConfig,
  now = Math.floor(Date.now() / 1000),
): Promise<AdminSession | null> {
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  if (!B64URL.test(payload) || !B64URL.test(signature)) return null;

  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(config.sessionSecret),
    Buffer.from(signature, "base64url"),
    encoder.encode(payload),
  );
  if (!valid) return null;

  let session: Partial<AdminSession>;
  try {
    session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  const { sub, iat, exp, pv } = session;
  if (sub !== "admin" || typeof iat !== "number" || typeof exp !== "number") return null;
  if (exp <= now || iat > now + 60 || exp - iat > SESSION_TTL_SECONDS) return null;
  if (pv !== (await credentialFingerprint(config))) return null;
  return { sub, iat, exp, pv };
}
