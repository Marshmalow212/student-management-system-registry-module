import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth-guards";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

export async function GET(): Promise<Response> {
  try {
    const { user, error } = await requireStaff();
    if (error || !user) {
      return error ?? errorResponse("Unauthorized", 401, undefined, "UNAUTHORIZED");
    }

    const assessmentScope = { createdById: user.id };
    const [assessmentCount, submissionCount, publishedAssessmentCount, pendingResultAssessmentCount] =
      await Promise.all([
        prisma.assessment.count({ where: assessmentScope }),
        prisma.assessmentSubmission.count({
          where: { assessment: assessmentScope },
        }),
        prisma.assessment.count({
          where: { ...assessmentScope, status: 3 },
        }),
        prisma.assessment.count({
          where: { ...assessmentScope, status: 2 },
        }),
      ]);

    return jsonResponse({
      data: {
        assessmentCount,
        submissionCount,
        publishedAssessmentCount,
        pendingResultAssessmentCount,
      },
    });
  } catch (reason) {
    console.error("[GET /api/dashboard/staff] Error:", reason);
    return errorResponse("Internal server error", 500, undefined, "INTERNAL_ERROR");
  }
}
