import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";
import { errorResponse, jsonResponse } from "@/lib/api-utils";
import { idSchema, publicPayment } from "@/lib/enrollment-fees";

const paymentSelect = {
  id: true,
  reference: true,
  idempotencyKey: true,
  enrollmentId: true,
  amount: true,
  currency: true,
  paymentDate: true,
  receivedById: true,
  createdAt: true,
  enrollment: {
    select: {
      id: true,
      reference: true,
      feeTotal: true,
      studentId: true,
      programmeId: true,
      student: {
        select: {
          id: true,
          studentUid: true,
          fullName: true,
          email: true,
        },
      },
      programme: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  receivedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { error } = await requireRegistrar();
    if (error) return error;

    const parsedId = idSchema.safeParse((await context.params).id);
    if (!parsedId.success) {
      return errorResponse(
        "Invalid payment ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    }

    const payment = await prisma.paymentTransaction.findUnique({
      where: { id: parsedId.data },
      select: paymentSelect,
    });
    console.log("Fetched payment:", payment);
    if (!payment) {
      return errorResponse(
        "Payment not found",
        404,
        undefined,
        "PAYMENT_NOT_FOUND",
      );
    }

    return jsonResponse({
      data: publicPayment(payment as unknown as Record<string, unknown>),
    });
  } catch (error) {
    console.error("[GET /api/payments/:id] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
