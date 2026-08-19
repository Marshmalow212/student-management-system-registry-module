import { prisma } from "@/lib/prisma";
import { requireAssessmentStaff } from "@/lib/auth-guards";
import { StudentEnrollmentStatus } from "@/lib/student-status";
import { LogEvent } from "@/lib/auth/log-events";
import { errorResponse, jsonResponse } from "@/lib/api-utils";
import { idSchema } from "@/lib/assessments";
import { balancePayload, decimalString } from "@/lib/enrollment-fees";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { error, user } = await requireAssessmentStaff();
    if (error || !user)
      return error ?? errorResponse("Forbidden", 403, undefined, "FORBIDDEN");
    const id = idSchema.safeParse((await context.params).id);
    if (!id.success)
      return errorResponse("Invalid submission ID", 400, undefined, "VALIDATION_ERROR");

    const submission = await prisma.assessmentSubmission.findUnique({
      where: { id: id.data },
      select: {
        id: true,
        studentId: true,
        marks: true,
        resultStatus: true,
        isPublished: true,
        student: { select: { hasOverdueBalance: true } },
        assessment: { select: { programmeId: true, status: true } },
      },
    });
    if (!submission)
      return errorResponse("Submission not found", 404, undefined, "RESULT_NOT_FOUND");
    if (submission.isPublished || submission.resultStatus === 3)
      return errorResponse("Result is already published", 409, undefined, "RESULT_ALREADY_PUBLISHED");
    if (submission.marks === null)
      return errorResponse("Submission must be graded before publication", 409, undefined, "RESULT_NOT_GRADED");

    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId: submission.studentId, programmeId: submission.assessment.programmeId, status: StudentEnrollmentStatus.ENROLLED },
      select: { id: true, feeTotal: true, dueDate: true },
    });
    if (!enrollment)
      return errorResponse("Active student enrolment is required before publishing", 409, undefined, "ENROLLMENT_REQUIRED");
    const payments = await prisma.paymentTransaction.aggregate({
      where: { enrollmentId: enrollment.id },
      _sum: { amount: true },
    });
    const balance = balancePayload(enrollment.feeTotal, payments._sum.amount, enrollment.dueDate);
    const hasFeeDues = Number(balance.balance) > 0 && balance.overdue && submission.student.hasOverdueBalance;
    if (hasFeeDues) {
      await prisma.assessmentSubmission.update({
        where: { id: id.data },
        data: { resultStatus: 2, isPublished: false, publishedAt: null },
      });
      return errorResponse(
        "Result is on hold until outstanding fees are cleared",
        409,
        { balance: [decimalString(balance.balance)] },
        "RESULT_ON_HOLD",
      );
    }

    const published = await prisma.assessmentSubmission.update({
      where: { id: id.data },
      data: { resultStatus: 3, isPublished: true, publishedAt: new Date() },
      select: { id: true, assessmentId: true, studentId: true, marks: true, classification: true, isPublished: true, publishedAt: true },
    });
    await prisma.userLog.create({
      data: { userId: user.id, eventType: LogEvent.RESULT_PUBLISHED, metadata: { submissionId: id.data } },
    });
    return jsonResponse({ data: { ...published, submissionId: published.id, marks: String(published.marks) } });
  } catch (error) {
    console.error("[PATCH /api/results/:id] Error:", error);
    return errorResponse("Internal server error", 500, undefined, "INTERNAL_ERROR");
  }
}
