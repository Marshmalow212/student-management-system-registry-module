// Stateless session cookie helpers. The cookie value is
// `<userId>.<expEpoch>.<hmacHex>` — signed with HMAC-SHA256 using
// `SESSION_SECRET`. We keep the cookie opaque; per-session revocation is a
// future enhancement (rotate `SESSION_SECRET` to invalidate everything).

import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "sms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is not set or is too short (need >= 16 chars). Add it to .env.",
    );
  }
  // Dev fallback only — never used in production. Stable so cookies survive
  // process restarts during local development.
  return "dev-only-session-secret-change-me-please-32";
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function signSession(userId: number): string {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const payload = `${userId}.${exp}`;
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function verifySession(cookieValue: string | undefined | null): number | null {
  if (!cookieValue || typeof cookieValue !== "string") return null;
  const parts = cookieValue.split(".");
  if (parts.length !== 3) return null;
  const [userIdStr, expStr, sig] = parts;
  const userId = Number.parseInt(userIdStr, 10);
  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(userId) || !Number.isFinite(exp)) return null;

  const expectedSig = sign(`${userId}.${exp}`);
  // timingSafeEqual throws on length mismatch — guard first.
  if (expectedSig.length !== sig.length) return null;
  if (!timingSafeEqual(Buffer.from(expectedSig, "hex"), Buffer.from(sig, "hex"))) {
    return null;
  }

  if (exp <= Math.floor(Date.now() / 1000)) return null;
  return userId;
}

export function sessionCookieOptions(): {
  name: string;
  maxAge: number;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
} {
  return {
    name: SESSION_COOKIE_NAME,
    maxAge: SESSION_TTL_SECONDS,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
