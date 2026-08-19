import { prisma } from "@/lib/prisma";
import { requireAssessmentStaff, requireAuth } from "@/lib/auth-guards";
import { LogEvent } from "@/lib/auth/log-events";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import {
  assessmentCreateSchema,
  assessmentSelect,
  assessmentStatusCode,
  currentStudent,
  publicAssessment,
} from "@/lib/assessments";
import { isAssessmentEligible } from "@/lib/student-status";

export async function GET(request: Request): Promise<Response> {
  try {
    const { error, user } = await requireAuth();
    if (error || !user)
      return (
        error ?? errorResponse("Unauthorized", 401, undefined, "UNAUTHORIZED")
      );
    const params = new URL(request.url).searchParams;
    const page = Math.max(1, Number(params.get("page") ?? 1));
    const pageSize = Math.min(
      100,
      Math.max(1, Number(params.get("pageSize") ?? 20)),
    );
    const programmeId = params.get("programmeId");
    const status = params.get("status");
    if (
      (programmeId &&
        (!Number.isInteger(Number(programmeId)) || Number(programmeId) <= 0)) ||
      (status && !["DRAFT", "OPEN", "CLOSED", "RESULT"].includes(status))
    )
      return errorResponse(
        "Invalid assessment filter",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const student = user.role === 0 ? await currentStudent(user) : null;
    if (user.role === 0 && !student)
      return errorResponse(
        "Student profile not found",
        404,
        undefined,
        "STUDENT_NOT_FOUND",
      );
    const activeProgrammeId = student?.enrollments?.[0]?.programmeId;
    const openStatusList = [1, 2, 3];
    const where =
      user.role === 0
        ? {
            programmeId: isAssessmentEligible(student?.status)
              ? activeProgrammeId ?? -1
              : -1,
            status: { in: openStatusList },
            ...(programmeId ? { programmeId: Number(programmeId) } : {}),
          }
        : {
            ...(programmeId ? { programmeId: Number(programmeId) } : {}),
            ...(status ? { status: assessmentStatusCode(status) } : {}),
          };
    const [items, total] = await Promise.all([
      prisma.assessment.findMany({
        where,
        select: assessmentSelect,
        orderBy: { dueDate: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.assessment.count({ where }),
    ]);
    return jsonResponse({
      data: items.map((item) =>
        publicAssessment(item as unknown as Record<string, unknown>),
      ),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[GET /api/assessments] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { error, user } = await requireAssessmentStaff();
    if (error || !user)
      return error ?? errorResponse("Forbidden", 403, undefined, "FORBIDDEN");
    const parsed = assessmentCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const programme = await prisma.programme.findFirst({
      where: { id: parsed.data.programmeId, status: "ACTIVE", deletedAt: null },
      select: { id: true },
    });
    if (!programme)
      return errorResponse(
        "Active programme not found",
        404,
        undefined,
        "PROGRAMME_NOT_FOUND",
      );
    const assessment = await prisma.$transaction(async (tx) => {
      const created = await tx.assessment.create({
        data: {
          ...parsed.data,
          status: assessmentStatusCode(parsed.data.status ?? "DRAFT"),
          dueDate: new Date(parsed.data.dueDate),
          maxMarks: parsed.data.maxMarks,
          createdById: user.id,
        } as any,
        select: assessmentSelect,
      });
      await tx.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.ASSESSMENT_CREATED,
          metadata: { assessmentId: created.id },
        },
      });
      return created;
    });
    return jsonResponse(
      {
        data: publicAssessment(
          assessment as unknown as Record<string, unknown>,
        ),
      },
      201,
    );
  } catch (error) {
    console.error("[POST /api/assessments] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
