// Auth guards for API routes
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME, verifySession } from "@/lib/auth/session";
import {
  ASSESSMENT_MANAGEMENT_ROLES,
  REGISTRAR_MANAGEMENT_ROLES,
  UserRole,
  type UserRoleValue,
} from "@/lib/auth/roles";
import { errorResponse } from "@/lib/api-utils";

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: UserRoleValue;
  studentId: string | null;
  isActive: boolean;
  createdAt: Date;
}

export async function requireAuth(): Promise<{
  user: AuthenticatedUser | null;
  error?: Response;
}> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE_NAME);
  const userId = verifySession(cookie?.value);

  if (userId === null) {
    return {
      user: null,
      error: errorResponse("Unauthorized", 401, undefined, "UNAUTHORIZED"),
    };
  }

  const user: AuthenticatedUser = (await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      studentId: true,
      isActive: true,
      createdAt: true,
    },
  })) as AuthenticatedUser;

  if (!user || !user.isActive) {
    return {
      user: null,
      error: errorResponse("Unauthorized", 401, undefined, "UNAUTHORIZED"),
    };
  }

  return { user };
}

export async function requireStaff(
  minRole: UserRoleValue = UserRole.STAFF,
): Promise<{
  user: AuthenticatedUser | null;
  error?: Response;
}> {
  const { user, error } = await requireAuth();

  if (error || !user) {
    return { user: null, error };
  }

  if (user.role < minRole) {
    return {
      user: null,
      error: errorResponse(
        "Forbidden: insufficient permissions",
        403,
        undefined,
        "FORBIDDEN",
      ),
    };
  }

  return { user };
}

export async function requireRole(
  allowedRoles: readonly UserRoleValue[],
): Promise<{
  user: AuthenticatedUser | null;
  error?: Response;
}> {
  const { user, error } = await requireAuth();

  if (error || !user) {
    return { user: null, error };
  }

  if (user.role !== UserRole.ADMIN && !allowedRoles.includes(user.role)) {
    return {
      user: null,
      error: errorResponse(
        "Forbidden: insufficient permissions",
        403,
        undefined,
        "FORBIDDEN",
      ),
    };
  }

  return { user };
}

export function requireRegistrar() {
  return requireRole(REGISTRAR_MANAGEMENT_ROLES);
}

export function requireAssessmentStaff() {
  return requireRole(ASSESSMENT_MANAGEMENT_ROLES);
}

export async function requireStudent(): Promise<{
  user: AuthenticatedUser | null;
  error?: Response;
}> {
  const { user, error } = await requireAuth();

  if (error || !user) {
    return { user: null, error };
  }

  if (user.role !== UserRole.STUDENT) {
    return {
      user: null,
      error: errorResponse(
        "Forbidden: student access only",
        403,
        undefined,
        "FORBIDDEN",
      ),
    };
  }

  if (!user.studentId) {
    return {
      user: null,
      error: errorResponse(
        "Student profile not found",
        403,
        undefined,
        "STUDENT_PROFILE_MISSING",
      ),
    };
  }

  return { user };
}

export async function requireStaffOrStudent(): Promise<{
  user: AuthenticatedUser | null;
  error?: Response;
}> {
  const { user, error } = await requireAuth();

  if (error || !user) {
    return { user: null, error };
  }

  return { user };
}

export async function requireRegistrarOrStudent(): Promise<{
  user: AuthenticatedUser | null;
  error?: Response;
}> {
  const { user, error } = await requireAuth();

  if (error || !user) {
    return { user: null, error };
  }

  if (
    user.role !== UserRole.STUDENT &&
    user.role !== UserRole.REGISTRAR &&
    user.role !== UserRole.ADMIN
  ) {
    return {
      user: null,
      error: errorResponse(
        "Forbidden: insufficient permissions",
        403,
        undefined,
        "FORBIDDEN",
      ),
    };
  }

  return { user };
}
