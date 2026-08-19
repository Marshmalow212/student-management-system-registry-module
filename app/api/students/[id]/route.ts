import { prisma } from "@/lib/prisma";
import { requireRegistrar, requireRole } from "@/lib/auth-guards";
import { UserRole } from "@/lib/auth/roles";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import {
  idSchema,
  studentSelect,
  studentUpdateSchema,
} from "@/lib/registry";
import {
  isTerminalStudentStatus,
  StudentEnrollmentStatus,
} from "@/lib/student-status";

async function findStudent(id: number) {
  return prisma.student.findFirst({
    where: { id, deletedAt: null },
    select: studentSelect,
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { error } = await requireRegistrar();
    if (error) return error;
    const id = idSchema.safeParse((await context.params).id);
    if (!id.success)
      return errorResponse(
        "Invalid student ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const student = await findStudent(id.data);
    if (!student)
      return errorResponse(
        "Student not found",
        404,
        undefined,
        "STUDENT_NOT_FOUND",
      );
    return jsonResponse({ data: student });
  } catch (error) {
    console.error("[GET /api/students/:id] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { error } = await requireRegistrar();
    if (error) return error;
    const id = idSchema.safeParse((await context.params).id);
    if (!id.success)
      return errorResponse(
        "Invalid student ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const current = await findStudent(id.data);
    if (!current)
      return errorResponse(
        "Student not found",
        404,
        undefined,
        "STUDENT_NOT_FOUND",
      );
    const parsed = studentUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    if (parsed.data.status !== undefined)
      return errorResponse(
        "Student lifecycle status must be changed through an enrollment",
        409,
        undefined,
        "STATUS_CHANGE_REQUIRES_ENROLLMENT",
      );
    if (
      isTerminalStudentStatus(current.status) &&
      parsed.data.status &&
      parsed.data.status !== current.status
    )
      return errorResponse(
        "Withdrawn students cannot be reactivated",
        409,
        undefined,
        "INVALID_STATUS_TRANSITION",
      );
    const { programmeId, userId, dateOfBirth, ...data } = parsed.data;
    if (programmeId !== undefined && programmeId !== null) {
      const programme = await prisma.programme.findFirst({
        where: { id: programmeId, status: "ACTIVE", deletedAt: null },
        select: { id: true },
      });
      if (!programme)
        return errorResponse(
          "Active programme not found",
          404,
          undefined,
          "PROGRAMME_NOT_FOUND",
        );
    }
    if (userId !== undefined && userId !== null) {
      const user = await prisma.user.findFirst({
        where: { id: userId, role: UserRole.STUDENT },
        select: { id: true },
      });
      if (!user)
        return errorResponse(
          "Student user not found",
          404,
          undefined,
          "USER_NOT_FOUND",
        );
    }
    const student = await prisma.student.update({
      where: { id: id.data },
      data: {
        ...data,
        ...(programmeId !== undefined ? { programmeId } : {}),
        ...(userId !== undefined ? { userId } : {}),
        ...(dateOfBirth !== undefined
          ? { dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null }
          : {}),
      },
      select: studentSelect,
    });
    return jsonResponse({ data: student });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002")
      return errorResponse(
        "Student identity already exists",
        409,
        undefined,
        "STUDENT_EXISTS",
      );
    console.error("[PATCH /api/students/:id] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { error } = await requireRole([UserRole.ADMIN]);
    if (error) return error;
    const id = idSchema.safeParse((await context.params).id);
    if (!id.success)
      return errorResponse(
        "Invalid student ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const student = await findStudent(id.data);
    if (!student)
      return errorResponse(
        "Student not found",
        404,
        undefined,
        "STUDENT_NOT_FOUND",
      );
    const deleted = await prisma.student.update({
      where: { id: id.data },
      data: { deletedAt: new Date(), status: StudentEnrollmentStatus.WITHDRAWN },
      select: studentSelect,
    });
    return jsonResponse({ data: deleted, message: "Student withdrawn" });
  } catch (error) {
    console.error("[DELETE /api/students/:id] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
