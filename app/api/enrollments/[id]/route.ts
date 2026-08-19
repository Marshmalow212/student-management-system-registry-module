import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import {
  balancePayload,
  enrollmentUpdateSchema,
  decimalString,
  idSchema,
} from "@/lib/enrollment-fees";
import { LogEvent } from "@/lib/auth/log-events";
import {
  StudentEnrollmentStatus,
} from "@/lib/student-status";

const select = {
  id: true,
  reference: true,
  studentId: true,
  programmeId: true,
  enrolledYear: true,
  status: true,
  feeTotal: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: { id: true, studentUid: true, fullName: true, email: true },
  },
  programme: { select: { id: true, name: true } },
} as const;

async function findEnrollment(id: number) {
  return prisma.studentEnrollment.findUnique({ where: { id }, select });
}

async function withBalance(enrollment: Record<string, unknown>) {
  const aggregate = await prisma.paymentTransaction.aggregate({
    where: { enrollmentId: enrollment.id as number },
    _sum: { amount: true },
  });
  return {
    ...enrollment,
    feeTotal: decimalString(enrollment.feeTotal),
    balance: balancePayload(
      enrollment.feeTotal,
      aggregate._sum.amount,
      enrollment.dueDate as Date | null,
    ),
  };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { error } = await requireRegistrar();
    if (error) return error;
    const parsedId = idSchema.safeParse((await context.params).id);
    if (!parsedId.success)
      return errorResponse(
        "Invalid enrolment ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const enrollment = await findEnrollment(parsedId.data);
    if (!enrollment)
      return errorResponse(
        "Enrolment not found",
        404,
        undefined,
        "ENROLLMENT_NOT_FOUND",
      );
    return jsonResponse({
      data: await withBalance(enrollment as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[GET /api/enrollments/:id] Error:", error);
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
    const { error, user } = await requireRegistrar();
    if (error || !user)
      return error ?? errorResponse("Forbidden", 403, undefined, "FORBIDDEN");
    const parsedId = idSchema.safeParse((await context.params).id);
    if (!parsedId.success)
      return errorResponse(
        "Invalid enrolment ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const parsed = enrollmentUpdateSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const current = await findEnrollment(parsedId.data);
    if (!current)
      return errorResponse(
        "Enrolment not found",
        404,
        undefined,
        "ENROLLMENT_NOT_FOUND",
      );
    if (
      current.status === StudentEnrollmentStatus.WITHDRAWN &&
      parsed.data.status !== StudentEnrollmentStatus.WITHDRAWN
    )
      return errorResponse(
        "Withdrawn enrolments cannot be reactivated",
        409,
        undefined,
        "INVALID_STATUS_TRANSITION",
      );
    if (
      parsed.data.status === StudentEnrollmentStatus.ENROLLED &&
      current.status === StudentEnrollmentStatus.ENROLLED
    ) {
      const otherActive = await prisma.studentEnrollment.findFirst({
        where: {
          studentId: current.studentId,
          status: StudentEnrollmentStatus.ENROLLED,
          id: { not: parsedId.data },
        },
        select: { id: true },
      });
      if (otherActive)
        return errorResponse(
          "Student already has an enrolled programme",
          409,
          undefined,
          "ACTIVE_ENROLLMENT_EXISTS",
        );
    }
    if (parsed.data.status === StudentEnrollmentStatus.COMPLETED) {
      const assessments = await prisma.assessment.findMany({
        where: { programmeId: current.programmeId },
        select: {
          maxMarks: true,
          submissions: {
            where: { studentId: current.studentId },
            select: { marks: true, submittedAt: true },
          },
        },
      });
      const hasIncompleteAssessment = assessments.some((assessment) => {
        const submission = assessment.submissions[0];
        if (!submission?.submittedAt || submission.marks === null) return true;
        return Number(submission.marks) < Number(assessment.maxMarks) * 0.4;
      });
      if (hasIncompleteAssessment)
        return errorResponse(
          "All assessments must be submitted with passing marks before completion",
          409,
          undefined,
          "COMPLETION_REQUIREMENTS_NOT_MET",
        );
    }
    const enrollment = await prisma.$transaction(async (tx) => {
      const updated = await tx.studentEnrollment.update({
        where: { id: parsedId.data },
        data: parsed.data,
        select,
      });
      await tx.student.update({
        where: { id: current.studentId },
        data: {
          status: parsed.data.status,
          ...(parsed.data.status === StudentEnrollmentStatus.WITHDRAWN
            ? { programmeId: null }
            : { programmeId: current.programmeId }),
        },
      });
      await tx.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.ENROLLMENT_STATUS_CHANGED,
          metadata: { enrollmentId: parsedId.data, status: parsed.data.status },
        },
      });
      return updated;
    });
    return jsonResponse({
      data: await withBalance(enrollment as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[PATCH /api/enrollments/:id] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
