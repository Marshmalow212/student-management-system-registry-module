import { z } from "zod";
import { studentEnrollmentStatusSchema } from "@/lib/student-status";

export const programmeStatuses = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;

export function isTerminalStatus(status: string) {
  return status === "ARCHIVED";
}

export const studentCreateSchema = z.object({
  studentUid: z.string().trim().min(1).max(64),
  fullName: z.string().trim().min(1).max(255),
  email: z.string().trim().toLowerCase().email().max(255),
  dateOfBirth: z.string().date().optional().nullable(),
  academicYear: z.number().int().min(1900).max(3000).optional().nullable(),
  status: studentEnrollmentStatusSchema.default(1),
  programmeId: z.number().int().positive().optional().nullable(),
  userId: z.number().int().positive().optional().nullable(),
});

export const studentUpdateSchema = studentCreateSchema.partial();

const couponSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().trim().max(64).optional().nullable(),
);

const programmeBaseSchema = z.object({
  name: z.string().trim().min(1).max(255),
  fee: z.number().finite().nonnegative(),
  discount: z.number().finite().nonnegative().default(0),
  coupon: couponSchema,
  couponLimit: z.number().int().nonnegative().optional().nullable(),
  status: z.enum(programmeStatuses).default("ACTIVE"),
});

export const programmeCreateSchema = programmeBaseSchema.superRefine((value, context) => {
  if (value.discount > value.fee) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["discount"], message: "Discount cannot exceed the fee" });
  }
  if (value.discount > 0 && !value.coupon) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["coupon"], message: "A coupon is required when discount is positive" });
  }
  if (value.discount > 0 && (value.couponLimit == null || value.couponLimit < 1)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["couponLimit"], message: "A coupon limit of at least 1 is required when discount is positive" });
  }
});
export const programmeUpdateSchema = programmeBaseSchema.partial();

export const idSchema = z.coerce.number().int().positive();

export const studentSelect = {
  id: true,
  studentUid: true,
  fullName: true,
  email: true,
  dateOfBirth: true,
  academicYear: true,
  status: true,
  hasOverdueBalance: true,
  userId: true,
  programmeId: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
  programme: { select: { id: true, name: true, status: true } },
} as const;

export const programmeSelect = {
  id: true,
  name: true,
  fee: true,
  discount: true,
  coupon: true,
  couponLimit: true,
  couponUsed: true,
  status: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function publicProgramme(programme: Record<string, unknown>) {
  return {
    ...programme,
    fee: programme.fee?.toString(),
    discount: programme.discount?.toString(),
    couponLimit: programme.couponLimit ?? null,
    couponUsed: programme.couponUsed ?? 0,
  };
}

export function parsePage(value: string | null, fallback: number, max: number) {
  const parsed = Number(value ?? fallback);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

export function parseSort(value: string | null, allowed: readonly string[], fallback: string) {
  return value && allowed.includes(value) ? value : fallback;
}
