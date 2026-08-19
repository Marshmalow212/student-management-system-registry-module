import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";
import { errorResponse, jsonResponse } from "@/lib/api-utils";
import { balancePayload, idSchema, decimalString } from "@/lib/enrollment-fees";

export async function GET(
  _request: Request,
  context: { params: Promise<{ enrollmentId: string }> },
): Promise<Response> {
  try {
    const { error } = await requireRegistrar();
    if (error) return error;
    const parsedId = idSchema.safeParse((await context.params).enrollmentId);
    if (!parsedId.success)
      return errorResponse(
        "Invalid enrolment ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const enrollment = await prisma.studentEnrollment.findUnique({
      where: { id: parsedId.data },
      select: { id: true, feeTotal: true, dueDate: true },
    });
    if (!enrollment)
      return errorResponse(
        "Enrolment not found",
        404,
        undefined,
        "ENROLLMENT_NOT_FOUND",
      );
    const aggregate = await prisma.paymentTransaction.aggregate({
      where: { enrollmentId: enrollment.id },
      _sum: { amount: true },
    });
    return jsonResponse({
      data: {
        enrollmentId: enrollment.id,
        ...balancePayload(
          enrollment.feeTotal,
          aggregate._sum.amount,
          enrollment.dueDate,
        ),
        paid: decimalString(aggregate._sum.amount),
      },
    });
  } catch (error) {
    console.error("[GET /api/fees/:enrollmentId] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
