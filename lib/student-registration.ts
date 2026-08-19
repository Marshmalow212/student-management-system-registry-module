import { z } from "zod";

export const studentRegistrationSchema = z
  .object({
    fullName: z.string().trim().min(1).max(255),
    // email: z.string().trim().toLowerCase().email().max(255),
    dateOfBirth: z.string().date().nullable(),
    programmeId: z.number().int().positive(),
  })
  .strict();

export function currentAcademicYear(now = new Date()): number {
  return now.getFullYear();
}

export function studentUid(lastStudentUid?: string|null, programmeId?: number|null): string {
  let studentId = '0001';
  let studentIdPrefix = String(programmeId ?? 0);
  if (lastStudentUid) {
    const lastNumber = parseInt(lastStudentUid.split("-")[2]);
    studentId = String(lastNumber + 1).padStart(3, "0");
  }
  return `SMS-${currentAcademicYear()}-${studentIdPrefix}${studentId}`;
}

export function enrollmentReference(): string {
  return `ENR-${crypto.randomUUID()}`;
}

export function getStudentEmailFromUid(studentUid: string): string {
  const parts = studentUid.split("-");
  if (parts.length !== 3) {
    throw new Error("Invalid student UID");
  }
  const emailUserName = studentUid.replaceAll("-", "_").toLowerCase();
  return `${emailUserName}@example.edu`;
}
