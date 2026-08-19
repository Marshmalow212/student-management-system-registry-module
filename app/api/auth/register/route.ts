// POST /api/auth/register
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { LogEvent } from "@/lib/auth/log-events";
import { hashPassword } from "@/lib/auth/password";
import { isStaffAccountRole, UserRole } from "@/lib/auth/roles";
import { requireRole } from "@/lib/auth-guards";
import {
  getClientInfo,
  jsonResponse,
  errorResponse,
  validationErrorResponse,
} from "@/lib/api-utils";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email"),
  name: z.string().trim().min(1, "Name is required").max(255, "Name too long"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password too long"),
  role: z
    .number()
    .int()
    .refine(
      isStaffAccountRole,
      "Invalid role: must be STAFF (1), REGISTRAR (2), or ADMIN (3)",
    ),
});

type RegisterRequest = z.infer<typeof registerSchema>;

interface RegisterResponse {
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
    const { error: authorizationError } = await requireRole([UserRole.ADMIN]);
    if (authorizationError) {
      return authorizationError;
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    const { ipAddress, userAgent } = await getClientInfo(request);

    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const { email, name, password, role } = parsed.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
      select: { id: true },
    });

    if (existingUser) {
      await prisma.userLog.create({
        data: {
          userId: null,
          eventType: LogEvent.REGISTER,
          ipAddress,
          userAgent,
          metadata: {
            email,
            reason: "email_exists",
          },
        },
      });
      return errorResponse(
        "Email already registered",
        409,
        undefined,
        "EMAIL_EXISTS",
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    // Log registration
    await prisma.userLog.create({
      data: {
        userId: newUser.id,
        eventType: LogEvent.REGISTER,
        ipAddress,
        userAgent,
        metadata: {
          email,
          role,
        },
      },
    });

    const response: RegisterResponse = {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
      message: "User registered successfully",
    };

    return jsonResponse(response, 201);
  } catch (error) {
    console.error("[POST /api/auth/register] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
