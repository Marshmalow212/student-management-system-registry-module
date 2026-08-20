import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";
import { errorResponse, jsonResponse } from "@/lib/api-utils";

export async function GET(): Promise<Response> {
  try {
    const { user, error } = await requireRegistrar();
    if (error || !user) {
      return error ?? errorResponse("Unauthorized", 401, undefined, "UNAUTHORIZED");
    }

    const studentScope = { deletedAt: null };
    const [totalStudentCount, enrolledStudentCount, completedStudentCount, deferredStudentCount, withdrawnStudentCount, overduePaymentStudentCount] =
      await Promise.all([
        prisma.student.count({ where: studentScope }),
        prisma.student.count({ where: { ...studentScope, status: 1 } }),
        prisma.student.count({ where: { ...studentScope, status: 2 } }),
        prisma.student.count({ where: { ...studentScope, status: 3 } }),
        prisma.student.count({ where: { ...studentScope, status: 0 } }),
        prisma.student.count({
          where: { ...studentScope, hasOverdueBalance: true },
        }),
      ]);

    return jsonResponse({
      data: {
        totalStudentCount,
        enrolledStudentCount,
        completedStudentCount,
        deferredStudentCount,
        withdrawnStudentCount,
        overduePaymentStudentCount,
      },
    });
  } catch (reason) {
    console.error("[GET /api/dashboard/registrar] Error:", reason);
    return errorResponse("Internal server error", 500, undefined, "INTERNAL_ERROR");
  }
}
