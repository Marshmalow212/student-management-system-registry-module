// Password hashing built on Node's `crypto.scrypt` — no extra dependency.
// Stored format: `scrypt$<saltHex>$<keyHex>` with fixed parameters tuned
// for an interactive login flow on commodity hardware.

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

const KEY_LEN = 64;
const SALT_LEN = 16;
// OWASP 2023 minimum for interactive logins; bump `p` first if you need more
// resistance to GPU attacks without slowing the CPU too much.
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;

const PREFIX = "scrypt";

export async function hashPassword(plain: string): Promise<string> {
  if (typeof plain !== "string" || plain.length === 0) {
    throw new Error("hashPassword: password must be a non-empty string");
  }
  const salt = randomBytes(SALT_LEN);
  const key = await scryptAsync(plain, salt, KEY_LEN, SCRYPT_PARAMS);
  return `${PREFIX}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(
  plain: string,
  stored: string,
): Promise<boolean> {
  if (typeof plain !== "string" || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== PREFIX) return false;
  const [, saltHex, keyHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  if (salt.length !== SALT_LEN || expected.length !== KEY_LEN) return false;
  const actual = await scryptAsync(plain, salt, KEY_LEN, SCRYPT_PARAMS);
  // timingSafeEqual throws if lengths differ — guard explicitly.
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
