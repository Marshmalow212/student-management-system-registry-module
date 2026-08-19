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
  feeSnapshot: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: { id: true, studentUid: true, fullName: true, email: true },
  },
  programme: { select: { id: true, name: true, fee: true } },
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
    if (current.status === StudentEnrollmentStatus.WITHDRAWN || current.status === StudentEnrollmentStatus.COMPLETED || current.status === StudentEnrollmentStatus.DEFERRED) {
      return errorResponse(
        "Fee fee update is not allowed if student is not enrolled currently.",
        409,
        undefined,
        "INVALID_ENROLLMENT_STATUS",
      );
    }


    let nextInstallment = Number(current?.feeSnapshot) / 4;
    let newFee = (Number(current?.feeTotal) + nextInstallment);
    if (newFee > Number(current?.feeSnapshot)) {
      nextInstallment = Number(current?.feeSnapshot) - Number(current?.feeTotal);
      newFee = nextInstallment;
    }
    const updatedFee = (nextInstallment > 0)  && (newFee <= Number(current?.feeSnapshot)) ? newFee : current?.feeTotal;
    if (updatedFee as number < 0) {
      return errorResponse(
        "Remaining fee cannot be negative.",
        400,
        undefined,
        "NEGATIVE_REMAINING_FEE",
      );
    }
    
    const enrollment = await prisma.$transaction(async (tx) => {
      const updated = await tx.studentEnrollment.update({
        where: { id: parsedId.data },
        data: {
          feeTotal: updatedFee as number,
          dueDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // Set due date to one month from now
        },
        select,
      });
      await tx.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.ENROLLMENT_STATUS_CHANGED,
          metadata: { enrollmentId: parsedId.data, feeTotal: updated.feeTotal, dueDate: updated.dueDate },
        },
      });
      return updated;
    });
    return jsonResponse({
      data: await withBalance(enrollment as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[PATCH /api/enrollments/add-remaining/:id] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
