import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LogEvent } from "@/lib/auth/log-events";
import { verifyPassword } from "@/lib/auth/password";
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
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = schema.safeParse(await request.json());
    const { ipAddress, userAgent } = await getClientInfo(request);
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    if (!user || user.role !== UserRole.STUDENT || !user.isActive)
      return errorResponse(
        "Invalid email or password",
        401,
        undefined,
        "INVALID_CREDENTIALS",
      );
    if (!user.isVerified)
      return errorResponse(
        "Account verification required",
        403,
        undefined,
        "ACCOUNT_UNVERIFIED",
      );
    if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
      await prisma.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.STUDENT_LOGIN_FAILURE,
          ipAddress,
          userAgent,
        },
      });
      return errorResponse(
        "Invalid email or password",
        401,
        undefined,
        "INVALID_CREDENTIALS",
      );
    }
    const cookieStore = await cookies();
    cookieStore.set({
      ...sessionCookieOptions(),
      name: SESSION_COOKIE_NAME,
      value: signSession(user.id),
    });
    await prisma.userLog.create({
      data: {
        userId: user.id,
        eventType: LogEvent.STUDENT_LOGIN_SUCCESS,
        ipAddress,
        userAgent,
      },
    });
    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        studentId: user.studentId,
        role: user.role,
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("[POST /api/auth/student/login] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
