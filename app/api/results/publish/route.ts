import { prisma } from "@/lib/prisma";
import { requireAssessmentStaff } from "@/lib/auth-guards";
import { StudentEnrollmentStatus } from "@/lib/student-status";
import { LogEvent } from "@/lib/auth/log-events";
import { errorResponse, jsonResponse, validationErrorResponse } from "@/lib/api-utils";
import { idSchema } from "@/lib/assessments";
import { balancePayload } from "@/lib/enrollment-fees";
import { z } from "zod";

const publishSchema = z.object({
  assessmentId: idSchema,
  override: z.boolean().default(false),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const { error, user } = await requireAssessmentStaff();
    if (error || !user)
      return error ?? errorResponse("Forbidden", 403, undefined, "FORBIDDEN");
    const parsed = publishSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const assessment = await prisma.assessment.findUnique({
      where: { id: parsed.data.assessmentId },
      select: { id: true, status: true },
    });
    if (!assessment)
      return errorResponse("Assessment not found", 404, undefined, "ASSESSMENT_NOT_FOUND");
    if (assessment.status !== 2 && assessment.status !== 3)
      return errorResponse(
        "Assessment must be closed or in the result phase before publication",
        409,
        undefined,
        "ASSESSMENT_NOT_READY_FOR_RESULTS",
      );

    const results = await prisma.assessmentSubmission.findMany({
      where: {
        assessmentId: assessment.id,
        isPublished: false,
        resultStatus: { in: parsed.data.override ? [1, 2] : [1] },
      },
      select: {
        id: true,
        studentId: true,
        resultStatus: true,
        student: { select: { hasOverdueBalance: true } },
        assessment: { select: { programmeId: true } },
      },
    });

    const outcomes: Array<{
      resultId: number;
      studentId: number;
      status: "PUBLISHED" | "ON_HOLD";
      balance?: string;
    }> = [];

    for (const result of results) {
      let hasOverdueDues = false;
      let balance = "0.00";
      const enrollment = await prisma.studentEnrollment.findFirst({
        where: {
          studentId: result.studentId,
          programmeId: result.assessment.programmeId,
          status: StudentEnrollmentStatus.ENROLLED,
        },
        select: { id: true, feeTotal: true, dueDate: true },
      });
      if (enrollment) {
        const payments = await prisma.paymentTransaction.aggregate({
          where: { enrollmentId: enrollment.id },
          _sum: { amount: true },
        });
        const fee = balancePayload(
          enrollment.feeTotal,
          payments._sum.amount,
          enrollment.dueDate,
        );
        balance = fee.balance;
        hasOverdueDues = Number(fee.balance) > 0 && fee.overdue && result.student.hasOverdueBalance;
      } else {
        hasOverdueDues = true;
        balance = "unknown";
      }

      if (hasOverdueDues && !parsed.data.override) {
        await prisma.assessmentSubmission.update({
          where: { id: result.id },
          data: { resultStatus: 2, isPublished: false, publishedAt: null },
        });
        outcomes.push({ resultId: result.id, studentId: result.studentId, status: "ON_HOLD", balance });
        continue;
      }

      await prisma.assessmentSubmission.update({
        where: { id: result.id },
        data: { resultStatus: 3, isPublished: true, publishedAt: new Date() },
      });
      await prisma.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.RESULT_PUBLISHED,
          metadata: { assessmentId: assessment.id, resultId: result.id, override: parsed.data.override },
        },
      });
      outcomes.push({ resultId: result.id, studentId: result.studentId, status: "PUBLISHED" });
    }

    return jsonResponse(
      {
        data: {
          assessmentId: assessment.id,
          outcomes,
          published: outcomes.filter((item) => item.status === "PUBLISHED").length,
          onHold: outcomes.filter((item) => item.status === "ON_HOLD").length,
        },
      },
      outcomes.some((item) => item.status === "ON_HOLD") ? 207 : 200,
    );
  } catch (error) {
    console.error("[POST /api/results/publish] Error:", error);
    return errorResponse("Internal server error", 500, undefined, "INTERNAL_ERROR");
  }
}
