import { z } from "zod";

export const STUDENT_ENROLLMENT_STATUS = [
  { value: 0, label: "Withdrawn" },
  { value: 1, label: "Enrolled" },
  { value: 2, label: "Completed" },
  { value: 3, label: "Deferred" },
] as const;

export const STUDENT_STATUS_LABEL = {
    0 : "Withdrawn",
    1 : "Enrolled",
    2 : "Completed",
    3 : "Deferred",
}

export const StudentEnrollmentStatus = {
  WITHDRAWN: 0,
  ENROLLED: 1,
  COMPLETED: 2,
  DEFERRED: 3,
} as const;

export type StudentEnrollmentStatusValue =
  (typeof STUDENT_ENROLLMENT_STATUS)[number]["value"];

export const studentEnrollmentStatusSchema = z.number().int().min(0).max(3);

export function studentEnrollmentStatusLabel(value: number | null | undefined) {
  return (
    STUDENT_ENROLLMENT_STATUS.find((status) => status.value === value)?.label ??
    "Unknown"
  );
}

export function canCreateEnrollment(existingStatuses: number[]) {
  return existingStatuses.every(
    (status) =>
      status === StudentEnrollmentStatus.COMPLETED ||
      status === StudentEnrollmentStatus.WITHDRAWN,
  );
}

export function isAssessmentEligible(status: number | null | undefined) {
  return status === StudentEnrollmentStatus.ENROLLED;
}

export function isTerminalStudentStatus(status: number | null | undefined) {
  return (
    status === StudentEnrollmentStatus.WITHDRAWN ||
    status === StudentEnrollmentStatus.COMPLETED
  );
}
