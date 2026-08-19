import { prisma } from "@/lib/prisma";
import { requireAssessmentStaff, requireAuth } from "@/lib/auth-guards";
import { LogEvent } from "@/lib/auth/log-events";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import { currentStudent, gradeSchema } from "@/lib/assessments";
import { publicGrade, reportQuerySchema } from "@/lib/grades";
import { isAssessmentEligible } from "@/lib/student-status";

function RESULT_CLASSIFICATION(score: number): string {
  switch (true) {
    case score >= 70:
      return "Distinction";

    case score >= 60:
      return "Merit";

    case score >= 40:
      return "Pass";

    default:
      return "Fail";
  }
}

const submissionResultSelect = {
  id: true,
  assessmentId: true,
  studentId: true,
  marks: true,
  classification: true,
  resultStatus: true,
  isPublished: true,
  gradedAt: true,
  publishedAt: true,
  assessment: {
    select: {
      title: true,
      subjectName: true,
      maxMarks: true,
      programmeId: true,
      programme: { select: { name: true } },
    },
  },
  student: { select: { studentUid: true, fullName: true } },
} as const;
function publicResult(value: Record<string, unknown>) {
  const result = value as Record<string, unknown> & {
    assessment: {
      title: string;
      subjectName: string | null;
      maxMarks: unknown;
      programmeId: number;
      programme: { name: string };
    };
    student: { studentUid: string; fullName: string };
  };
  return publicGrade({
    ...result,
    assessmentTitle: result.assessment.title,
    subjectName: result.assessment.subjectName,
    maxMarks: result.assessment.maxMarks,
    programmeId: result.assessment.programmeId,
    programmeName: result.assessment.programme.name,
    studentUid: result.student.studentUid,
    studentName: result.student.fullName,
  });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { error, user } = await requireAuth();
    if (error || !user)
      return (
        error ?? errorResponse("Unauthorized", 401, undefined, "UNAUTHORIZED")
      );
    const parsed = reportQuerySchema.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const student = await currentStudent(user);
    if (user.role === 0 && !student)
      return errorResponse(
        "Student profile not found",
        404,
        undefined,
        "STUDENT_NOT_FOUND",
      );
    const where =
      user.role === 0
        ? {
            studentId: isAssessmentEligible(student?.status)
              ? student?.id ?? -1
              : -1,
            resultStatus: 3,
            isPublished: true,
          }
        : {
            resultStatus: 3,
            isPublished: true,
            ...(parsed.data.programmeId
              ? { assessment: { programmeId: parsed.data.programmeId } }
              : {}),
            ...(parsed.data.studentId
              ? { studentId: parsed.data.studentId }
              : {}),
          };
    const [results, total] = await Promise.all([
      prisma.assessmentSubmission.findMany({
        where,
        select: submissionResultSelect,
        orderBy: [{ gradedAt: "desc" }, { id: "desc" }],
        skip: (parsed.data.page - 1) * parsed.data.pageSize,
        take: parsed.data.pageSize,
      }),
      prisma.assessmentSubmission.count({ where }),
    ]);
    return jsonResponse({
      data: results.map((result) =>
        publicGrade({
          ...result,
          assessmentTitle: result.assessment.title,
          subjectName: result.assessment.subjectName,
          maxMarks: result.assessment.maxMarks,
          programmeId: result.assessment.programmeId,
          programmeName: result.assessment.programme.name,
          studentUid: result.student.studentUid,
          studentName: result.student.fullName,
        } as unknown as Record<string, unknown>),
      ),
      pagination: {
        page: parsed.data.page,
        pageSize: parsed.data.pageSize,
        total,
        totalPages: Math.ceil(total / parsed.data.pageSize),
      },
    });
  } catch (error) {
    console.error("[GET /api/results] Error:", error);
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
    const parsed = gradeSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const submission = await prisma.assessmentSubmission.findUnique({
      where: { id: parsed.data.submissionId },
      select: {
        id: true,
        studentId: true,
        assessmentId: true,
        marks: true,
        assessment: { select: { maxMarks: true, status:true } },
      },
    });
    if (!submission)
      return errorResponse(
        "Submission not found",
        404,
        undefined,
        "SUBMISSION_NOT_FOUND",
      );
    if (Number(parsed.data.marks) > Number(submission.assessment.maxMarks))
      return errorResponse(
        "Marks exceed maximum",
        409,
        undefined,
        "MARKS_EXCEED_MAX",
      );
    if (submission.marks != null && submission?.assessment?.status === 3)
      return errorResponse("A result already exists", 409, undefined, "RESULT_EXISTS");
    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.assessmentSubmission.update({
        where: { id: submission.id },
        data: {
          marks: parsed.data.marks,
          classification: RESULT_CLASSIFICATION(Number(parsed.data.marks)),
          resultStatus: 1,
          status: 2,
          gradedById: user.id,
          gradedAt: new Date(),
        },
        select: submissionResultSelect,
      });
      await tx.userLog.create({
        data: {
          userId: user.id,
          eventType: LogEvent.RESULT_GRADED,
          metadata: { submissionId: submission.id },
        },
      });
      return created;
    });
    return jsonResponse(
      { data: publicResult(result as unknown as Record<string, unknown>) },
      201,
    );
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002")
      return errorResponse(
        "A result already exists",
        409,
        undefined,
        "RESULT_EXISTS",
      );
    console.error("[POST /api/results] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
