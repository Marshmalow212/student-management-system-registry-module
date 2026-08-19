// POST /api/auth/login
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LogEvent } from "@/lib/auth/log-events";
import { verifyPassword } from "@/lib/auth/password";
import {
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/session";
import { UserRole } from "@/lib/auth/roles";
import {
  getClientInfo,
  jsonResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api-utils";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

type LoginRequest = z.infer<typeof loginSchema>;

interface LoginResponse {
  user: {
    id: number;
    email: string;
    name: string;
    role: number;
  };
  message: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    const { ipAddress, userAgent } = await getClientInfo(request);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        isActive: true,
      },
    });

    // Invalid email or inactive user
    if (!user || !user.isActive) {
      await prisma.userLog.create({
        data: {
          userId: null,
          eventType: LogEvent.LOGIN_FAILURE,
          ipAddress,
          userAgent,
          metadata: {
            email,
            reason: user ? "inactive" : "unknown_user",
          },
        },
      });
      return errorResponse("Invalid email or password", 401, undefined, "INVALID_CREDENTIALS");
    }

    // Check if user is staff or higher
    if (user.role < UserRole.STAFF) {
      await prisma.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.LOGIN_FAILURE,
          ipAddress,
          userAgent,
          metadata: {
            email,
            reason: "insufficient_role",
          },
        },
      });
      return errorResponse(
        "Staff access required",
        403,
        undefined,
        "INSUFFICIENT_ROLE",
      );
    }

    // Verify password
    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      await prisma.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.LOGIN_FAILURE,
          ipAddress,
          userAgent,
          metadata: {
            email,
            reason: "bad_password",
          },
        },
      });
      return errorResponse("Invalid email or password", 401, undefined, "INVALID_CREDENTIALS");
    }

    // Create session
    const sessionToken = signSession(user.id);
    const cookieStore = await cookies();
    const options = sessionCookieOptions();

    cookieStore.set({
      ...options,
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
    });

    // Log successful login
    await prisma.userLog.create({
      data: {
        userId: user.id,
        eventType: LogEvent.LOGIN_SUCCESS,
        ipAddress,
        userAgent,
        metadata: { email },
      },
    });

    const response: LoginResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      message: "Login successful",
    };

    return jsonResponse(response, 200);
  } catch (error) {
    console.error("[POST /api/auth/login] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
