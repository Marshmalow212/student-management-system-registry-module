import { prisma } from "@/lib/prisma";
import { requireRegistrar, requireRegistrarOrStudent } from "@/lib/auth-guards";
import { UserRole } from "@/lib/auth/roles";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import {
  balancePayload,
  cents,
  decimalString,
  paymentCreateSchema,
  publicPayment,
} from "@/lib/enrollment-fees";
import { LogEvent } from "@/lib/auth/log-events";
import { StudentEnrollmentStatus } from "@/lib/student-status";

const paymentSelect = {
  id: true,
  reference: true,
  idempotencyKey: true,
  enrollmentId: true,
  amount: true,
  currency: true,
  paymentDate: true,
  createdAt: true,
  enrollment: { select: { studentId: true, programmeId: true } },
} as const;

export async function GET(request: Request): Promise<Response> {
  try {
    const { error, user } = await requireRegistrarOrStudent();
    if (error || !user)
      return (
        error ?? errorResponse("Unauthorized", 401, undefined, "UNAUTHORIZED")
      );

    const enrollmentId = new URL(request.url).searchParams.get("enrollmentId");
    if (
      enrollmentId &&
      (!Number.isInteger(Number(enrollmentId)) || Number(enrollmentId) <= 0)
    ) {
      return errorResponse(
        "Invalid enrolment ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    }

    // For students, filter to only their enrollments
    let where: { enrollmentId?: number; enrollment?: { studentId: number } } =
      {};

    if (user.role === UserRole.STUDENT) {
      // Students can only view payments for their own enrollments
      if (!user.studentId) {
        return errorResponse(
          "Student profile not found",
          403,
          undefined,
          "STUDENT_PROFILE_MISSING",
        );
      }

      // First, get the student record to use the numeric ID
      const student = await prisma.student.findUnique({
        where: { studentUid: user.studentId },
        select: { id: true },
      });

      if (!student) {
        return errorResponse(
          "Student profile not found",
          403,
          undefined,
          "STUDENT_PROFILE_MISSING",
        );
      }

      where = {
        enrollment: { studentId: student.id },
        ...(enrollmentId ? { enrollmentId: Number(enrollmentId) } : {}),
      };
    } else {
      // Staff can view all payments, optionally filtered by enrollmentId
      where = enrollmentId ? { enrollmentId: Number(enrollmentId) } : {};
    }

    const payments = await prisma.paymentTransaction.findMany({
      where,
      orderBy: { paymentDate: "desc" },
      select: paymentSelect,
    });

    return jsonResponse({
      data: payments.map((payment) =>
        publicPayment(payment as unknown as Record<string, unknown>),
      ),
    });
  } catch (error) {
    console.error("[GET /api/payments] Error:", error);
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
    const parsed = paymentCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const input = parsed.data;
    const payment = await prisma.$transaction(async (tx) => {
      const existing = await tx.paymentTransaction.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: paymentSelect,
      });
      if (existing) {
        if (
          existing.reference !== input.reference ||
          decimalString(existing.amount) !== input.amount ||
          existing.enrollmentId !== input.enrollmentId
        )
          throw new Error("IDEMPOTENCY_CONFLICT");
        return { payment: existing, replay: true };
      }
      const enrollment = await tx.studentEnrollment.findUnique({
        where: { id: input.enrollmentId },
        select: { id: true, feeTotal: true, status: true },
      });
      if (!enrollment) throw new Error("ENROLLMENT_NOT_FOUND");
      if (enrollment.status !== StudentEnrollmentStatus.ENROLLED)
        throw new Error("ENROLLMENT_NOT_PAYABLE");
      
      const created = await tx.paymentTransaction.create({
        data: {
          reference: input.reference,
          idempotencyKey: input.idempotencyKey,
          enrollmentId: input.enrollmentId,
          amount: input.amount,
          currency: input.currency,
          paymentDate: input.paymentDate
            ? new Date(input.paymentDate)
            : new Date(),
          receivedById: user.id,
        },
        select: paymentSelect,
      });
      await tx.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.PAYMENT_RECORDED,
          metadata: {
            paymentId: created.id,
            reference: input.reference,
            enrollmentId: input.enrollmentId,
            amount: input.amount,
            currency: input.currency,
          },
        },
      });
      return { payment: created, replay: false };
    });
    return jsonResponse(
      {
        data: publicPayment(
          payment.payment as unknown as Record<string, unknown>,
        ),
        replay: payment.replay,
      },
      payment.replay ? 200 : 201,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "IDEMPOTENCY_CONFLICT")
      return errorResponse(
        "Idempotency key was already used for different payment data",
        409,
        undefined,
        "IDEMPOTENCY_CONFLICT",
      );
    if (message === "ENROLLMENT_NOT_FOUND")
      return errorResponse(
        "Enrolment not found",
        404,
        undefined,
        "ENROLLMENT_NOT_FOUND",
      );
    if (message === "ENROLLMENT_NOT_PAYABLE")
      return errorResponse(
        "Enrolment is not payable",
        409,
        undefined,
        "ENROLLMENT_NOT_PAYABLE",
      );
    if (message === "OVERPAYMENT")
      return errorResponse(
        "Payment exceeds the outstanding balance",
        409,
        undefined,
        "OVERPAYMENT",
      );
    if ((error as { code?: string }).code === "P2002")
      return errorResponse(
        "Payment reference already exists",
        409,
        undefined,
        "PAYMENT_EXISTS",
      );
    console.error("[POST /api/payments] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
