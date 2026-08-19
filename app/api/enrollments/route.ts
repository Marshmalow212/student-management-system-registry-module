import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import {
  balancePayload,
  cents,
  enrollmentCreateSchema,
  decimalString,
  money,
} from "@/lib/enrollment-fees";
import { LogEvent } from "@/lib/auth/log-events";
import {
  canCreateEnrollment,
  StudentEnrollmentStatus,
  studentEnrollmentStatusSchema,
} from "@/lib/student-status";

const enrollmentSelect = {
  id: true,
  reference: true,
  studentId: true,
  programmeId: true,
  enrolledYear: true,
  status: true,
  feeTotal: true,
  feeSnapshot: true,
  discountSnapshot: true,
  dueDate: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: { id: true, studentUid: true, fullName: true, email: true },
  },
  programme: { select: { id: true, name: true } },
} as const;

function publicEnrollment(enrollment: Record<string, unknown>, paid: unknown) {
  return {
    ...enrollment,
    feeTotal: decimalString(enrollment.feeTotal),
    feeSnapshot: decimalString(enrollment.feeSnapshot),
    discountSnapshot: decimalString(enrollment.discountSnapshot),
    balance: balancePayload(
      enrollment.feeTotal,
      paid,
      enrollment.dueDate as Date | null,
    ),
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { error } = await requireRegistrar();
    if (error) return error;
    const params = new URL(request.url).searchParams;
    const studentId = params.get("studentId");
    const status = params.get("status");
    const parsedStatus = status === null ? null : Number(status);
    const where = {
      ...(studentId ? { studentId: Number(studentId) } : {}),
      ...(status ? { status: parsedStatus as number } : {}),
    };
    if (
      studentId &&
      (!Number.isInteger(Number(studentId)) || Number(studentId) <= 0)
    )
      return errorResponse(
        "Invalid student ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    if (status && !studentEnrollmentStatusSchema.safeParse(parsedStatus).success)
      return errorResponse(
        "Invalid enrolment status",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const enrollments = await prisma.studentEnrollment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: enrollmentSelect,
    });
    const data = await Promise.all(
      enrollments.map(async (enrollment) => {
        const aggregate = await prisma.paymentTransaction.aggregate({
          where: { enrollmentId: enrollment.id },
          _sum: { amount: true },
        });
        return publicEnrollment(
          enrollment as unknown as Record<string, unknown>,
          aggregate._sum.amount,
        );
      }),
    );
    return jsonResponse({ data });
  } catch (error) {
    console.error("[GET /api/enrollments] Error:", error);
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
    const { error, user } = await requireRegistrar();
    if (error || !user)
      return error ?? errorResponse("Forbidden", 403, undefined, "FORBIDDEN");
    const parsed = enrollmentCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const { reference, studentId, programmeId, enrolledYear, dueDate } =
      parsed.data;
    const enrollment = await prisma.$transaction(async (tx) => {
      const [student, programme] = await Promise.all([
        tx.student.findFirst({
          where: {
            id: studentId,
            deletedAt: null,
          },
          select: { id: true, status: true },
        }),
        tx.programme.findFirst({
          where: { id: programmeId, deletedAt: null, status: "ACTIVE" },
          select: { fee: true, discount: true, coupon: true, couponLimit: true, couponUsed: true },
        }),
      ]);
      if (!student) throw new Error("STUDENT_NOT_FOUND");
      if (!programme) throw new Error("PROGRAMME_NOT_FOUND");
      const existingEnrollments = (await tx.studentEnrollment.findMany({
        where: { studentId },
        select: { status: true },
      })) ?? [];
      if (!canCreateEnrollment(existingEnrollments.map((item) => item.status)))
        throw new Error("ENROLLMENT_STATUS_BLOCKED");
      const fee = cents(decimalString(programme.fee));
      const discount = cents(decimalString(programme.discount));
      const discountApplied = discount;
      if (discountApplied > BigInt(0)) {
        const couponClaim = await tx.programme.updateMany({
          where: {
            id: programmeId,
            deletedAt: null,
            status: "ACTIVE",
            coupon: { not: null },
            couponLimit: { not: null },
            couponUsed: { lt: programme.couponLimit ?? 0 },
          },
          data: { couponUsed: { increment: 1 } },
        });
        if (couponClaim.count !== 1) throw new Error("COUPON_EXHAUSTED");
      }
      const feeTotal = money(
        fee > discountApplied ? fee - discountApplied : BigInt(0),
      );
      const created = await tx.studentEnrollment.create({
        data: {
          reference,
          studentId,
          programmeId,
          enrolledYear,
          status: StudentEnrollmentStatus.ENROLLED,
          feeSnapshot: money(fee),
          discountSnapshot: money(discountApplied),
          feeTotal,
          dueDate: dueDate ? new Date(dueDate) : null,
          createdById: user.id,
        },
        select: enrollmentSelect,
      });
      await tx.student.update({
        where: { id: studentId },
        data: {
          status: StudentEnrollmentStatus.ENROLLED,
          programmeId,
        },
      });
      await tx.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.ENROLLMENT_CREATED,
          metadata: { enrollmentId: created.id, reference },
        },
      });
      return created;
    });
    return jsonResponse(
      {
        data: publicEnrollment(
          enrollment as unknown as Record<string, unknown>,
          null,
        ),
      },
      201,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "STUDENT_NOT_FOUND")
      return errorResponse(
        "Student not found",
        404,
        undefined,
        "STUDENT_NOT_FOUND",
      );
    if (message === "PROGRAMME_NOT_FOUND")
      return errorResponse(
        "Active programme not found",
        404,
        undefined,
        "PROGRAMME_NOT_FOUND",
      );
    if (message === "ENROLLMENT_STATUS_BLOCKED")
      return errorResponse(
        "Student has an enrollment that must be completed or withdrawn first",
        409,
        undefined,
        "ENROLLMENT_STATUS_BLOCKED",
      );
    if (message === "COUPON_EXHAUSTED")
      return errorResponse(
        "Programme coupon is exhausted or unavailable",
        409,
        undefined,
        "COUPON_EXHAUSTED",
      );
    if ((error as { code?: string }).code === "P2002")
      return errorResponse(
        "Enrolment already exists",
        409,
        undefined,
        "ENROLLMENT_EXISTS",
      );
    console.error("[POST /api/enrollments] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
