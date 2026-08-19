import { prisma } from "@/lib/prisma";
import { requireAssessmentStaff, requireAuth } from "@/lib/auth-guards";
import { LogEvent } from "@/lib/auth/log-events";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import {
  assessmentSelect,
  assessmentStatusCode,
  assessmentUpdateSchema,
  canManageAssessment,
  currentStudent,
  idSchema,
  publicAssessment,
} from "@/lib/assessments";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { error, user } = await requireAuth();
    if (error || !user)
      return (
        error ?? errorResponse("Unauthorized", 401, undefined, "UNAUTHORIZED")
      );
    const id = idSchema.safeParse((await context.params).id);
    if (!id.success)
      return errorResponse(
        "Invalid assessment ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const assessment = await prisma.assessment.findUnique({
      where: { id: id.data },
      select: assessmentSelect,
    });
    if (!assessment)
      return errorResponse(
        "Assessment not found",
        404,
        undefined,
        "ASSESSMENT_NOT_FOUND",
      );
    if (user.role === 0) {
      const student = await currentStudent(user);
      if (
        !student ||
        student.programmeId !== assessment.programmeId ||
        ![1, 2, 3].includes(assessment.status)
      )
        return errorResponse(
          "Assessment not found",
          404,
          undefined,
          "ASSESSMENT_NOT_FOUND",
        );
    }
    return jsonResponse({
      data: publicAssessment(assessment as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[GET /api/assessments/:id] Error:", error);
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
    const { error, user } = await requireAssessmentStaff();
    if (error || !user)
      return error ?? errorResponse("Forbidden", 403, undefined, "FORBIDDEN");
    const id = idSchema.safeParse((await context.params).id);
    if (!id.success)
      return errorResponse(
        "Invalid assessment ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const parsed = assessmentUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const current = await prisma.assessment.findUnique({
      where: { id: id.data },
      select: { ...assessmentSelect, createdById: true },
    });
    if (!current)
      return errorResponse(
        "Assessment not found",
        404,
        undefined,
        "ASSESSMENT_NOT_FOUND",
      );
    if (!canManageAssessment(user, current.createdById))
      return errorResponse(
        "You cannot manage this assessment",
        403,
        undefined,
        "FORBIDDEN",
      );
    const currentStatus = assessmentStatusCode(current.status);
    const next = parsed.data.status as string | undefined;
    const nextStatus = next ? assessmentStatusCode(next) : undefined;
    if (
      next &&
      ((currentStatus === 0 && ![0, 1].includes(nextStatus!)) ||
        (currentStatus === 1 && ![2, 3].includes(nextStatus!)) ||
        (currentStatus === 2 && nextStatus !== 3) ||
        currentStatus === 3)
    )
      return errorResponse(
        "Invalid assessment status transition",
        409,
        undefined,
        "INVALID_STATUS_TRANSITION",
      );
    if (
      currentStatus !== 0 &&
      Object.keys(parsed.data).some((key) => key !== "status")
    )
      return errorResponse(
        "Only draft assessments can be edited",
        409,
        undefined,
        "ASSESSMENT_NOT_EDITABLE",
      );
    const { dueDate, maxMarks, status, ...rest } = parsed.data;
    const assessment = await prisma.assessment.update({
      where: { id: id.data },
      data: {
        ...rest,
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        ...(maxMarks ? { maxMarks } : {}),
        ...(nextStatus !== undefined ? { status: nextStatus } : {}),
      } as any,
      select: assessmentSelect,
    });
    await prisma.userLog.create({
      data: {
        userId: user.id,
        eventType:
          nextStatus === 1 || nextStatus === 3
            ? LogEvent.ASSESSMENT_PUBLISHED
            : LogEvent.ASSESSMENT_UPDATED,
        metadata: { assessmentId: id.data, status },
      },
    });
    return jsonResponse({
      data: publicAssessment(assessment as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[PATCH /api/assessments/:id] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
