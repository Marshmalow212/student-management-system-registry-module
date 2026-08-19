import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import { cents, decimalString, money } from "@/lib/enrollment-fees";
import {
  currentAcademicYear,
  enrollmentReference,
  getStudentEmailFromUid,
  studentRegistrationSchema,
  studentUid,
} from "@/lib/student-registration";
import { StudentEnrollmentStatus } from "@/lib/student-status";

const registrationSelect = {
  id: true,
  studentUid: true,
  fullName: true,
  email: true,
  academicYear: true,
  programmeId: true,
  createdAt: true,
} as const;

const enrollmentSelect = {
  id: true,
  reference: true,
  enrolledYear: true,
  feeSnapshot: true,
  discountSnapshot: true,
  feeTotal: true,
  status: true,
  createdAt: true,
} as const;

function publicRegistration(
  student: Record<string, unknown>,
  enrollment: Record<string, unknown>,
) {
  return {
    student,
    enrollment: {
      ...enrollment,
      feeSnapshot: decimalString(enrollment.feeSnapshot),
      discountSnapshot: decimalString(enrollment.discountSnapshot),
      feeTotal: decimalString(enrollment.feeTotal),
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { error, user } = await requireRegistrar();
    if (error || !user)
      return error ?? errorResponse("Forbidden", 403, undefined, "FORBIDDEN");

    const parsed = studentRegistrationSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);

    const { fullName, /*email,*/ dateOfBirth, programmeId } = parsed.data;
    const academicYear = currentAcademicYear();

    const lastStudentEnrolledInProgramme = await prisma.studentEnrollment.findFirst({
      where: { programmeId, enrolledYear: academicYear },
      orderBy: { createdAt: "desc" },
      select: { student: { select: { studentUid: true } } },
    });
    const lastStudentUid = lastStudentEnrolledInProgramme?.student?.studentUid ?? null;
    const generatedStudentUid = studentUid(lastStudentUid, programmeId);
    const reference = enrollmentReference();
    const email = getStudentEmailFromUid(generatedStudentUid);


    const result = await prisma.$transaction(async (tx) => {
      const programme = await tx.programme.findFirst({
        where: { id: programmeId, status: "ACTIVE", deletedAt: null },
        select: {
          id: true,
          fee: true,
          discount: true,
          coupon: true,
          couponLimit: true,
        },
      });
      if (!programme) throw new Error("PROGRAMME_NOT_FOUND");

      const fee = cents(decimalString(programme.fee));
      const discount = cents(decimalString(programme.discount));
      if (
        fee < BigInt(0) ||
        discount < BigInt(0) ||
        discount > fee ||
        (discount > BigInt(0) &&
          (!programme.coupon ||
            programme.couponLimit === null ||
            programme.couponLimit < 1))
      ) {
        throw new Error("INVALID_PROGRAMME_DISCOUNT");
      }

      const student = await tx.student.create({
        data: {
          studentUid: generatedStudentUid,
          fullName,
          email,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          academicYear,
          programmeId,
          status: StudentEnrollmentStatus.ENROLLED,
        },
        select: registrationSelect,
      });

      if (discount > BigInt(0)) {
        const couponClaim = await tx.programme.updateMany({
          where: {
            id: programmeId,
            status: "ACTIVE",
            deletedAt: null,
            coupon: { not: null },
            couponLimit: { not: null },
            couponUsed: { lt: programme.couponLimit! },
          },
          data: { couponUsed: { increment: 1 } },
        });
        if (couponClaim.count !== 1) throw new Error("COUPON_EXHAUSTED");
      }

      const enrollment = await tx.studentEnrollment.create({
        data: {
          reference,
          studentId: student.id,
          programmeId,
          enrolledYear: academicYear,
          status: StudentEnrollmentStatus.ENROLLED,
          feeSnapshot: money(fee),
          discountSnapshot: money(discount),
          feeTotal: money(fee - discount),
          createdById: user.id,
        },
        select: enrollmentSelect,
      });
      return { student, enrollment };
    });

    return jsonResponse(
      {
        data: publicRegistration(
          result.student as unknown as Record<string, unknown>,
          result.enrollment as unknown as Record<string, unknown>,
        ),
      },
      201,
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "";
    if (message === "PROGRAMME_NOT_FOUND")
      return errorResponse(
        "Active programme not found",
        404,
        undefined,
        "PROGRAMME_NOT_FOUND",
      );
    if (message === "INVALID_PROGRAMME_DISCOUNT")
      return errorResponse(
        "Programme discount is invalid",
        409,
        undefined,
        "INVALID_PROGRAMME_DISCOUNT",
      );
    if (message === "COUPON_EXHAUSTED")
      return errorResponse(
        "Programme coupon is exhausted or unavailable",
        409,
        undefined,
        "COUPON_EXHAUSTED",
      );
    if ((error as { code?: string }).code === "P2002")
      return errorResponse(
        "Student identity already exists",
        409,
        undefined,
        "STUDENT_EXISTS",
      );
    console.error("[POST /api/student-registrations] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
