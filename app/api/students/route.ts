import { prisma } from "@/lib/prisma";
import { requireRegistrar } from "@/lib/auth-guards";
import { UserRole } from "@/lib/auth/roles";
import {
  errorResponse,
  jsonResponse,
  validationErrorResponse,
} from "@/lib/api-utils";
import {
  parsePage,
  parseSort,
  studentCreateSchema,
  studentSelect,
} from "@/lib/registry";
import { studentEnrollmentStatusSchema } from "@/lib/student-status";

export async function GET(request: Request): Promise<Response> {
  try {
    const { error } = await requireRegistrar();
    if (error) return error;
    const params = new URL(request.url).searchParams;
    const page = parsePage(params.get("page"), 1, 100000);
    const pageSize = parsePage(params.get("pageSize"), 20, 100);
    const search = params.get("search")?.trim();
    const status = params.get("status");
    const programmeId = params.get("programmeId");
    const parsedStatus = status === null ? null : Number(status);
    if (status && !studentEnrollmentStatusSchema.safeParse(parsedStatus).success)
      return errorResponse(
        "Invalid student status",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    if (
      programmeId &&
      (!Number.isInteger(Number(programmeId)) || Number(programmeId) <= 0)
    )
      return errorResponse(
        "Invalid programme ID",
        400,
        undefined,
        "VALIDATION_ERROR",
      );
    const sort = parseSort(
      params.get("sort"),
      [
        "studentUid",
        "fullName",
        "email",
        "academicYear",
        "createdAt",
        "updatedAt",
      ],
      "fullName",
    );
    const order = params.get("order") === "desc" ? "desc" : "asc";
    const where = {
      deletedAt: null,
      ...(status ? { status: parsedStatus as number } : {}),
      ...(programmeId ? { programmeId: Number(programmeId) } : {}),
      ...(search
        ? {
            OR: [
              {
                studentUid: { contains: search, mode: "insensitive" as const },
              },
              { fullName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.student.findMany({
        where,
        select: studentSelect,
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.student.count({ where }),
    ]);
    return jsonResponse({
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[GET /api/students] Error:", error);
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
    const { error } = await requireRegistrar();
    if (error) return error;
    const parsed = studentCreateSchema.safeParse(await request.json());
    if (!parsed.success) return validationErrorResponse(parsed.error);
    const { programmeId, userId, dateOfBirth, ...data } = parsed.data;
    if (programmeId !== undefined && programmeId !== null) {
      const programme = await prisma.programme.findFirst({
        where: { id: programmeId, status: "ACTIVE", deletedAt: null },
        select: { id: true },
      });
      if (!programme)
        return errorResponse(
          "Active programme not found",
          404,
          undefined,
          "PROGRAMME_NOT_FOUND",
        );
    }
    if (userId !== undefined && userId !== null) {
      const user = await prisma.user.findFirst({
        where: { id: userId, role: UserRole.STUDENT },
        select: { id: true },
      });
      if (!user)
        return errorResponse(
          "Student user not found",
          404,
          undefined,
          "USER_NOT_FOUND",
        );
    }
    const student = await prisma.student.create({
      data: {
        ...data,
        programmeId,
        userId,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      },
      select: studentSelect,
    });
    return jsonResponse({ data: student }, 201);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002")
      return errorResponse(
        "Student identity already exists",
        409,
        undefined,
        "STUDENT_EXISTS",
      );
    console.error("[POST /api/students] Error:", error);
    return errorResponse(
      "Internal server error",
      500,
      undefined,
      "INTERNAL_ERROR",
    );
  }
}
