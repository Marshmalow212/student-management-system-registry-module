import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LogEvent } from "@/lib/auth/log-events";
import { hashPassword } from "@/lib/auth/password";
import { createOtp, deliverStudentOtp } from "@/lib/auth/otp";
import { UserRole } from "@/lib/auth/roles";
import {
  getClientInfo,
  jsonResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api-utils";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  name: z.string().trim().min(1, "Name is required").max(255, "Name too long"),
  studentId: z
    .string()
    .trim()
    .min(1, "Student ID is required")
    .max(64, "Student ID too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = schema.safeParse(await request.json());
    const { ipAddress, userAgent } = await getClientInfo(request);
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const { email, name, studentId, password } = parsed.data;
    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    const existingStudent = await prisma.student.findUnique({
      where: { studentUid: studentId, email },
      select: { id: true },
    });

    console.log(`[POST /api/auth/student/register] existingEmail: ${existingEmail}, existingStudent: ${existingStudent}`,
    );
    if (existingEmail || !existingStudent) {
      await prisma.userLog.create({
        data: {
          userId: null,
          eventType: LogEvent.STUDENT_REGISTER,
          ipAddress,
          userAgent,
          metadata: {
            reason: existingEmail ? "email_exists" : "student_id_does_not_exist",
          },
        },
      });
      return errorResponse(
        existingEmail ? "Email or student ID already registered" : "Contact your registrar for valid Student ID ",
        409,
        undefined,
        "IDENTITY_EXISTS",
      );
    }

    const otp = createOtp();
    const user = await prisma.$transaction(async (tx) => {
      const user = await prisma.user.create({
        data: {
          email,
          name,
          studentId,
          passwordHash: await hashPassword(password),
          role: UserRole.STUDENT,
          isActive: true,
          isVerified: false,
          otpHash: otp.hash,
          otpExpiresAt: otp.expiresAt,
          otpAttempts: 0,
          otpSentAt: new Date(),
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
      await deliverStudentOtp(email, otp.code);
      await prisma.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.STUDENT_REGISTER,
          ipAddress,
          userAgent,
        },
      });
      await prisma.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.OTP_SENT,
          ipAddress,
          userAgent,
        },
      });

      return user;
    })

    return jsonResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          studentId: user.studentId,
          role: user.role,
          isVerified: user.isVerified,
        },
        message:
          "Registration created. Verify the OTP to activate the account.",
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/auth/student/register] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
