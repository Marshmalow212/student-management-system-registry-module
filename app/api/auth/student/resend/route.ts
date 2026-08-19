import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LogEvent } from "@/lib/auth/log-events";
import { createOtp, deliverStudentOtp, OTP_RESEND_COOLDOWN_MS } from "@/lib/auth/otp";
import { UserRole } from "@/lib/auth/roles";
import { errorResponse, getClientInfo, jsonResponse, validationErrorResponse } from "@/lib/api-utils";

const schema = z.object({ email: z.string().trim().toLowerCase().email("Invalid email") });

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = schema.safeParse(await request.json());
    const { ipAddress, userAgent } = await getClientInfo(request);
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || user.role !== UserRole.STUDENT) return errorResponse("Student account not found", 404, undefined, "STUDENT_NOT_FOUND");
    if (user.isVerified) return errorResponse("Account is already verified", 409, undefined, "ALREADY_VERIFIED");
    if (user.otpSentAt && Date.now() - user.otpSentAt.getTime() < OTP_RESEND_COOLDOWN_MS) return errorResponse("Please wait before requesting another OTP", 429, undefined, "OTP_RATE_LIMITED");

    const otp = createOtp();
    await prisma.user.update({ where: { id: user.id }, data: { otpHash: otp.hash, otpExpiresAt: otp.expiresAt, otpAttempts: 0, otpSentAt: new Date() } });
    await deliverStudentOtp(user.email, otp.code);
    await prisma.userLog.create({ data: { userId: user.id, eventType: LogEvent.OTP_SENT, ipAddress, userAgent } });
    return jsonResponse({ message: "A new OTP was sent" });
  } catch (error) {
    console.error("[POST /api/auth/student/resend] Error:", error);
    return errorResponse("Internal server error", 500, undefined, "INTERNAL_ERROR");
  }
}