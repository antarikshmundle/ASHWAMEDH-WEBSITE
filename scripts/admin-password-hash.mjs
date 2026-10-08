// Prints an ADMIN_PASSWORD_HASH value for the admin sign-in (Phase 10.1).
// Usage: npm run admin:hash            (prompts; input is not echoed)
//        printf '%s' "$PW" | npm run --silent admin:hash
// The password is read from stdin, never from arguments, so it stays out of shell history.
// Must match src/lib/admin/password.ts (format and parameters); a unit test checks this.
import { randomBytes, scrypt } from "node:crypto";
import { createInterface } from "node:readline";

const N = 32768;
const r = 8;
const p = 1;
const KEY_LENGTH = 64;
const MIN = 12;
const MAX = 256;

function readPassword() {
  if (!process.stdin.isTTY) {
    return new Promise((resolve) => {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => (data += chunk));
      process.stdin.on("end", () => resolve(data.replace(/\r?\n$/, "")));
    });
  }
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (text) => {
      if (text.includes("Admin password")) process.stdout.write(text);
    };
    rl.question("Admin password (min 12 characters): ", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const password = await readPassword();
if (password.length < MIN || password.length > MAX) {
  console.error(`Password must be ${MIN}–${MAX} characters.`);
  process.exit(1);
}

const salt = randomBytes(16);
const hash = await new Promise((resolve, reject) =>
  scrypt(
    password.normalize("NFKC"),
    salt,
    KEY_LENGTH,
    { N, r, p, maxmem: 256 * N * r },
    (err, key) => (err ? reject(err) : resolve(key)),
  ),
);
console.log(["scrypt", N, r, p, salt.toString("base64url"), hash.toString("base64url")].join(":"));
