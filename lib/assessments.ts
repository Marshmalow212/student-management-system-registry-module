import { z } from "zod";
import type { AuthenticatedUser } from "@/lib/auth-guards";
import { StudentEnrollmentStatus } from "@/lib/student-status";

export const assessmentStatus = ["DRAFT", "OPEN", "CLOSED", "RESULT"] as const;
export const assessmentStatusMap = {
  0: "DRAFT",
  1: "OPEN",
  2: "CLOSED",
  3: "RESULT",
} as const;

export function normalizeAssessmentStatus(
  value: string | number | null | undefined,
): number {
  if (value == null) return 0;

  if (typeof value === "number") {
    if (Number.isInteger(value) && value >= 0 && value <= 3) return value;
    return 0;
  }

  const normalized = value.trim().toUpperCase();
  const direct = assessmentStatusMap as Record<string, string>;
  if (direct[String(normalized)] !== undefined) {
    return Number(
      Object.keys(direct).find((key) => direct[key] === normalized) ?? 0,
    );
  }

  const lookup = Object.entries(assessmentStatusMap).find(
    ([, label]) => label === normalized,
  );
  if (lookup) return Number(lookup[0]);

  const legacyStatusMap: Record<string, number> = {
    PUBLISHED: 1,
    CLOSED: 2,
    RESULT: 3,
  };
  return legacyStatusMap[normalized] ?? 0;
}

export function assessmentStatusCode(
  value: string | number | null | undefined,
) {
  return normalizeAssessmentStatus(value);
}

const dateString = z.string().datetime({ offset: true });
const marks = z
  .string()
  .regex(
    /^\d+(\.\d{1,2})?$/,
    "Must be a non-negative number with up to two decimals",
  );

export const assessmentCreateSchema = z.object({
  title: z.string().trim().min(1).max(200),
  subjectName: z.string().trim().max(160).nullable().optional(),
  programmeId: z.number().int().positive(),
  dueDate: dateString,
  maxMarks: marks.refine(
    (value) => Number(value) > 0,
    "Must be greater than zero",
  ),
  status: z.enum(assessmentStatus).default("DRAFT").optional(),
});

export const assessmentUpdateSchema = assessmentCreateSchema
  .omit({ programmeId: true })
  .partial()
  .extend({
    status: z.enum(assessmentStatus).optional(),
  });

export const submissionSchema = z.object({
  assessment_id: z.number().int().positive(),
  student_id: z.number().int().positive(),
  programme_id: z.number().int().positive(),
  file_path: z
    .string()
    .trim()
    .regex(
      /^\/uploads\/[A-Za-z0-9._/-]+$/,
      "Must be a valid uploaded file path",
    ),
});

export const gradeSchema = z.object({
  submissionId: z.number().int().positive(),
  marks: marks,
  classification: z.string().trim().max(80).nullable().optional(),
});

export const idSchema = z.coerce.number().int().positive();

export const assessmentSelect = {
  id: true,
  title: true,
  subjectName: true,
  programmeId: true,
  createdById: true,
  dueDate: true,
  maxMarks: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  programme: { select: { id: true, name: true } },
  submissions: {
    select: {
      id: true,
      studentId: true,
      marks: true,
      resultStatus: true,
      classification: true,
      file_path: true,
      isPublished: true,
      gradedAt: true,
      publishedAt: true,
      status: true,
      submittedAt: true,
      isLate: true,
    },
  },
} as const;

export function publicAssessment(value: Record<string, unknown>) {
  return {
    ...value,
    status:
      assessmentStatusMap[
        normalizeAssessmentStatus(
          value.status as string | number | null | undefined,
        ) as 0 | 1 | 2 | 3
      ],
    maxMarks: String(value.maxMarks),
  };
}

export async function currentStudent(user: AuthenticatedUser) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.student.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { userId: user.id },
        ...(user.studentId ? [{ studentUid: user.studentId }] : []),
      ],
    },
    select: {
      id: true,
      programmeId: true,
      status: true,
      hasOverdueBalance: true,
      enrollments: {
        where: { status: StudentEnrollmentStatus.ENROLLED },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { programmeId: true },
      },
    },
  });
}

export function canManageAssessment(
  user: AuthenticatedUser,
  createdById: number,
) {
  return user.role >= 2 || user.id === createdById;
}
