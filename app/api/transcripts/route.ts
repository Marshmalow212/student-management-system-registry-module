import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import { currentStudent } from "@/lib/assessments";
import { publicGrade, reportQuerySchema } from "@/lib/grades";

const transcriptSelect = {
  id: true,
  assessmentId: true,
  studentId: true,
  marks: true,
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
  student: {
    select: {
      studentUid: true,
      fullName: true,
      hasOverdueBalance: true,
    },
  },
} as const;

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
    const requestedStudent = parsed.data.studentId;
    const student = user.role === 0 ? await currentStudent(user) : null;
    if (user.role === 0 && !student)
      return errorResponse(
        "Student profile not found",
        404,
        undefined,
        "STUDENT_NOT_FOUND",
      );
    if (user.role === 0 && requestedStudent && requestedStudent !== student?.id)
      return errorResponse("Forbidden", 403, undefined, "FORBIDDEN");
    const studentId = user.role === 0 ? (student?.id ?? -1) : requestedStudent;
    if (!studentId)
      return errorResponse(
        "studentId is required for staff transcript requests",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const where = { studentId, isPublished: true };
    const [results, publishedAssessments, enrollment] = await Promise.all([
      prisma.assessmentSubmission.findMany({
        where: { ...where, resultStatus: 3 },
        select: transcriptSelect,
        orderBy: [{ gradedAt: "asc" }, { id: "asc" }],
      }),
      prisma.assessment.count({
        where: {
          programme: { students: { some: { id: studentId } } },
          status: 3,
        },
      }),
      prisma.student.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          studentUid: true,
          fullName: true,
          hasOverdueBalance: true,
          programme: { select: { id: true, name: true } },
        },
      }),
    ]);
    if (!enrollment)
      return errorResponse(
        "Student not found",
        404,
        undefined,
        "STUDENT_NOT_FOUND",
      );
    const items = results.map((result) =>
      publicGrade({
        ...result,
        assessmentTitle: result.assessment.title,
        subjectName: result.assessment.subjectName,
        maxMarks: result.assessment.maxMarks,
        programmeId: result.assessment.programmeId,
        programmeName: result.assessment.programme.name,
        studentUid: result.student.studentUid,
        studentName: result.student.fullName,
        hasOverdueBalance: result.student.hasOverdueBalance,
      } as unknown as Record<string, unknown>),
    );
    const totalMarks = results.reduce(
      (sum, result) => sum + Number(result.marks),
      0,
    );
    const totalMaxMarks = results.reduce(
      (sum, result) => sum + Number(result.assessment.maxMarks),
      0,
    );
    return jsonResponse({
      data: {
        student: enrollment,
        status:
          results.length === 0
            ? "NO_RESULTS"
            : results.length < publishedAssessments
              ? "INCOMPLETE"
              : "COMPLETE",
        summary: {
          resultCount: results.length,
          publishedAssessmentCount: publishedAssessments,
          totalMarks: totalMarks.toFixed(2),
          totalMaxMarks: totalMaxMarks.toFixed(2),
          percentage: totalMaxMarks
            ? ((totalMarks / totalMaxMarks) * 100).toFixed(2)
            : "0.00",
        },
        results: items,
      },
    });
  } catch (error) {
    console.error("[GET /api/transcripts] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
