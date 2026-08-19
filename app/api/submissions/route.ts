import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import { LogEvent } from "@/lib/auth/log-events";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import { assessmentStatusCode, currentStudent, submissionSchema } from "@/lib/assessments";
import { isAssessmentEligible } from "@/lib/student-status";

const submissionSelect = {
  id: true,
  assessmentId: true,
  studentId: true,
  submittedAt: true,
  isLate: true,
  status: true,
  file_path: true,
} as const;

export async function POST(request: Request): Promise<Response> {
  try {
    console.log("[POST /api/submissions] Request received:", request);
    const { error, user } = await requireAuth();
    if (error || !user)
      return (
        error ?? errorResponse("Unauthorized", 401, undefined, "UNAUTHORIZED")
      );
    const parsed = submissionSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const student = await currentStudent(user);
    if (!student)
      return errorResponse(
        "Student profile not found",
        404,
        undefined,
        "STUDENT_NOT_FOUND",
      );
    const activeEnrollment = student.enrollments?.[0];
    if (!isAssessmentEligible(student.status) || !activeEnrollment)
      return errorResponse(
        "Student is not currently enrolled",
        409,
        undefined,
        "STUDENT_NOT_ENROLLED",
      );
    if (parsed.data.student_id !== student.id)
      return errorResponse(
        "Submission student does not match the authenticated student",
        403,
        undefined,
        "STUDENT_MISMATCH",
      );
    const assessment = await prisma.assessment.findUnique({
      where: { id: parsed.data.assessment_id },
      select: {
        id: true,
        programmeId: true,
        dueDate: true,
        extendedDeadline: true,
        resubmissionLimit: true,
        status: true,
      },
    });
    if (!assessment)
      return errorResponse(
        "Assessment not found",
        404,
        undefined,
        "ASSESSMENT_NOT_FOUND",
      );
    const assessmentStatus = assessmentStatusCode(assessment.status);
    if (assessmentStatus !== 1)
      return errorResponse(
        "Assessment is not open for submission",
        409,
        undefined,
        "ASSESSMENT_NOT_OPEN",
      );
    if (activeEnrollment.programmeId !== assessment.programmeId)
      return errorResponse(
        "Assessment is not assigned to your programme",
        403,
        undefined,
        "FORBIDDEN",
      );
    if (parsed.data.programme_id !== assessment.programmeId)
      return errorResponse(
        "Submission programme does not match the assessment",
        403,
        undefined,
        "PROGRAMME_MISMATCH",
      );
    const now = new Date();
    const existing = await prisma.assessmentSubmission.findUnique({
      where: {
        assessmentId_studentId: {
          assessmentId: assessment.id,
          studentId: student.id,
        },
      },
      select: {
        id: true,
        resubmissions: true,
        isPublished: true,
      },
    });
    const isResubmission = Boolean(existing);
    const submissionDeadline = isResubmission
      ? assessment.dueDate
      : assessment.extendedDeadline ?? assessment.dueDate;
    if (now > submissionDeadline)
      return errorResponse(
        "Assessment submission deadline has passed",
        409,
        undefined,
        "DEADLINE_PASSED",
      );
    if (existing?.isPublished)
      return errorResponse(
        "Published results cannot be resubmitted",
        409,
        undefined,
        "RESULT_ALREADY_PUBLISHED",
      );
    if (
      existing &&
      (assessment.resubmissionLimit <= 0 ||
        existing.resubmissions >= assessment.resubmissionLimit)
    )
      return errorResponse(
        "The resubmission limit has been reached",
        409,
        undefined,
        "RESUBMISSION_LIMIT_REACHED",
      );
    const submission = await prisma.$transaction(async (tx) => {
      const created = isResubmission && existing
        ? await tx.assessmentSubmission.update({
            where: { id: existing.id },
            data: {
              file_path: parsed.data.file_path,
              submittedAt: now,
              isLate: now > assessment.dueDate,
              status: 0,
              resubmissions: { increment: 1 },
            },
            select: submissionSelect,
          })
        : await tx.assessmentSubmission.create({
            data: {
              assessmentId: assessment.id,
              studentId: student.id,
              file_path: parsed.data.file_path,
            },
            select: submissionSelect,
          });
      if (isResubmission && existing?.isPublished === false)
        await tx.assessmentSubmission.update({
          where: { id: created.id },
          data: { marks: null, classification: null, resultStatus: 0, gradedById: null, gradedAt: null },
        });
      await tx.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.SUBMISSION_CREATED,
          metadata: {
            submissionId: created.id,
            assessmentId: assessment.id,
            resubmission: isResubmission,
          },
        },
      });
      return created;
    });
    return jsonResponse({ data: submission }, 201);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002")
      return errorResponse(
        "A submission already exists",
        409,
        undefined,
        "SUBMISSION_EXISTS",
      );
    console.error("[POST /api/submissions] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { error, user } = await requireAuth();
    if (error || !user)
      return (
        error ?? errorResponse("Unauthorized", 401, undefined, "UNAUTHORIZED")
      );
    const student = await currentStudent(user);
    const params = new URL(request.url).searchParams;
    const assessmentId = params.get("assessmentId");
    if (
      assessmentId &&
      (!Number.isInteger(Number(assessmentId)) || Number(assessmentId) <= 0)
    )
      return errorResponse(
        "Invalid assessment ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const where =
      user.role === 0
        ? {
            studentId: student?.id ?? -1,
            ...(assessmentId ? { assessmentId: Number(assessmentId) } : {}),
          }
        : { ...(assessmentId ? { assessmentId: Number(assessmentId) } : {}) };
    const submissions = await prisma.assessmentSubmission.findMany({
      where,
      select: submissionSelect,
      orderBy: { submittedAt: "desc" },
    });
    return jsonResponse({ data: submissions });
  } catch (error) {
    console.error("[GET /api/submissions] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
