import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Admin password hashing (Phase 10.1). Only the hash is ever configured — never the password.
 *
 * Format: `scrypt:<N>:<r>:<p>:<salt>:<hash>` (salt and hash base64url). Colons, not "$", because
 * Next.js expands "$NAME" inside .env files. Generate one with `npm run admin:hash`.
 */
export const SCRYPT_PARAMS = { N: 32768, r: 8, p: 1, keyLength: 64, saltLength: 16 } as const;
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 256;

export interface PasswordHash {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

function derive(
  password: string,
  salt: Buffer,
  keyLength: number,
  N: number,
  r: number,
  p: number,
) {
  const options: ScryptOptions = { N, r, p, maxmem: 256 * N * r };
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, keyLength, options, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

const B64URL = /^[A-Za-z0-9_-]+$/;
const int = (value: string | undefined) => (value && /^\d{1,7}$/.test(value) ? Number(value) : NaN);

/** The parsed hash, or `null` when the string is not a well-formed, sensibly-parameterised hash. */
export function parsePasswordHash(stored: string | null | undefined): PasswordHash | null {
  const parts = stored?.trim().split(":") ?? [];
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const [N, r, p] = [int(parts[1]), int(parts[2]), int(parts[3])];
  const [saltText, hashText] = [parts[4] ?? "", parts[5] ?? ""];
  const powerOfTwo = Number.isInteger(Math.log2(N));
  if (!powerOfTwo || N < 2 ** 14 || N > 2 ** 20 || !(r >= 1 && r <= 32) || !(p >= 1 && p <= 16))
    return null;
  if (!B64URL.test(saltText) || !B64URL.test(hashText)) return null;
  const salt = Buffer.from(saltText, "base64url");
  const hash = Buffer.from(hashText, "base64url");
  if (salt.length < 16 || hash.length < 32 || hash.length > 128) return null;
  return { N, r, p, salt, hash };
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(
      `Admin password must be ${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters.`,
    );
  }
  const { N, r, p, keyLength, saltLength } = SCRYPT_PARAMS;
  const salt = randomBytes(saltLength);
  const hash = await derive(password, salt, keyLength, N, r, p);
  return ["scrypt", N, r, p, salt.toString("base64url"), hash.toString("base64url")].join(":");
}

/** Constant-time check of a password against a stored hash. Malformed hashes never match. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parsePasswordHash(stored);
  if (!parsed || password.length > MAX_PASSWORD_LENGTH) return false;
  const actual = await derive(
    password,
    parsed.salt,
    parsed.hash.length,
    parsed.N,
    parsed.r,
    parsed.p,
  );
  return timingSafeEqual(actual, parsed.hash);
}
