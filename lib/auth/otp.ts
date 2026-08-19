import { createHmac, randomInt } from "node:crypto";
import { prisma } from "../prisma";
import { LogEvent } from "./log-events";

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

function getOtpSecret(): string {
  return process.env.OTP_HASH_SECRET ?? "dev-only-otp-secret-change-me";
}

export function generateOtp(): string {
  return randomInt(100000, 1000000).toString();
}

export function hashOtp(otp: string): string {
  return createHmac("sha256", getOtpSecret()).update(otp).digest("hex");
}

export function createOtp(): { code: string; hash: string; expiresAt: Date } {
  const code = generateOtp();
  return {
    code,
    hash: hashOtp(code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  };
}

export function isOtpMatch(otp: string, expectedHash: string): boolean {
  return hashOtp(otp) === expectedHash;
}

export async function deliverStudentOtp(
  email: string,
  code: string,
): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("No production OTP delivery provider is configured");
  }
  console.info(`[student-otp development delivery] ${email}: ${code}`);

  await prisma.userLog.create({
    data: {
      eventType: LogEvent.OTP_SENT,
      userId: (await prisma.user.findUnique({ where: { email } }))?.id ?? 0,
      ipAddress: "127.0.0.1",
      userAgent: "development",
      metadata: { email, otp: code },
    },
  });
}