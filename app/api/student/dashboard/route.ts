import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth-guards";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

export async function GET(): Promise<Response> {
  try {
    const { user, error } = await requireStudent();
    if (error || !user) {
      return (
        error ?? errorResponse("Unauthorized", 401, undefined, "UNAUTHORIZED")
      );
    }

    const student = await prisma.student.findFirst({
      where: {
        userId: user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        hasOverdueBalance: true,
      },
    });

    if (!student) {
      return errorResponse(
        "Student profile not found",
        404,
        undefined,
        "STUDENT_NOT_FOUND",
      );
    }

    const [enrollments, submissionCount, overdueSubmissionCount, latestResult] =
      await Promise.all([
        prisma.studentEnrollment.findMany({
          where: { studentId: student.id },
          select: {
            feeTotal: true,
            dueDate: true,
            payments: {
              select: {
                amount: true,
              },
            },
          },
        }),
        prisma.assessmentSubmission.count({
          where: { studentId: student.id },
        }),
        prisma.assessmentSubmission.count({
          where: {
            studentId: student.id,
            isLate: true,
          },
        }),
        prisma.assessmentSubmission.findFirst({
          where: { studentId: student.id, isPublished: true },
          orderBy: [{ gradedAt: "desc" }, { id: "desc" }],
          select: {
            classification: true,
          },
        }),
      ]);

    const outstandingBalance = enrollments.reduce((sum, enrollment) => {
      const feeTotal = Number(enrollment.feeTotal ?? 0);
      const paidTotal = enrollment.payments.reduce((paymentTotal, payment) => {
        return paymentTotal + Number(payment.amount ?? 0);
      }, 0);
      return sum + (feeTotal - paidTotal);
    }, 0);

    const paidTotal = enrollments.reduce((total, enrollment) => {
      return (
        total +
        enrollment.payments.reduce((paymentTotal, payment) => {
          return paymentTotal + Number(payment.amount ?? 0);
        }, 0)
      );
    }, 0);

    const lastDueDate = enrollments.reduce<Date | null>(
      (lastDate, enrollment) => {
        const currentDate = new Date();

        const dueDate = enrollment.dueDate
          ? new Date(enrollment.dueDate)
          : null;

        if (!dueDate || dueDate >= currentDate) {
          return lastDate;
        }

        if (!lastDate || dueDate > lastDate) {
          return dueDate;
        }

        return lastDate;
      },
      null,
    );

    return jsonResponse({
      data: {
        studentId: student.id,
        outstandingBalance: outstandingBalance.toFixed(2),
        paidTotal: paidTotal.toFixed(2),
        submissionCount,
        overdueSubmissionCount,
        hasOverdueBalance: student.hasOverdueBalance,
        lastResultGrade: latestResult?.classification ?? "N/A",
        lastDueDate: lastDueDate?.toLocaleDateString() ?? null,
      },
    });
  } catch (error) {
    console.error("[GET /api/student/dashboard] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
