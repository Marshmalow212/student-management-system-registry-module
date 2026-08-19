import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LogEvent } from "@/lib/auth/log-events";
import { isOtpMatch, OTP_MAX_ATTEMPTS } from "@/lib/auth/otp";
import { UserRole } from "@/lib/auth/roles";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/session";
import {
  errorResponse,
  getClientInfo,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = schema.safeParse(await request.json());
    const { ipAddress, userAgent } = await getClientInfo(request);
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (!user || user.role !== UserRole.STUDENT)
      return errorResponse(
        "Invalid OTP request",
        400,
        undefined,
        "INVALID_OTP",
      );
    if (user.isVerified)
      return errorResponse(
        "Account is already verified",
        409,
        undefined,
        "ALREADY_VERIFIED",
      );
    if (user.otpAttempts >= OTP_MAX_ATTEMPTS)
      return errorResponse(
        "Too many OTP attempts",
        429,
        undefined,
        "OTP_ATTEMPTS_EXCEEDED",
      );
    if (
      !user.otpHash ||
      !user.otpExpiresAt ||
      user.otpExpiresAt.getTime() <= Date.now()
    )
      return errorResponse("OTP expired", 400, undefined, "OTP_EXPIRED");
    if (!isOtpMatch(parsed.data.otp, user.otpHash)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { otpAttempts: { increment: 1 } },
      });
      await prisma.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.OTP_FAILED,
          ipAddress,
          userAgent,
        },
      });
      return errorResponse("Invalid OTP", 400, undefined, "INVALID_OTP");
    }
    const verified = await prisma.$transaction(async (tx) => {
      const verified = await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          otpHash: null,
          otpExpiresAt: null,
          otpAttempts: 0,
          otpSentAt: null,
        },
        select: {
          id: true,
          email: true,
          name: true,
          studentId: true,
          role: true,
          isVerified: true,
        },
      });

      const userStudentLink = await prisma.student.update({
        where: { email: user.email, studentUid: verified.studentId as string },
        data: { userId: user.id },
      });

      if (!userStudentLink) {
        await prisma.userLog.create({
          data: {
            userId: user.id,
            eventType: LogEvent.STUDENT_LINK_FAILED,
            ipAddress,
            userAgent,
          },
        });
        throw new Error("STUDENT_LINK_FAILED");
      }

      await prisma.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.STUDENT_LINK_CREATED,
          ipAddress,
          userAgent,
        },
      });

      await prisma.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.OTP_VERIFIED,
          ipAddress,
          userAgent,
        },
      });

      return verified;
    });

    const cookieStore = await cookies();
    cookieStore.set({
      ...sessionCookieOptions(),
      name: SESSION_COOKIE_NAME,
      value: signSession(user.id),
    });
    return jsonResponse({
      user: {
        id: verified.id,
        email: verified.email,
        name: verified.name,
        studentId: verified.studentId,
        role: verified.role,
        isVerified: verified.isVerified,
      },
      message: "Account verified successfully",
    });
  } catch (error) {
    console.error("[POST /api/auth/student/verify] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
