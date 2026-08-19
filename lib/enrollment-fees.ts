import { z } from "zod";
import { studentEnrollmentStatusSchema } from "@/lib/student-status";

export const enrollmentStatusSchema = studentEnrollmentStatusSchema;
export const moneySchema = z.union([z.string(), z.number()]).transform((value, context) => {
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Must be a non-negative amount with at most two decimals" });
    return z.NEVER;
  }
  return text;
});

export const enrollmentCreateSchema = z.object({
  reference: z.string().trim().min(1).max(64),
  studentId: z.number().int().positive(),
  programmeId: z.number().int().positive(),
  enrolledYear: z.number().int().min(1900).max(3000),
  dueDate: z.string().date().optional().nullable(),
});

export const enrollmentUpdateSchema = z.object({ 
  status: enrollmentStatusSchema.optional(),
  remaining_amount: moneySchema.optional(), 
  dueDate: z.string().date().optional().nullable(),
});

export const paymentCreateSchema = z.object({
  reference: z.string().trim().min(1).max(64),
  idempotencyKey: z.string().trim().min(1).max(128),
  enrollmentId: z.number().int().positive(),
  amount: moneySchema,
  currency: z.string().trim().toUpperCase().length(3).default("USD"),
  paymentDate: z.string().datetime({ offset: true }).optional(),
}).superRefine((value, context) => {
  if (typeof value.amount === "string" && cents(value.amount) === BigInt(0)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["amount"], message: "Must be greater than zero" });
  }
});

export const idSchema = z.coerce.number().int().positive();

export function cents(value: string | number): bigint {
  const normalized = String(value);
  const [whole, fraction = ""] = normalized.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}

export function money(value: bigint): string {
  return `${value / BigInt(100)}.${(value % BigInt(100)).toString().padStart(2, "0")}`;
}

export function decimalString(value: unknown): string {
  return value == null ? "0.00" : String(value);
}

export function publicPayment(payment: Record<string, unknown>) {
  return { ...payment, amount: decimalString(payment.amount) };
}

export function balancePayload(feeTotal: unknown, paid: unknown, dueDate: Date | null, now = new Date()) {
  const fee = cents(decimalString(feeTotal));
  const paidCents = cents(decimalString(paid));
  const balance = fee - paidCents;
  return {
    feeTotal: money(fee),
    paid: money(paidCents),
    balance: money(balance),
    overdue: balance > BigInt(0) && dueDate !== null && dueDate < now,
  };
}
