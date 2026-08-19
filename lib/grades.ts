import { z } from "zod";

export const reportQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  programmeId: z.coerce.number().int().positive().optional(),
  studentId: z.coerce.number().int().positive().optional(),
});

export type GradeClassification = "A" | "B" | "C" | "D" | "F";

function decimal(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error("Invalid decimal value");
  return parsed;
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateGrade(marks: unknown, maxMarks: unknown): {
  percentage: string;
  classification: GradeClassification;
} {
  const score = decimal(marks);
  const maximum = decimal(maxMarks);
  if (maximum <= 0 || score < 0 || score > maximum) throw new Error("Marks are outside the assessment range");
  const percentage = round((score / maximum) * 100);
  const classification = percentage >= 80 ? "A" : percentage >= 70 ? "B" : percentage >= 60 ? "C" : percentage >= 50 ? "D" : "F";
  return { percentage: percentage.toFixed(2), classification };
}

export function publicGrade(result: Record<string, unknown>) {
  const grade = calculateGrade(result.marks, result.maxMarks);
  return {
    id: result.id,
    assessmentId: result.assessmentId,
    assessmentTitle: result.assessmentTitle,
    subjectName: result.subjectName,
    studentId: result.studentId,
    studentUid: result.studentUid,
    studentName: result.studentName,
    programmeId: result.programmeId,
    programmeName: result.programmeName,
    marks: String(result.marks),
    maxMarks: String(result.maxMarks),
    percentage: grade.percentage,
    classification: grade.classification,
    isPublished: result.isPublished,
    gradedAt: result.gradedAt,
    publishedAt: result.publishedAt,
  };
}